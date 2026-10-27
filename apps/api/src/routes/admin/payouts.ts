// Store payouts for the admin: what's due, sending it, holding it, and the payout plans.
import { zValidator } from "@hono/zod-validator";
import { and, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db, schema } from "../../db/client";
import { audit } from "../../lib/audit";
import { requireRole, type AppEnv } from "../../lib/auth";
import { badRequest, notFound } from "../../lib/errors";
import { flutterwaveReady, payoutBalance } from "../../services/flutterwave";
import { payoutSettings, payoutsFor, sendPayout, toPayoutRow } from "../../services/payouts";

// Moving money is for admins; managers can look
const ADMIN = requireRole("admin");
const plan = z.object({ firstPercent: z.number().int().min(0).max(100), fee: z.enum(["spread", "first", "last"]) });

/** Moves a payout between statuses when it's in one of `from` */
async function move(id: string, from: ("scheduled" | "failed" | "held" | "owed")[], to: "held" | "scheduled" | "settled", actorId: string) {
  const [row] = await db
    .update(schema.merchantPayouts)
    .set({ status: to })
    .where(and(eq(schema.merchantPayouts.id, id), inArray(schema.merchantPayouts.status, from)))
    .returning();
  if (!row) throw badRequest("That can't be done to this payout now");
  await audit(db, { actorId, action: `payout.${to}`, entityType: "payout", entityId: id, details: { amount: row.amount } });
  return row;
}

export const adminPayoutRoutes = new Hono<AppEnv>()
  .get("/payouts", zValidator("query", z.object({ status: z.string().max(20).optional() })), async (c) => {
    const [rows, settings, balance] = await Promise.all([payoutsFor({ status: c.req.valid("query").status }), payoutSettings(), payoutBalance()]);
    const stores = await db
      .select({ id: schema.merchants.id, accountName: schema.merchants.payoutAccountName })
      .from(schema.merchants)
      .where(inArray(schema.merchants.id, [...new Set(rows.map((r) => r.p.merchantId))].concat("00000000-0000-0000-0000-000000000000")));
    return c.json({
      ready: flutterwaveReady(),
      balance,
      settings,
      payouts: rows.map((r) => ({
        ...toPayoutRow(r),
        merchantId: r.p.merchantId,
        storeName: r.storeName,
        storeTicker: r.storeTicker,
        accountName: r.p.accountName ?? stores.find((s) => s.id === r.p.merchantId)?.accountName ?? null,
        accountReady: r.ready,
      })),
    });
  })
  /** Sends now, even before it's due (the admin is approving it) */
  .post("/payouts/:id/send", ADMIN, async (c) => c.json(await sendPayout(c.req.param("id"), { actorId: c.get("user").id, force: true })))
  .post("/payouts/:id/hold", ADMIN, async (c) => c.json(await move(c.req.param("id"), ["scheduled", "failed"], "held", c.get("user").id)))
  .post("/payouts/:id/release", ADMIN, async (c) => c.json(await move(c.req.param("id"), ["held"], "scheduled", c.get("user").id)))
  /** A payback the store has returned */
  .post("/payouts/:id/settle", ADMIN, async (c) => c.json(await move(c.req.param("id"), ["owed"], "settled", c.get("user").id)))
  .put(
    "/payout-settings",
    ADMIN,
    zValidator("json", z.object({ autoSend: z.boolean(), feeRate: z.number().min(0).max(0.3), standard: plan, finalAfterHours: z.number().int().min(0).max(24 * 30) })),
    async (c) => {
      const value = c.req.valid("json");
      await db.transaction(async (tx) => {
        await tx.insert(schema.appSettings).values({ key: "payouts", value }).onConflictDoUpdate({ target: schema.appSettings.key, set: { value } });
        await audit(tx, { actorId: c.get("user").id, action: "settings.payouts", entityType: "setting", details: value });
      });
      return c.json(value);
    },
  )
  /** A store's own plan; null puts it back on the standard plan */
  .put("/merchants/:id/payout-plan", ADMIN, zValidator("json", z.object({ plan: plan.nullable() })), async (c) => {
    const { plan: next } = c.req.valid("json");
    const [row] = await db.update(schema.merchants).set({ payoutPlan: next }).where(eq(schema.merchants.id, c.req.param("id"))).returning({ id: schema.merchants.id });
    if (!row) throw notFound("Store not found");
    await audit(db, { actorId: c.get("user").id, action: "merchant.payout_plan", entityType: "merchant", entityId: row.id, details: { plan: next } });
    return c.json({ plan: next });
  });
