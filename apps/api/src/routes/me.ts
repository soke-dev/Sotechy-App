import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db, schema } from "../db/client";
import { requireAuth, type AppEnv } from "../lib/auth";
import { badRequest, notFound } from "../lib/errors";
import { publicApiUrl } from "../env";
import { requireFeature } from "../services/features";
import { noRecipient, receiptFor, recipientFor, reviewBonus, sendTokens, walletFor } from "../services/tokens";
import { chatFor, postChatMessage } from "../services/support-chat";
import { CHAINS, currentContract } from "../services/chain";
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
  /** A photo for a review (JPG, PNG or WebP, up to 5 MB each) */
  .post("/media", async (c) => {
    const body = await c.req.parseBody({ all: true });
    const files = [body.file].flat().filter((f): f is File => f instanceof File);
    if (!files.length) throw badRequest("Choose a photo to upload");
    const saved = [];
    for (const file of files.slice(0, 4)) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw badRequest("Use a JPG, PNG or WebP photo");
      if (file.size > 5 * 1024 * 1024) throw badRequest("That photo is too large (max 5 MB)");
      const [row] = await db
        .insert(schema.media)
        .values({ filename: file.name.slice(0, 200), contentType: file.type, size: file.size, data: Buffer.from(await file.arrayBuffer()), isPrivate: false, createdBy: c.get("user").id })
        .returning({ id: schema.media.id });
      saved.push({ id: row.id, url: `${publicApiUrl || new URL(c.req.url).origin}/media/${row.id}` });
    }
    return c.json(saved, 201);
  })
  /** Token balances (held and on the way), activity, and the wallet's address on Monad */
  .get("/wallet", async (c) => {
    const wallet = await walletFor(c.get("user").id);
    const explorer = CHAINS.monad.explorer;
    const tokens = currentContract("tokens", "monad");
    return c.json({
      ...wallet,
      addressUrl: `${explorer}/address/${wallet.address}`,
      contractUrl: tokens ? `${explorer}/address/${tokens.address}` : null,
      activity: wallet.activity.map((a) => ({ ...a, txUrl: a.tx ? `${explorer}/tx/${a.tx}` : null })),
    });
  })
  /** Who an @username or Sotechy wallet address is, shown before sending tokens: first name and last initial only */
  .get("/wallet/recipient", zValidator("query", z.object({ to: z.string().min(1).max(60) })), async (c) => {
    const to = c.req.valid("query").to;
    const found = await recipientFor(to);
    if (!found) throw notFound(noRecipient(to));
    const [first, ...rest] = (found.fullName ?? "").trim().split(/\s+/).filter(Boolean);
    return c.json({
      username: found.username,
      name: first ? `${first}${rest.length ? ` ${rest[rest.length - 1][0].toUpperCase()}.` : ""}` : null,
      avatarStyle: found.avatarStyle,
      seed: found.id,
      isYou: found.id === c.get("user").id,
    });
  })
  .post(
    "/wallet/send",
    zValidator("json", z.object({ to: z.string().min(1).max(60), ticker: z.string().min(1).max(12), amount: z.number().int().positive().max(1_000_000_000) })),
    async (c) => c.json(await sendTokens(c.get("user").id, c.req.valid("json"))),
  )
  /** The full receipt of a delivered order, and where it's recorded on chain */
  .get("/orders/:id/receipt", async (c) => {
    const r = await receiptFor(c.get("user").id, c.req.param("id"));
    if (!r) throw notFound("No receipt yet: it's issued when the order is delivered");
    const contract = currentContract("receipts", "monad");
    const explorer = CHAINS.monad.explorer;
    return c.json({
      ...r,
      txUrl: r.tx ? `${explorer}/tx/${r.tx}` : null,
      nftUrl: contract ? `${explorer}/nft/${contract.address}/${r.id}` : null,
    });
  })
  /** Stores this account saved with the heart (their slugs) */
  .get("/favourite-stores", async (c) => {
    const rows = await db
      .select({ slug: schema.merchants.slug })
      .from(schema.storeFavourites)
      .innerJoin(schema.merchants, eq(schema.merchants.id, schema.storeFavourites.merchantId))
      .where(eq(schema.storeFavourites.userId, c.get("user").id));
    return c.json(rows.map((r) => r.slug));
  })
  .post("/favourite-stores/:slug", async (c) => {
    const store = await liveStore(c.req.param("slug"));
    await db.insert(schema.storeFavourites).values({ userId: c.get("user").id, merchantId: store.id }).onConflictDoNothing();
    return c.json({ favourite: true });
  })
  .delete("/favourite-stores/:slug", async (c) => {
    const store = await liveStore(c.req.param("slug"));
    await db.delete(schema.storeFavourites).where(and(eq(schema.storeFavourites.userId, c.get("user").id), eq(schema.storeFavourites.merchantId, store.id)));
    return c.json({ favourite: false });
  })
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
      z.object({
        productId: z.uuid(),
        rating: z.number().int().min(1).max(5),
        title: z.string().max(120).nullable().optional(),
        body: z.string().min(3).max(3000),
        /** Uploaded photo URLs (from /media); one earns the full review bonus */
        photos: z.array(z.string().url().max(500)).max(4).optional(),
      }),
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
      const values = { rating: input.rating, title: input.title ?? null, body: input.body, photos: input.photos ?? [], verified: purchased.length > 0 };
      const [row] = await db
        .insert(schema.productReviews)
        .values({ ...values, productId: input.productId, userId })
        .onConflictDoUpdate({ target: [schema.productReviews.productId, schema.productReviews.userId], set: { ...values, isPublished: true } })
        .returning();
      // Reviewing something they had delivered earns a bonus in the store's token
      const bonus = row.verified ? await reviewBonus(userId, input.productId, row.photos.length > 0).catch(() => null) : null;
      return c.json({ ...row, bonus }, 201);
    },
  )
  /** The customer's live chat with Sotechy: their open conversation and its messages */
  .get("/support/chat", async (c) => c.json(await chatFor(c.get("user").id)))
  .post("/support/chat", zValidator("json", z.object({ message: z.string().trim().min(1).max(2000), orderId: z.uuid().optional() })), async (c) => {
    const { message, orderId } = c.req.valid("json");
    await postChatMessage(c.get("user").id, message, orderId);
    return c.json(await chatFor(c.get("user").id), 201);
  })
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
