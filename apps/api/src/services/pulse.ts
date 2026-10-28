// "Has anything changed?" for live screens. Each pulse is the latest change time across what that
// person can see; the merchant dashboard, admin and the app ask every few seconds and reload only when
// it moves. One cheap query each, so polling stays light.
import { sql, type SQL } from "drizzle-orm";
import { db } from "../db/client";

async function latest(query: SQL) {
  const result = await db.execute(query);
  const v = (result.rows[0] as { v: string | Date | null } | undefined)?.v;
  return v ? new Date(v).toISOString() : "0";
}

/** A store's orders, offers, payouts, areas, reviews and its own record */
export const storePulse = (storeId: string) =>
  latest(sql`select greatest(
    (select max(updated_at) from orders where merchant_id = ${storeId}),
    (select max(updated_at) from offers where merchant_id = ${storeId}),
    (select max(updated_at) from merchant_payouts where merchant_id = ${storeId}),
    (select max(updated_at) from delivery_zones where merchant_id = ${storeId}),
    (select max(updated_at) from merchants where id = ${storeId}),
    (select max(r.created_at) from product_reviews r join products p on p.id = r.product_id where p.merchant_id = ${storeId})
  ) as v`);

/** Everything admins watch */
export const adminPulse = () =>
  latest(sql`select greatest(
    (select max(updated_at) from orders),
    (select max(updated_at) from offers),
    (select max(updated_at) from merchant_payouts),
    (select max(updated_at) from merchants),
    (select max(updated_at) from delivery_zones),
    (select max(last_message_at) from support_tickets),
    (select max(created_at) from product_reviews),
    (select max(created_at) from users)
  ) as v`);

/** A customer's orders, offers, live chat and tokens */
export const customerPulse = (userId: string) =>
  latest(sql`select greatest(
    (select max(updated_at) from orders where customer_id = ${userId}),
    (select max(updated_at) from offers where customer_id = ${userId}),
    (select max(m.created_at) from support_messages m join support_tickets t on t.id = m.ticket_id where t.customer_id = ${userId}),
    (select max(created_at) from token_entries where to_user_id = ${userId} or from_user_id = ${userId}),
    (select max(created_at) from notifications where user_id = ${userId})
  ) as v`);
