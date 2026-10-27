// Store orders Sotechy has to step into, worked out from the orders themselves:
// paid but not accepted within 24 hours, sent but not delivered within 7 days, and paybacks stores owe.
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db, schema } from "../db/client";

export type CaseKind = "pickup_change" | "not_received" | "not_accepted" | "not_confirmed" | "payback";
export interface OrderCase {
  id: string;
  kind: CaseKind;
  orderId: string;
  order: string;
  merchant: string;
  customer: string;
  total: number;
  openedAt: string;
  detail: string;
  money: string;
  /** The payback to settle, for payback cases */
  payoutId?: string;
}

const HOUR = 3_600_000;
const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

export async function orderCases(): Promise<OrderCase[]> {
  const o = schema.orders;
  // When the order reached its current status
  const since = sql<Date>`(select max(h.created_at) from order_status_history h where h.order_id = ${o.id} and h.to_status = ${o.status})`;
  const late = await db
    .select({ id: o.id, number: o.orderNumber, status: o.status, total: o.total, since, store: schema.merchants.name, customer: schema.users.fullName })
    .from(o)
    .innerJoin(schema.merchants, eq(schema.merchants.id, o.merchantId))
    .leftJoin(schema.users, eq(schema.users.id, o.customerId))
    .where(and(isNotNull(o.merchantId), inArray(o.status, ["paid", "dispatched", "ready_for_pickup"])));

  const now = Date.now();
  const cases: OrderCase[] = [];
  for (const r of late) {
    const at = new Date(r.since ?? 0).getTime();
    if (r.status === "paid" && now - at > 24 * HOUR) {
      cases.push({
        id: `na-${r.id}`,
        kind: "not_accepted",
        orderId: r.id,
        order: r.number,
        merchant: r.store,
        customer: r.customer ?? "Customer",
        total: r.total,
        openedAt: new Date(at + 24 * HOUR).toISOString(),
        detail: `${r.store} hasn't accepted this paid order in 24 hours.`,
        money: "Nothing has been paid to the store. Cancelling refunds the customer in full.",
      });
    } else if (r.status !== "paid" && now - at > 7 * 24 * HOUR) {
      cases.push({
        id: `nc-${r.id}`,
        kind: "not_confirmed",
        orderId: r.id,
        order: r.number,
        merchant: r.store,
        customer: r.customer ?? "Customer",
        total: r.total,
        openedAt: new Date(at + 7 * 24 * HOUR).toISOString(),
        detail: `${r.status === "dispatched" ? "Sent" : "Ready for pickup"} over a week ago and still not marked delivered. Check with the customer.`,
        money: "The store's first payment may be out; the final payment waits until it's delivered.",
      });
    }
  }

  const moves = await db
    .select({ id: o.id, number: o.orderNumber, total: o.total, at: o.pickupChangeAt, point: o.pickupChangePoint, zone: schema.deliveryZones.pickupPoint, store: schema.merchants.name, customer: schema.users.fullName })
    .from(o)
    .leftJoin(schema.merchants, eq(schema.merchants.id, o.merchantId))
    .leftJoin(schema.users, eq(schema.users.id, o.customerId))
    .leftJoin(schema.deliveryZones, eq(schema.deliveryZones.id, o.deliveryZoneId))
    .where(eq(o.pickupChangeStatus, "pending"));
  for (const r of moves) {
    cases.push({
      id: `pc-${r.id}`,
      kind: "pickup_change",
      orderId: r.id,
      order: r.number,
      merchant: r.store ?? "Store",
      customer: r.customer ?? "Customer",
      total: r.total,
      openedAt: (r.at ?? new Date()).toISOString(),
      detail: `${r.store ?? "The store"} wants the customer to collect at "${r.point}" instead of ${r.zone ? `"${r.zone}"` : "its approved pickup location"}.`,
      money: "Nothing changes for the money. The order waits until you answer; if you approve, the customer is told the new place.",
    });
  }

  const missing = await db
    .select({ id: o.id, number: o.orderNumber, total: o.total, at: o.customerIssueAt, note: o.customerIssueNote, store: schema.merchants.name, customer: schema.users.fullName })
    .from(o)
    .leftJoin(schema.merchants, eq(schema.merchants.id, o.merchantId))
    .leftJoin(schema.users, eq(schema.users.id, o.customerId))
    .where(and(isNotNull(o.customerIssueAt), sql`${o.customerConfirmedAt} is null`, eq(o.status, "delivered")));
  for (const r of missing) {
    cases.push({
      id: `nr-${r.id}`,
      kind: "not_received",
      orderId: r.id,
      order: r.number,
      merchant: r.store ?? "Sotechy",
      customer: r.customer ?? "Customer",
      total: r.total,
      openedAt: (r.at ?? new Date()).toISOString(),
      detail: `Marked delivered, but the customer says they didn't get it.${r.note ? ` They said: "${r.note}"` : ""} Call both sides.`,
      money: "The store's final payment is on hold. Once the customer has it, mark it received and the payment is due.",
    });
  }

  const owed = await db
    .select({ id: schema.merchantPayouts.id, amount: schema.merchantPayouts.amount, createdAt: schema.merchantPayouts.createdAt, orderId: o.id, number: o.orderNumber, total: o.total, store: schema.merchants.name, customer: schema.users.fullName })
    .from(schema.merchantPayouts)
    .innerJoin(o, eq(o.id, schema.merchantPayouts.orderId))
    .innerJoin(schema.merchants, eq(schema.merchants.id, schema.merchantPayouts.merchantId))
    .leftJoin(schema.users, eq(schema.users.id, o.customerId))
    .where(eq(schema.merchantPayouts.status, "owed"));
  for (const p of owed) {
    cases.push({
      id: `pb-${p.id}`,
      kind: "payback",
      orderId: p.orderId,
      order: p.number,
      merchant: p.store,
      customer: p.customer ?? "Customer",
      total: p.total,
      openedAt: p.createdAt.toISOString(),
      detail: `The order was cancelled after ${p.store} was paid. They owe it back.`,
      money: `${p.store} owes ${naira(p.amount)}. Mark it repaid once you've collected it.`,
      payoutId: p.id,
    });
  }
  return cases.sort((a, b) => a.openedAt.localeCompare(b.openedAt));
}
