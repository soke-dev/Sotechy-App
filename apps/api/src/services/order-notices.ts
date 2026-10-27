// Tells customers when their order moves on: a push to their phones and an email.
// Called after the status change has been saved, never from inside its transaction.
import { eq } from "drizzle-orm";
import type { OrderStatus } from "@sotechy/shared";
import { db, schema } from "../db/client";
import { layout, sendEmailLater } from "../lib/email";
import { sendPushLater } from "./push";

const NOTICES: Partial<Record<OrderStatus, (n: string, pickup: boolean) => { title: string; body: string }>> = {
  paid: (n) => ({ title: "Payment received", body: `We've got your payment for ${n}. We'll let you know when it's on its way.` }),
  processing: (n) => ({ title: "Order being prepared", body: `${n} is being packed.` }),
  ready_for_pickup: (n) => ({ title: "Ready for pickup", body: `${n} is ready. Bring your order number when you come.` }),
  dispatched: (n) => ({ title: "On its way", body: `${n} has left the store and is on its way to you.` }),
  delivered: (n, pickup) => ({ title: pickup ? "Picked up" : "Delivered", body: `${n} is complete. Thanks for shopping with Sotechy.` }),
  cancelled: (n) => ({ title: "Order cancelled", body: `${n} was cancelled. If you paid, your refund is being processed.` }),
  refunded: (n) => ({ title: "Refund sent", body: `The refund for ${n} has been sent.` }),
};

export async function notifyOrderStatus(orderId: string, status: OrderStatus) {
  const notice = NOTICES[status];
  if (!notice) return;
  try {
    const [row] = await db
      .select({ number: schema.orders.orderNumber, customerId: schema.orders.customerId, fulfilment: schema.orders.fulfilmentType, email: schema.users.email, name: schema.users.fullName })
      .from(schema.orders)
      .leftJoin(schema.users, eq(schema.users.id, schema.orders.customerId))
      .where(eq(schema.orders.id, orderId));
    if (!row?.customerId) return; // walk-in sale without an account
    const { title, body } = notice(row.number, row.fulfilment === "pickup");
    sendPushLater([row.customerId], { title, body, data: { url: `/order/${orderId}` } });
    if (row.email) {
      sendEmailLater({
        to: row.email,
        subject: `${title}: ${row.number}`,
        text: body,
        html: layout({ heading: title, paragraphs: [`Hi ${row.name?.split(" ")[0] ?? "there"},`, body, "You can follow your order in the Sotechy app."] }),
      });
    }
  } catch (err) {
    console.error("Order notice failed:", err instanceof Error ? err.message : err);
  }
}
