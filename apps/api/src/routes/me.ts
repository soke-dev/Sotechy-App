import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db, schema } from "../db/client";
import { requireAuth, type AppEnv } from "../lib/auth";
import { notFound } from "../lib/errors";
import { requireFeature } from "../services/features";
import { catalogQuery } from "./store";

const addressSchema = z.object({
  label: z.string().max(40).nullable().optional(),
  recipientName: z.string().min(1),
  phone: z.string().min(5),
  line1: z.string().min(1),
  line2: z.string().max(200).nullable().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  isDefault: z.boolean().optional(),
});

/** The store a follow points at, if it's open */
async function liveStore(slug: string) {
  const [store] = await db.select({ id: schema.merchants.id }).from(schema.merchants).where(and(eq(schema.merchants.slug, slug), eq(schema.merchants.status, "approved")));
  if (!store) throw notFound("Store not found");
  return store;
}

export const meRoutes = new Hono<AppEnv>()
  .use(requireAuth)
  /** Stores this account follows (their slugs) */
  .get("/follows", async (c) => {
    const rows = await db
      .select({ slug: schema.merchants.slug })
      .from(schema.storeFollows)
      .innerJoin(schema.merchants, eq(schema.merchants.id, schema.storeFollows.merchantId))
      .where(eq(schema.storeFollows.userId, c.get("user").id));
    return c.json(rows.map((r) => r.slug));
  })
  .post("/follows/:slug", async (c) => {
    const store = await liveStore(c.req.param("slug"));
    await db.insert(schema.storeFollows).values({ userId: c.get("user").id, merchantId: store.id }).onConflictDoNothing();
    return c.json({ following: true });
  })
  .delete("/follows/:slug", async (c) => {
    const store = await liveStore(c.req.param("slug"));
    await db.delete(schema.storeFollows).where(and(eq(schema.storeFollows.userId, c.get("user").id), eq(schema.storeFollows.merchantId, store.id)));
    return c.json({ following: false });
  })
  /** Messages from stores this account follows, newest first (last 60 days) */
  .get("/store-notices", async (c) => {
    const n = schema.storeNotices;
    const rows = await db
      .select({ id: n.id, title: n.title, body: n.body, createdAt: n.createdAt, storeSlug: schema.merchants.slug, storeName: schema.merchants.name, storeLogo: schema.merchants.logoUrl, productSlug: schema.products.slug })
      .from(n)
      .innerJoin(schema.storeFollows, and(eq(schema.storeFollows.merchantId, n.merchantId), eq(schema.storeFollows.userId, c.get("user").id)))
      .innerJoin(schema.merchants, eq(schema.merchants.id, n.merchantId))
      .leftJoin(schema.products, eq(schema.products.id, n.productId))
      .where(gte(n.createdAt, new Date(Date.now() - 60 * 86_400_000)))
      .orderBy(desc(n.createdAt))
      .limit(100);
    return c.json(rows);
  })
  /** This phone wants push notifications for the signed-in account */
  .post(
    "/push-devices",
    zValidator("json", z.object({ token: z.string().regex(/^Expo(nent)?PushToken\[.+\]$/, "Not an Expo push token"), platform: z.enum(["android", "ios"]) })),
    async (c) => {
      const { token, platform } = c.req.valid("json");
      const userId = c.get("user").id;
      await db
        .insert(schema.pushDevices)
        .values({ token, platform, userId })
        .onConflictDoUpdate({ target: schema.pushDevices.token, set: { userId, platform, updatedAt: new Date() } });
      return c.json({ ok: true });
    },
  )
  /** Signing out on this phone: stop sending it this account's notifications */
  .delete("/push-devices", zValidator("json", z.object({ token: z.string() })), async (c) => {
    await db
      .delete(schema.pushDevices)
      .where(and(eq(schema.pushDevices.token, c.req.valid("json").token), eq(schema.pushDevices.userId, c.get("user").id)));
    return c.json({ ok: true });
  })
  .get("/wishlist", async (c) => {
    const saved = await db.select({ productId: schema.wishlists.productId }).from(schema.wishlists).where(eq(schema.wishlists.userId, c.get("user").id));
    if (saved.length === 0) return c.json([]);
    return c.json(await catalogQuery(inArray(schema.products.id, saved.map((s) => s.productId))));
  })
  .post("/wishlist/:productId", async (c) => {
    const userId = c.get("user").id;
    const productId = c.req.param("productId");
    const where = and(eq(schema.wishlists.userId, userId), eq(schema.wishlists.productId, productId));
    const [existing] = await db.select().from(schema.wishlists).where(where);
    if (existing) {
      await db.delete(schema.wishlists).where(where);
      return c.json({ saved: false });
    }
    await db.insert(schema.wishlists).values({ userId, productId });
    return c.json({ saved: true });
  })
  .get("/addresses", async (c) => {
    const rows = await db
      .select()
      .from(schema.addresses)
      .where(eq(schema.addresses.userId, c.get("user").id))
      .orderBy(desc(schema.addresses.isDefault), desc(schema.addresses.createdAt));
    return c.json(rows);
  })
  .post("/addresses", zValidator("json", addressSchema), async (c) => {
    const userId = c.get("user").id;
    const input = c.req.valid("json");
    const row = await db.transaction(async (tx) => {
      const existing = await tx.select({ id: schema.addresses.id }).from(schema.addresses).where(eq(schema.addresses.userId, userId)).limit(1);
      // The first address, or one explicitly marked default, becomes the default.
      const makeDefault = input.isDefault || existing.length === 0;
      if (makeDefault) await tx.update(schema.addresses).set({ isDefault: false }).where(eq(schema.addresses.userId, userId));
      const [r] = await tx.insert(schema.addresses).values({ ...input, isDefault: makeDefault, userId }).returning();
      return r;
    });
    return c.json(row, 201);
  })
  .patch("/addresses/:id", zValidator("json", addressSchema.partial()), async (c) => {
    const userId = c.get("user").id;
    const input = c.req.valid("json");
    const row = await db.transaction(async (tx) => {
      if (input.isDefault) await tx.update(schema.addresses).set({ isDefault: false }).where(eq(schema.addresses.userId, userId));
      const [r] = await tx
        .update(schema.addresses)
        .set(input)
        .where(and(eq(schema.addresses.id, c.req.param("id")), eq(schema.addresses.userId, userId)))
        .returning();
      return r;
    });
    if (!row) throw notFound("Address not found");
    return c.json(row);
  })
  .delete("/addresses/:id", async (c) => {
    await db.delete(schema.addresses).where(and(eq(schema.addresses.id, c.req.param("id")), eq(schema.addresses.userId, c.get("user").id)));
    return c.body(null, 204);
  })
  /** Create or update the signed-in customer's review of a product. */
  .post(
    "/reviews",
    zValidator(
      "json",
      z.object({ productId: z.uuid(), rating: z.number().int().min(1).max(5), title: z.string().max(120).nullable().optional(), body: z.string().min(3).max(3000) }),
    ),
    async (c) => {
      await requireFeature("reviews", "Reviews are turned off right now");
      const userId = c.get("user").id;
      const input = c.req.valid("json");
      const [product] = await db.select({ id: schema.products.id }).from(schema.products).where(eq(schema.products.id, input.productId));
      if (!product) throw notFound("Product not found");
      // Verified when the customer has a completed order with this product in it.
      const purchased = await db
        .select({ id: schema.orders.id })
        .from(schema.orders)
        .innerJoin(schema.orderItems, eq(schema.orderItems.orderId, schema.orders.id))
        .innerJoin(schema.productVariants, eq(schema.productVariants.id, schema.orderItems.variantId))
        .where(and(eq(schema.orders.customerId, userId), eq(schema.orders.status, "delivered"), eq(schema.productVariants.productId, input.productId)))
        .limit(1);
      const values = { rating: input.rating, title: input.title ?? null, body: input.body, verified: purchased.length > 0 };
      const [row] = await db
        .insert(schema.productReviews)
        .values({ ...values, productId: input.productId, userId })
        .onConflictDoUpdate({ target: [schema.productReviews.productId, schema.productReviews.userId], set: { ...values, isPublished: true } })
        .returning();
      return c.json(row, 201);
    },
  )
  .post(
    "/support",
    zValidator("json", z.object({ subject: z.string().min(3).max(150), message: z.string().min(5).max(5000), orderId: z.uuid().optional() })),
    async (c) => {
      const [ticket] = await db
        .insert(schema.supportTickets)
        .values({ ...c.req.valid("json"), customerId: c.get("user").id })
        .returning({ id: schema.supportTickets.id });
      return c.json(ticket, 201);
    },
  );
