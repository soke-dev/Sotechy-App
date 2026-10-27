// Featured stores for the admin: who's featured, what was paid, the price and spots, and featuring by hand.
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, gt, gte, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db, schema } from "../../db/client";
import { audit } from "../../lib/audit";
import { requirePassword, requireRole, type AppEnv } from "../../lib/auth";
import { notFound } from "../../lib/errors";
import { featuringSettings } from "../../services/featuring";

const ADMIN = requireRole("admin");
const m = schema.merchants;
const fp = schema.featuredPurchases;

export const adminFeaturingRoutes = new Hono<AppEnv>()
  .get("/featuring", async (c) => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const [settings, featured, purchases, [revenue]] = await Promise.all([
      featuringSettings(),
      db.select({ id: m.id, name: m.name, slug: m.slug, ticker: m.ticker, logoUrl: m.logoUrl, featuredUntil: m.featuredUntil }).from(m).where(gt(m.featuredUntil, new Date())).orderBy(m.featuredUntil),
      db
        .select({ id: fp.id, months: fp.months, amount: fp.amount, paidAt: fp.paidAt, until: fp.until, storeName: m.name, storeId: m.id })
        .from(fp)
        .innerJoin(m, eq(m.id, fp.merchantId))
        .where(eq(fp.status, "paid"))
        .orderBy(desc(fp.paidAt))
        .limit(100),
      db.select({ total: sql<number>`coalesce(sum(${fp.amount}), 0)::float` }).from(fp).where(and(eq(fp.status, "paid"), gte(fp.paidAt, monthStart))),
    ]);
    return c.json({ settings, featured, purchases, revenueThisMonth: revenue?.total ?? 0 });
  })
  .put("/featuring-settings", ADMIN, requirePassword, zValidator("json", z.object({ pricePerMonth: z.number().int().min(0).max(1_000_000), maxStores: z.number().int().min(1).max(50) })), async (c) => {
    const value = c.req.valid("json");
    await db.transaction(async (tx) => {
      await tx.insert(schema.appSettings).values({ key: "featuring", value }).onConflictDoUpdate({ target: schema.appSettings.key, set: { value } });
      await audit(tx, { actorId: c.get("user").id, action: "settings.featuring", entityType: "setting", details: value });
    });
    return c.json(value);
  })
  /** Features a store for some days without payment (or ends it with days: 0) */
  .post("/merchants/:id/feature", ADMIN, requirePassword, zValidator("json", z.object({ days: z.number().int().min(0).max(365) })), async (c) => {
    const { days } = c.req.valid("json");
    const [store] = await db.select().from(m).where(eq(m.id, c.req.param("id")));
    if (!store) throw notFound("Store not found");
    const from = store.featuredUntil && store.featuredUntil > new Date() ? store.featuredUntil : new Date();
    const until = days === 0 ? null : new Date(from.getTime() + days * 86_400_000);
    await db.update(m).set({ featuredUntil: until }).where(eq(m.id, store.id));
    await audit(db, { actorId: c.get("user").id, action: days === 0 ? "merchant.unfeature" : "merchant.feature", entityType: "merchant", entityId: store.id, details: { days } });
    return c.json({ featuredUntil: until });
  });
