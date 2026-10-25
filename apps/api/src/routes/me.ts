import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db, schema } from "../db/client";
import { requireAuth, type AppEnv } from "../lib/auth";
import { notFound } from "../lib/errors";
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

export const meRoutes = new Hono<AppEnv>()
  .use(requireAuth)
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
