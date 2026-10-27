// Tells customers when their order moves on: a push to their phones and an email.
// Called after the status change has been saved, never from inside its transaction.
import { eq } from "drizzle-orm";
import type { OrderStatus } from "@sotechy/shared";
import { db, schema } from "../db/client";
import { publicApiUrl } from "../env";
import { sendEmailLater } from "../lib/email";
import { orderUpdateEmail, type OrderEmailData } from "../emails/templates";
import { sendPushLater } from "./push";

const PUSH: Partial<Record<OrderStatus, (n: string, pickup: boolean) => { title: string; body: string }>> = {
  paid: (n) => ({ title: "Payment received", body: `We've got your payment for ${n}. We'll let you know when it's on its way.` }),
  processing: (n) => ({ title: "Order being packed", body: `${n} is being packed.` }),
  ready_for_pickup: (n) => ({ title: "Ready for pickup", body: `${n} is ready. Bring your order number when you come.` }),
  dispatched: (n) => ({ title: "On its way", body: `${n} has left the store and is on its way to you.` }),
  delivered: (n, pickup) => ({ title: pickup ? "Picked up" : "Delivered", body: `${n} is complete. Thanks for shopping with Sotechy.` }),
  cancelled: (n) => ({ title: "Order cancelled", body: `${n} was cancelled. If you paid, your refund is being processed.` }),
  refunded: (n) => ({ title: "Refund sent", body: `The refund for ${n} has been sent.` }),
};

const absolute = (url: string | null | undefined) => (!url ? null : url.startsWith("/") ? `${publicApiUrl}${url}` : url);

async function orderForEmail(orderId: string) {
  const [row] = await db
    .select({ order: schema.orders, email: schema.users.email, name: schema.users.fullName, branch: schema.branches, merchant: schema.merchants.name })
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
    store: row.merchant ?? "Sotechy",
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
  return { customerId: o.customerId, email: row.email, name: row.name, data };
}

export async function notifyOrderStatus(orderId: string, status: OrderStatus) {
  const push = PUSH[status];
  if (!push) return;
  try {
    const found = await orderForEmail(orderId);
    if (!found?.customerId) return; // walk-in sale without an account
    const { title, body } = push(found.data.number, found.data.fulfilment === "pickup");
    sendPushLater([found.customerId], { title, body, data: { url: `/order/${orderId}` } });
    const email = found.email ? orderUpdateEmail(found.email, status, { name: found.name, order: found.data }) : null;
    if (email) sendEmailLater(email);
  } catch (err) {
    console.error("Order notice failed:", err instanceof Error ? err.message : err);
  }
}
