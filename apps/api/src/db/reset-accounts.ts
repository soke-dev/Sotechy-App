// Starts the marketplace again: deletes every customer and store account and everything they made
// (stores, products, orders, payouts, tokens, receipts, uploads), and keeps the admin and staff logins,
// Sotechy's own catalogue, banners and settings, and the audit log.
//
// What's already on chain stays there as history. Token and receipt numbers carry on from where they
// were, so new stores and receipts never collide with what's on Monad and Base.
//
//   node dist/db/reset-accounts.js          shows what would be deleted
//   node dist/db/reset-accounts.js --yes    deletes it
import { sql } from "drizzle-orm";
import { db, pool } from "./client";

const go = process.argv.includes("--yes");
const count = async (q: ReturnType<typeof sql>) => Number(((await db.execute<{ n: number }>(q)).rows[0]?.n) ?? 0);

const preview = {
  "customer and store accounts": await count(sql`select count(*)::int as n from users where role = 'customer'`),
  stores: await count(sql`select count(*)::int as n from merchants`),
  "store products": await count(sql`select count(*)::int as n from products where merchant_id is not null`),
  orders: await count(sql`select count(*)::int as n from orders`),
  "store payouts": await count(sql`select count(*)::int as n from merchant_payouts`),
  "token ledger entries": await count(sql`select count(*)::int as n from token_entries`),
  receipts: await count(sql`select count(*)::int as n from receipts`),
  "uploads by those accounts": await count(sql`select count(*)::int as n from media where created_by in (select id from users where role = 'customer')`),
  "staff logins kept": await count(sql`select count(*)::int as n from users where role <> 'customer'`),
};
console.table(preview);

if (!go) {
  console.log("\nNothing deleted. Run again with --yes to delete the above (staff logins are kept).\n");
  await pool.end();
  process.exit(0);
}

await db.transaction(async (tx) => {
  // The ledger starts empty; changes not yet written on chain are dropped (what's written stays as history).
  // Token creations stay, so token numbers keep counting up from the ones already on chain.
  await tx.execute(sql`delete from token_entries`);
  await tx.execute(sql`delete from reserve_entries`);
  await tx.execute(sql`delete from chain_ops where monad_at is null and kind <> 'register'`);
  // Money and orders
  await tx.execute(sql`delete from merchant_payouts`);
  await tx.execute(sql`delete from support_tickets`);
  await tx.execute(sql`delete from orders`); // items, history, payments, refunds, shipments and receipts go with them
  await tx.execute(sql`update inventory set reserved = 0`);
  // Uploads by customers and stores (logos, products, ID and business documents, review photos)
  await tx.execute(sql`delete from media where created_by in (select id from users where role = 'customer')`);
  // Stores and everything of theirs (products, areas, offers, follows, payout accounts, team, walk-ins)
  await tx.execute(sql`delete from merchants`);
  await tx.execute(sql`delete from branches where merchant_id is not null`);
  // Customer accounts (addresses, reviews, wishlists, devices and codes go with them)
  await tx.execute(sql`delete from users where role = 'customer'`);
});

console.log("\nDone. Customer and store accounts are gone; staff logins, Sotechy's catalogue and settings are kept.\n");
await pool.end();
