import { zValidator } from "@hono/zod-validator";
import { and, asc, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db, schema } from "../../db/client";
import { audit } from "../../lib/audit";
import { MANAGERS, requireRole, type AppEnv } from "../../lib/auth";
import { notFound } from "../../lib/errors";
import { catalogQuery } from "../store";

const { products, productVariants, categories, inventory, branches } = schema;

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);

const productFields = z.object({
  name: z.string().min(2).max(200),
  slug: z.string().max(100).optional(),
  categoryId: z.uuid().nullable().optional(),
  brand: z.string().max(100).nullable().optional(),
  model: z.string().max(100).nullable().optional(),
  description: z.string().max(10000).nullable().optional(),
  specifications: z.record(z.string(), z.string()).optional(),
  images: z.array(z.url()).max(12).optional(),
  condition: z.enum(["new", "used", "refurbished"]).optional(),
  warrantyMonths: z.number().int().min(0).nullable().optional(),
  returnPolicy: z.string().max(2000).nullable().optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  allowDelivery: z.boolean().optional(),
  allowPickup: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

const variantFields = z.object({
  sku: z.string().min(1).max(60),
  name: z.string().min(1).max(100).default("Standard"),
  attributes: z.record(z.string(), z.string()).optional(),
  price: z.number().nonnegative(),
  compareAtPrice: z.number().nonnegative().nullable().optional(),
  costPrice: z.number().nonnegative().nullable().optional(),
  isActive: z.boolean().optional(),
});

const categoryFields = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().max(100).optional(),
  parentId: z.uuid().nullable().optional(),
  imageUrl: z.url().nullable().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const adminCatalogRoutes = new Hono<AppEnv>()
  // --- Products (all staff can view; managers edit) ---
  .get("/products", async (c) => {
    return c.json(await catalogQuery(undefined).orderBy(desc(products.createdAt)).limit(500));
  })
  .get("/products/:id", async (c) => {
    const [product] = await db.select().from(products).where(eq(products.id, c.req.param("id")));
    if (!product) throw notFound("Product not found");
    const variants = await db.select().from(productVariants).where(eq(productVariants.productId, product.id)).orderBy(asc(productVariants.createdAt));
    const stock = await db
      .select({ variantId: inventory.variantId, branchId: inventory.branchId, branchName: branches.name, quantity: inventory.quantity, reserved: inventory.reserved })
      .from(inventory)
      .innerJoin(branches, eq(branches.id, inventory.branchId))
      .innerJoin(productVariants, eq(productVariants.id, inventory.variantId))
      .where(eq(productVariants.productId, product.id));
    return c.json({ ...product, variants, stock });
  })
  .post(
    "/products",
    requireRole(...MANAGERS),
    zValidator("json", productFields.extend({ variant: variantFields })),
    async (c) => {
      const { variant, ...input } = c.req.valid("json");
      const actor = c.get("user");
      const product = await db.transaction(async (tx) => {
        const [p] = await tx
          .insert(products)
          .values({ ...input, slug: input.slug || `${slugify(input.name)}-${Date.now().toString(36)}` })
          .returning();
        await tx.insert(productVariants).values({ ...variant, productId: p.id });
        await audit(tx, { actorId: actor.id, action: "product.create", entityType: "product", entityId: p.id, details: { name: p.name } });
        return p;
      });
      return c.json(product, 201);
    },
  )
  .patch("/products/:id", requireRole(...MANAGERS), zValidator("json", productFields.partial()), async (c) => {
    const [product] = await db.update(products).set(c.req.valid("json")).where(eq(products.id, c.req.param("id"))).returning();
    if (!product) throw notFound("Product not found");
    await audit(db, { actorId: c.get("user").id, action: "product.update", entityType: "product", entityId: product.id, details: c.req.valid("json") });
    return c.json(product);
  })
  .post("/products/:id/variants", requireRole(...MANAGERS), zValidator("json", variantFields), async (c) => {
    const [variant] = await db.insert(productVariants).values({ ...c.req.valid("json"), productId: c.req.param("id") }).returning();
    return c.json(variant, 201);
  })
  .patch("/variants/:id", requireRole(...MANAGERS), zValidator("json", variantFields.partial()), async (c) => {
    const input = c.req.valid("json");
    const [variant] = await db.update(productVariants).set(input).where(eq(productVariants.id, c.req.param("id"))).returning();
    if (!variant) throw notFound("Variant not found");
    await audit(db, { actorId: c.get("user").id, action: "variant.update", entityType: "product_variant", entityId: variant.id, details: input });
    return c.json(variant);
  })

  // --- Categories ---
  .get("/categories", async (c) => c.json(await db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name))))
  .post("/categories", requireRole(...MANAGERS), zValidator("json", categoryFields), async (c) => {
    const input = c.req.valid("json");
    const [row] = await db.insert(categories).values({ ...input, slug: input.slug || slugify(input.name) }).returning();
    return c.json(row, 201);
  })
  .patch("/categories/:id", requireRole(...MANAGERS), zValidator("json", categoryFields.partial()), async (c) => {
    const [row] = await db.update(categories).set(c.req.valid("json")).where(eq(categories.id, c.req.param("id"))).returning();
    if (!row) throw notFound("Category not found");
    return c.json(row);
  })

  // --- POS product search: active variants with stock at one branch ---
  .get("/pos/search", async (c) => {
    const { q = "", branchId } = c.req.query();
    const rows = await db
      .select({
        variantId: productVariants.id,
        sku: productVariants.sku,
        variantName: productVariants.name,
        productName: products.name,
        price: productVariants.price,
        quantity: inventory.quantity,
        reserved: inventory.reserved,
      })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.productId))
      .leftJoin(inventory, and(eq(inventory.variantId, productVariants.id), branchId ? eq(inventory.branchId, branchId) : undefined))
      .where(eq(productVariants.isActive, true))
      .orderBy(asc(products.name))
      .limit(500);
    const term = q.toLowerCase();
    return c.json(term ? rows.filter((r) => `${r.productName} ${r.variantName} ${r.sku}`.toLowerCase().includes(term)) : rows);
  });
