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
      db.select({ id: m.id, name: m.name, slug: m.slug, ticker: m.ticker, logoUrl: m.logoUrl, featuredUntil: m.featuredUntil, proUntil: m.proUntil }).from(m).where(gt(m.featuredUntil, new Date())).orderBy(m.featuredUntil),
      db
        .select({ id: fp.id, months: fp.months, amount: fp.amount, tier: fp.tier, paidAt: fp.paidAt, until: fp.until, storeName: m.name, storeId: m.id })
        .from(fp)
        .innerJoin(m, eq(m.id, fp.merchantId))
        .where(eq(fp.status, "paid"))
        .orderBy(desc(fp.paidAt))
        .limit(100),
      db.select({ total: sql<number>`coalesce(sum(${fp.amount}), 0)::float` }).from(fp).where(and(eq(fp.status, "paid"), gte(fp.paidAt, monthStart))),
    ]);
    return c.json({ settings, featured, purchases, revenueThisMonth: revenue?.total ?? 0 });
  })
  .put(
    "/featuring-settings",
    ADMIN,
    requirePassword,
    zValidator(
      "json",
      z.object({
        pricePerMonth: z.number().int().min(0).max(1_000_000),
        maxStores: z.number().int().min(1).max(1000),
        maxPerStore: z.number().int().min(1).max(12).default(2),
        proPricePerMonth: z.number().int().min(0).max(5_000_000).default(10_000),
        // Each Pro store gets a row on Home, so only a few
        maxPro: z.number().int().min(0).max(6).default(2),
      }),
    ),
    async (c) => {
    const value = c.req.valid("json");
    await db.transaction(async (tx) => {
      await tx.insert(schema.appSettings).values({ key: "featuring", value }).onConflictDoUpdate({ target: schema.appSettings.key, set: { value } });
      await audit(tx, { actorId: c.get("user").id, action: "settings.featuring", entityType: "setting", details: value });
    });
    return c.json(value);
    },
  )
  /** Features a store (or gives it Pro) for some days without payment; days: 0 ends it (ending featuring ends Pro too) */
  .post("/merchants/:id/feature", ADMIN, requirePassword, zValidator("json", z.object({ days: z.number().int().min(0).max(365), tier: z.enum(["standard", "pro"]).default("standard") })), async (c) => {
    const { days, tier } = c.req.valid("json");
    const [store] = await db.select().from(m).where(eq(m.id, c.req.param("id")));
    if (!store) throw notFound("Store not found");
    const now = new Date();
    const add = (d: Date | null) => new Date((d && d > now ? d : now).getTime() + days * 86_400_000);
    const set =
      days === 0
        ? tier === "pro"
          ? { proUntil: null }
          : { featuredUntil: null, proUntil: null }
        : tier === "pro"
          ? (() => {
              const proUntil = add(store.proUntil);
              return { proUntil, featuredUntil: store.featuredUntil && store.featuredUntil > proUntil ? store.featuredUntil : proUntil };
            })()
          : { featuredUntil: add(store.featuredUntil) };
    await db.update(m).set(set).where(eq(m.id, store.id));
    await audit(db, { actorId: c.get("user").id, action: days === 0 ? `merchant.unfeature_${tier}` : `merchant.feature_${tier}`, entityType: "merchant", entityId: store.id, details: { days } });
    return c.json(set);
  });
