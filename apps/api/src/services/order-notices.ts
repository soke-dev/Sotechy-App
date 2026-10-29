// Tells customers when their order moves on: a push to their phones and an email.
// Called after the status change has been saved, never from inside its transaction.
import { eq } from "drizzle-orm";
import type { OrderStatus } from "@sotechy/shared";
import { db, schema } from "../db/client";
import { publicApiUrl } from "../env";
import { sendEmailLater } from "../lib/email";
import { newOrderEmail, orderUpdateEmail, type OrderEmailData } from "../emails/templates";
import { sendPushLater } from "./push";

const PUSH: Partial<Record<OrderStatus, (n: string, pickup: boolean) => { title: string; body: string }>> = {
  paid: (n) => ({ title: "Payment received", body: `We've got your payment for ${n}. We'll let you know when it's on its way.` }),
  processing: (n) => ({ title: "Order being packed", body: `${n} is being packed.` }),
  ready_for_pickup: (n) => ({ title: "Available for pickup", body: `${n} is waiting at the pickup location. Tap "I've picked it up" once you have it.` }),
  dispatched: (n) => ({ title: "On its way", body: `${n} has left the store and is on its way to you.` }),
  delivered: (n, pickup) => ({ title: pickup ? "Picked up" : "Delivered", body: `${n} is complete. Thanks for shopping with Sotechy.` }),
  cancelled: (n) => ({ title: "Order cancelled", body: `${n} was cancelled. If you paid, your refund is being processed.` }),
  refunded: (n) => ({ title: "Refund sent", body: `The refund for ${n} has been sent.` }),
};

const absolute = (url: string | null | undefined) => (!url ? null : url.startsWith("/") ? `${publicApiUrl}${url}` : url);

async function orderForEmail(orderId: string) {
  const [row] = await db
    .select({
      order: schema.orders,
      email: schema.users.email,
      name: schema.users.fullName,
      username: schema.users.username,
      branch: schema.branches,
      merchant: schema.merchants,
    })
    .from(schema.orders)
    .leftJoin(schema.users, eq(schema.users.id, schema.orders.customerId))
    .leftJoin(schema.branches, eq(schema.branches.id, schema.orders.branchId))
    .leftJoin(schema.merchants, eq(schema.merchants.id, schema.orders.merchantId))
    .where(eq(schema.orders.id, orderId));
  if (!row) return null;
  const items = await db
    .select({ item: schema.orderItems, images: schema.products.images })
    .from(schema.orderItems)
    .leftJoin(schema.productVariants, eq(schema.productVariants.id, schema.orderItems.variantId))
    .leftJoin(schema.products, eq(schema.products.id, schema.productVariants.productId))
    .where(eq(schema.orderItems.orderId, orderId));
  const o = row.order;
  const a = o.deliveryAddress;
  const data: OrderEmailData = {
    id: o.id,
    number: o.orderNumber,
    store: row.merchant?.name ?? "Sotechy",
    fulfilment: o.fulfilmentType,
    items: items.map(({ item, images }) => ({
      name: item.productName,
      detail: item.variantName && item.variantName !== "Default" ? item.variantName : undefined,
      quantity: item.quantity,
      amount: item.lineTotal,
      image: absolute(images?.[0]),
    })),
    subtotal: o.subtotal,
    discount: o.discountTotal,
    deliveryFee: o.deliveryFee,
    total: o.total,
    address: a ? [a.line1, a.line2, a.city, a.state].filter(Boolean).join(", ") : null,
    pickup: row.branch ? { place: `${row.branch.name}, ${row.branch.address}, ${row.branch.city}`, hours: row.branch.openingHours } : null,
  };
  const customer = [row.name, row.username && `(@${row.username})`].filter(Boolean).join(" ") || "a customer";
  return { customerId: o.customerId, email: row.email, name: row.name, customer, merchant: row.merchant, data };
}

export async function notifyOrderStatus(orderId: string, status: OrderStatus) {
  const push = PUSH[status];
  if (!push) return;
  try {
    const found = await orderForEmail(orderId);
    if (!found) return;
    // A paid order for a marketplace store: its owner must accept it within 24 hours
    if (status === "paid" && found.merchant) notifyMerchantOfOrder(found.merchant, found.customer, found.data);
    if (!found.customerId) return; // walk-in sale without an account
    const { title, body } = push(found.data.number, found.data.fulfilment === "pickup");
    sendPushLater([found.customerId], { kind: "order", title, body, data: { url: `/order/${orderId}` } });
    // Cancelled orders get the push only, no email
    const email = found.email && status !== "cancelled" ? orderUpdateEmail(found.email, status, { name: found.name, order: found.data }) : null;
    if (email) sendEmailLater(email);
  } catch (err) {
    console.error("Order notice failed:", err instanceof Error ? err.message : err);
  }
}

const RESPOND_HOURS = 24;

function notifyMerchantOfOrder(store: typeof schema.merchants.$inferSelect, customer: string, order: OrderEmailData) {
  // No tap-through link: merchants handle orders in the web dashboard, not the shopping app
  if (store.ownerId) {
    sendPushLater([store.ownerId], { audience: "store", kind: "order", title: `New order ${order.number}`, body: `${customer} ordered from ${store.name}. Accept it within ${RESPOND_HOURS} hours.` });
  }
  if (store.contactEmail) {
    sendEmailLater(newOrderEmail(store.contactEmail, { store: store.name, order, customer, respondBy: new Date(Date.now() + RESPOND_HOURS * 3_600_000) }));
  }
}
