// Reset the marketplace (Admin → Settings → Danger zone): deletes every store and everything tied to stores
// — products (Sotechy's own too), orders and their payments, refunds, receipts and payouts, offers, every
// token balance and the token reserve, and the store owners' accounts (never admins). Categories, banners
// and pop-ups made by Sotechy, settings, customers and support chats stay. Records already written on
// Monad or Base stay there; the "token created" records are kept so a new store never reuses an old
// token number. A full backup can be downloaded first.
import { zValidator } from "@hono/zod-validator";
import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../../db/client";
import { audit } from "../../lib/audit";
import { requirePassword, requireRole, type AppEnv } from "../../lib/auth";

const ADMIN = requireRole("admin");
export const RESET_PHRASE = "DELETE ALL STORES";

/** Store owners whose accounts go too (admins never) */
const OWNERS = sql`select owner_id from merchants where owner_id is not null and owner_id not in (select id from users where role = 'admin')`;

async function count(query: ReturnType<typeof sql>) {
  const { rows } = await db.execute<{ n: number }>(query);
  return Number(rows[0]?.n ?? 0);
}

async function preview() {
  return {
    stores: await count(sql`select count(*)::int n from merchants`),
    products: await count(sql`select count(*)::int n from products`),
    orders: await count(sql`select count(*)::int n from orders`),
    payments: await count(sql`select count(*)::int n from payments`),
    refunds: await count(sql`select count(*)::int n from refunds`),
    payouts: await count(sql`select count(*)::int n from merchant_payouts`),
    offers: await count(sql`select count(*)::int n from offers`),
    walkIns: await count(sql`select count(*)::int n from walk_in_sales`),
    tokenRecords: await count(sql`select count(*)::int n from token_entries`),
    reserveRecords: await count(sql`select count(*)::int n from reserve_entries`),
    receipts: await count(sql`select count(*)::int n from receipts`),
    chainQueue: await count(sql`select count(*)::int n from chain_ops where kind <> 'register'`),
    purchaseOrders: await count(sql`select count(*)::int n from purchase_orders`),
    ownerAccounts: await count(sql`select count(*)::int n from users where id in (${OWNERS})`),
  };
}

export const adminResetRoutes = new Hono<AppEnv>()
  /** What a reset would delete */
  .get("/reset/preview", ADMIN, async (c) => c.json({ ...(await preview()), phrase: RESET_PHRASE }))
  /** Every table, every row, as one JSON file: the backup to keep before resetting */
  .get("/reset/backup", ADMIN, async (c) => {
    const { rows: tables } = await db.execute<{ name: string }>(sql`select table_name as name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by 1`);
    const data: Record<string, unknown[]> = {};
    for (const { name } of tables) data[name] = (await db.execute(sql.raw(`select * from "${name.replace(/"/g, "")}"`))).rows;
    await audit(db, { actorId: c.get("user").id, action: "reset.backup", entityType: "database", details: { tables: tables.length } });
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
    c.header("Content-Disposition", `attachment; filename="sotechy-backup-${stamp}.json"`);
    return c.json({ takenAt: new Date().toISOString(), tables: data });
  })
  /** Deletes it all in one transaction: if any step fails, nothing is deleted */
  .post("/reset/marketplace", ADMIN, requirePassword, zValidator("json", z.object({ confirm: z.string() })), async (c) => {
    if (c.req.valid("json").confirm.trim() !== RESET_PHRASE) return c.json({ error: `Type ${RESET_PHRASE} to confirm` }, 400);
    const before = await preview();
    await db.transaction(async (tx) => {
      const run = (q: ReturnType<typeof sql>) => tx.execute(q);
      // The owners, before their stores go (stores forget their owner on delete)
      const { rows: owners } = await tx.execute<{ owner_id: string }>(OWNERS);
      // Money and orders: payouts and refunds point at orders and payments, so they go first
      await run(sql`delete from merchant_payouts`);
      await run(sql`delete from refunds`);
      await run(sql`delete from offers`);
      await run(sql`delete from orders`); // items, history, payments, shipments and receipts go with them
      // Tokens: every balance, the reserve, receipts, and the queue of chain writes (not the "token created" records)
      await run(sql`delete from token_entries`);
      await run(sql`delete from reserve_entries`);
      await run(sql`delete from receipts`);
      await run(sql`delete from chain_ops where kind <> 'register'`);
      // Products: Sotechy's restocking orders point at product options, so they go first
      await run(sql`delete from purchase_orders`);
      await run(sql`delete from products`); // options, stock, reviews, saved items and offers go with them
      // The stores, with their delivery areas, promo codes, banners, followers, news, featuring, walk-ins, team and bank accounts
      await run(sql`delete from merchants`);
      // Their owners' accounts (admins are never in this list)
      if (owners.length) await run(sql`delete from users where role <> 'admin' and id in (${sql.join(owners.map((o) => sql`${o.owner_id}`), sql`, `)})`);
    });
    await audit(db, { actorId: c.get("user").id, action: "reset.marketplace", entityType: "database", details: before });
    return c.json({ deleted: before });
  });
