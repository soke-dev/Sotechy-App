// Public storefront routes: no auth, published products only, never exposes cost prices.
import { and, asc, desc, eq, getTableColumns, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import { Hono } from "hono";
import { db, schema } from "../db/client";
import { notFound } from "../lib/errors";
import { getSetting, type DeliverySettings } from "../services/settings";

const { products, productVariants, inventory, categories, branches } = schema;

/** Columns for a product card (one row per product with price range and total available stock). */
export const catalogColumns = {
  id: products.id,
  name: products.name,
  slug: products.slug,
  brand: products.brand,
  model: products.model,
  categoryId: products.categoryId,
  categoryName: categories.name,
  imageUrl: sql<string | null>`${products.images}[1]`,
  minPrice: sql<number>`coalesce(min(${productVariants.price}), 0)::float`,
  compareAtPrice: sql<number | null>`max(${productVariants.compareAtPrice})::float`,
  totalAvailable: sql<number>`coalesce(sum(${inventory.quantity} - ${inventory.reserved}), 0)::int`,
  isFeatured: products.isFeatured,
  isPublished: products.isPublished,
  isDemo: products.isDemo,
  createdAt: products.createdAt,
};

export function catalogQuery(where: SQL | undefined) {
  return db
    .select(catalogColumns)
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .leftJoin(productVariants, and(eq(productVariants.productId, products.id), eq(productVariants.isActive, true)))
    .leftJoin(inventory, eq(inventory.variantId, productVariants.id))
    .where(where)
    .groupBy(products.id, categories.name);
}

const { costPrice: _cost, ...publicVariantColumns } = getTableColumns(productVariants);

export const storeRoutes = new Hono()
  .get("/config", async (c) => {
    const [branchList, methods, assets, promos, delivery, support] = await Promise.all([
      db.select().from(branches).where(eq(branches.isActive, true)).orderBy(asc(branches.name)),
      db.select().from(schema.paymentMethods),
      db.select().from(schema.cryptoAssets).where(eq(schema.cryptoAssets.isEnabled, true)),
      db.select().from(schema.promotions).where(and(eq(schema.promotions.isActive, true), isNull(schema.promotions.code))),
      getSetting<DeliverySettings>("delivery"),
      getSetting<{ phone: string | null; email: string | null; whatsapp: string | null }>("support"),
    ]);
    return c.json({
      branches: branchList,
      paymentMethods: methods,
      cryptoAssets: assets,
      promotions: promos,
      delivery: delivery ?? { flatFee: 0, freeOver: null, note: null },
      support: support ?? { phone: null, email: null, whatsapp: null },
    });
  })
  .get("/categories", async (c) => {
    return c.json(await db.select().from(categories).where(eq(categories.isActive, true)).orderBy(asc(categories.sortOrder)));
  })
  .get("/products", async (c) => {
    const { q, category, sort, featured } = c.req.query();
    const filters: (SQL | undefined)[] = [eq(products.isPublished, true), isNull(products.merchantId)];
    if (q) {
      const term = `%${q}%`;
      filters.push(or(ilike(products.name, term), ilike(products.brand, term), ilike(products.model, term)));
    }
    if (category) filters.push(or(eq(categories.slug, category), sql`${products.categoryId}::text = ${category}`));
    if (featured === "true") filters.push(eq(products.isFeatured, true));

    const order =
      sort === "price_asc"
        ? asc(catalogColumns.minPrice)
        : sort === "price_desc"
          ? desc(catalogColumns.minPrice)
          : desc(products.createdAt); // "newest" (popularity sort needs sales data — add later)

    return c.json(await catalogQuery(and(...filters)).orderBy(order).limit(100));
  })
  .get("/products/:idOrSlug", async (c) => {
    const key = c.req.param("idOrSlug");
    const isUuid = /^[0-9a-f-]{36}$/i.test(key);
    const [product] = await db
      .select()
      .from(products)
      .where(and(isUuid ? eq(products.id, key) : eq(products.slug, key), eq(products.isPublished, true)));
    if (!product) throw notFound("Product not found");

    const variants = await db
      .select(publicVariantColumns)
      .from(productVariants)
      .where(and(eq(productVariants.productId, product.id), eq(productVariants.isActive, true)))
      .orderBy(asc(productVariants.price));

    const stock = await db
      .select({
        variantId: inventory.variantId,
        branchId: inventory.branchId,
        branchName: branches.name,
        quantity: inventory.quantity,
        reserved: inventory.reserved,
      })
      .from(inventory)
      .innerJoin(branches, eq(branches.id, inventory.branchId))
      .innerJoin(productVariants, eq(productVariants.id, inventory.variantId))
      .where(and(eq(productVariants.productId, product.id), eq(branches.isActive, true)));

    return c.json({ ...product, variants, stock });
  });
