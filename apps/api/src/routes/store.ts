// Public storefront routes: no auth, published products only, never exposes cost prices.
import { and, asc, desc, eq, getTableColumns, gt, ilike, inArray, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { db, schema } from "../db/client";
import { notFound } from "../lib/errors";
import { getFeatures, requireFeature } from "../services/features";
import { getUsdRate } from "../services/moneymoves";
import { findPromotion } from "../services/promotions";
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
  /** The marketplace store selling it; null for Sotechy's own products */
  storeName: sql<string | null>`(select m.name from merchants m where m.id = ${products.merchantId})`,
  storeSlug: sql<string | null>`(select m.slug from merchants m where m.id = ${products.merchantId})`,
  negotiable: products.negotiable,
  ratingAverage: sql<number | null>`(select round(avg(r.rating)::numeric, 1)::float from product_reviews r where r.product_id = ${products.id} and r.is_published)`,
  ratingCount: sql<number>`(select count(*)::int from product_reviews r where r.product_id = ${products.id} and r.is_published)`,
};

/** Review summary + latest published reviews for a product. */
export async function loadReviews(productId: string) {
  const r = schema.productReviews;
  const rows = await db
    .select({
      id: r.id,
      productId: r.productId,
      userId: r.userId,
      rating: r.rating,
      title: r.title,
      body: r.body,
      verified: r.verified,
      createdAt: r.createdAt,
      fullName: schema.users.fullName,
      avatarStyle: schema.users.avatarStyle,
    })
    .from(r)
    .innerJoin(schema.users, eq(schema.users.id, r.userId))
    .where(and(eq(r.productId, productId), eq(r.isPublished, true)))
    .orderBy(desc(r.createdAt))
    .limit(100);
  const distribution = [0, 0, 0, 0, 0];
  for (const row of rows) distribution[row.rating - 1]++;
  const count = rows.length;
  const average = count ? Math.round((rows.reduce((n, x) => n + x.rating, 0) / count) * 10) / 10 : 0;
  // Show first name + last initial only
  const author = (name: string | null) => {
    const parts = (name ?? "Sotechy customer").trim().split(/\s+/);
    return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
  };
  return {
    summary: { average, count, distribution },
    reviews: rows.map(({ fullName, ...x }) => ({ ...x, authorName: author(fullName) })),
  };
}

export function catalogQuery(where: SQL | undefined, having?: SQL) {
  return db
    .select(catalogColumns)
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .leftJoin(productVariants, and(eq(productVariants.productId, products.id), eq(productVariants.isActive, true)))
    .leftJoin(inventory, eq(inventory.variantId, productVariants.id))
    .where(where)
    .groupBy(products.id, categories.name)
    .having(having);
}

const averageRating = sql`(select avg(r.rating) from product_reviews r where r.product_id = ${products.id} and r.is_published)`;

/** Sotechy's own products, plus those of marketplace stores Sotechy has approved */
const fromLiveSeller = sql`(${products.merchantId} is null or ${products.merchantId} in (select m.id from merchants m where m.status = 'approved'))`;

/**
 * Published products matching the search text and category (a parent category includes its sub-categories).
 * `store`: one marketplace store's slug, or "sotechy" for Sotechy's own products.
 */
function baseFilters({ q, category, store }: { q?: string; category?: string; store?: string }) {
  const filters: (SQL | undefined)[] = [eq(products.isPublished, true), fromLiveSeller];
  if (store === "sotechy") filters.push(isNull(products.merchantId));
  else if (store) filters.push(sql`${products.merchantId} = (select m.id from merchants m where m.slug = ${store})`);
  if (q) {
    const term = `%${q}%`;
    filters.push(or(ilike(products.name, term), ilike(products.brand, term), ilike(products.model, term)));
  }
  if (category) {
    // Store products use the store's own category names
    filters.push(sql`(${products.storeCategory} = ${category} or ${products.categoryId} in (
      select c.id from categories c
      where c.slug = ${category} or c.id::text = ${category}
         or c.parent_id in (select p.id from categories p where p.slug = ${category} or p.id::text = ${category})))`);
  }
  return filters;
}

const positive = (v: string | undefined) => {
  const n = Number(v);
  return v && Number.isFinite(n) && n >= 0 ? n : undefined;
};

const { costPrice: _cost, ...publicVariantColumns } = getTableColumns(productVariants);

export const storeRoutes = new Hono()
  .get("/config", async (c) => {
    const now = new Date();
    const b = schema.banners;
    const [branchList, methods, assets, promos, delivery, support, features, bannerRows] = await Promise.all([
      db.select().from(branches).where(and(eq(branches.isActive, true), isNull(branches.merchantId))).orderBy(asc(branches.name)),
      db.select().from(schema.paymentMethods),
      db.select().from(schema.cryptoAssets).where(eq(schema.cryptoAssets.isEnabled, true)),
      db.select().from(schema.promotions).where(and(eq(schema.promotions.isActive, true), isNull(schema.promotions.code))),
      getSetting<DeliverySettings>("delivery"),
      getSetting<{ phone: string | null; email: string | null; whatsapp: string | null }>("support"),
      getFeatures(),
      db
        .select()
        .from(b)
        .where(and(eq(b.isActive, true), or(isNull(b.startsAt), lte(b.startsAt, now)), or(isNull(b.endsAt), gt(b.endsAt, now))))
        .orderBy(asc(b.sortOrder), desc(b.createdAt)),
    ]);
    return c.json({
      branches: branchList,
      paymentMethods: methods,
      cryptoAssets: assets,
      promotions: promos,
      delivery: delivery ?? { flatFee: 0, freeOver: null, note: null },
      support: support ?? { phone: null, email: null, whatsapp: null },
      features,
      banners: bannerRows,
    });
  })
  .post("/promo/check", zValidator("json", z.object({ code: z.string().trim().min(1).max(40), subtotal: z.number().nonnegative() })), async (c) => {
    // Preview only: the discount is worked out again from real prices when the order is placed.
    await requireFeature("promoCodes", "Promo codes can't be used right now");
    const { code, subtotal } = c.req.valid("json");
    const { promotion, discount } = await db.transaction((tx) => findPromotion(tx, { subtotal, paymentMethod: "online", code }));
    return c.json({ code: promotion!.code ?? code.toUpperCase(), name: promotion!.name, discount });
  })
  .get("/fx", async (c) => {
    const { rate, source, updatedAt } = await getUsdRate();
    return c.json({ base: "USD", quote: "NGN", rate, source, updatedAt });
  })
  .get("/categories", async (c) => {
    return c.json(await db.select().from(categories).where(eq(categories.isActive, true)).orderBy(asc(categories.sortOrder)));
  })
  .get("/products", async (c) => {
    const query = c.req.query();
    // All filters combine (AND); several brands match any of them.
    const filters = baseFilters(query);
    const having: SQL[] = [];
    if (query.featured === "true") filters.push(eq(products.isFeatured, true));
    const brands = (query.brand ?? "").split(",").map((b) => b.trim()).filter(Boolean);
    if (brands.length) filters.push(inArray(products.brand, brands));
    const minRating = positive(query.minRating);
    if (minRating) filters.push(sql`${averageRating} >= ${minRating}`);
    const minPrice = positive(query.minPrice);
    const maxPrice = positive(query.maxPrice);
    if (minPrice !== undefined) having.push(sql`${catalogColumns.minPrice} >= ${minPrice}`);
    if (maxPrice !== undefined) having.push(sql`${catalogColumns.minPrice} <= ${maxPrice}`);
    if (query.inStock === "true") having.push(sql`${catalogColumns.totalAvailable} > 0`);
    // Deals = discounted variants or Sotechy picks
    if (query.deals === "true") having.push(sql`(${products.isFeatured} or coalesce(bool_or(${productVariants.compareAtPrice} > ${productVariants.price}), false))`);

    const order =
      query.sort === "price_asc"
        ? [asc(catalogColumns.minPrice)]
        : query.sort === "price_desc"
          ? [desc(catalogColumns.minPrice)]
          : query.sort === "rating"
            ? [sql`coalesce(${averageRating}, 0) desc`, desc(catalogColumns.ratingCount)]
            : [desc(products.createdAt)]; // "newest" (popularity sort needs sales data — add later)

    return c.json(await catalogQuery(and(...filters), having.length ? and(...having) : undefined).orderBy(...order, desc(products.createdAt)).limit(100));
  })
  /** Marketplace stores Sotechy has approved, featured ones first */
  .get("/stores", async (c) => {
    const m = schema.merchants;
    const rows = await db
      .select({
        id: m.id,
        name: m.name,
        slug: m.slug,
        ticker: m.ticker,
        tagline: m.tagline,
        logoUrl: m.logoUrl,
        coverUrl: m.coverUrl,
        storefront: m.storefront,
        sells: m.sells,
        featuredUntil: m.featuredUntil,
        productCount: sql<number>`(select count(*)::int from products p where p.merchant_id = "merchants"."id" and p.is_published)`,
        ratingAverage: sql<number | null>`(select round(avg(r.rating)::numeric, 1)::float from product_reviews r join products p on p.id = r.product_id where p.merchant_id = "merchants"."id" and r.is_published)`,
      })
      .from(m)
      .where(eq(m.status, "approved"))
      .orderBy(sql`(${m.featuredUntil} > now()) desc nulls last`, asc(m.name));
    return c.json(rows);
  })
  .get("/stores/:slug", async (c) => {
    const m = schema.merchants;
    const [store] = await db
      .select({
        id: m.id,
        name: m.name,
        slug: m.slug,
        ticker: m.ticker,
        tagline: m.tagline,
        logoUrl: m.logoUrl,
        coverUrl: m.coverUrl,
        storefront: m.storefront,
        sells: m.sells,
        featuredUntil: m.featuredUntil,
        branchId: branches.id,
      })
      .from(m)
      .leftJoin(branches, eq(branches.merchantId, m.id))
      .where(and(eq(m.slug, c.req.param("slug")), eq(m.status, "approved")));
    if (!store) throw notFound("Store not found");
    const items = await catalogQuery(and(eq(products.isPublished, true), eq(products.merchantId, store.id))).orderBy(desc(products.createdAt)).limit(200);
    // The store's own categories, most used first
    const counts = new Map<string, number>();
    const cats = await db.select({ c: products.storeCategory }).from(products).where(and(eq(products.merchantId, store.id), eq(products.isPublished, true)));
    for (const { c: name } of cats) if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
    return c.json({ ...store, categories: [...counts].sort((a, b) => b[1] - a[1]).map(([name]) => name), products: items });
  })
  .get("/facets", async (c) => {
    // Brands and price range for the current search / category, to build the filter sheet.
    const rows = await catalogQuery(and(...baseFilters(c.req.query())));
    const brands = new Map<string, number>();
    for (const r of rows) if (r.brand) brands.set(r.brand, (brands.get(r.brand) ?? 0) + 1);
    const prices = rows.map((r) => r.minPrice).filter((p) => p > 0);
    return c.json({
      total: rows.length,
      brands: [...brands].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
      price: { min: prices.length ? Math.min(...prices) : 0, max: prices.length ? Math.max(...prices) : 0 },
    });
  })
  .get("/products/:idOrSlug", async (c) => {
    const key = c.req.param("idOrSlug");
    const isUuid = /^[0-9a-f-]{36}$/i.test(key);
    const [product] = await db
      .select()
      .from(products)
      .where(and(isUuid ? eq(products.id, key) : eq(products.slug, key), eq(products.isPublished, true), fromLiveSeller));
    if (!product) throw notFound("Product not found");
    const { offerFloor: _floor, ...shown } = product;
    const [seller] = product.merchantId
      ? await db
          .select({ id: schema.merchants.id, name: schema.merchants.name, slug: schema.merchants.slug, ticker: schema.merchants.ticker, logoUrl: schema.merchants.logoUrl, branchId: branches.id })
          .from(schema.merchants)
          .leftJoin(branches, eq(branches.merchantId, schema.merchants.id))
          .where(eq(schema.merchants.id, product.merchantId))
      : [];

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

    const { summary } = await loadReviews(product.id);
    return c.json({ ...shown, variants, stock, store: seller ?? null, ratingAverage: summary.count ? summary.average : null, ratingCount: summary.count });
  })
  .get("/products/:idOrSlug/reviews", async (c) => {
    const key = c.req.param("idOrSlug");
    const isUuid = /^[0-9a-f-]{36}$/i.test(key);
    const [product] = await db.select({ id: products.id }).from(products).where(isUuid ? eq(products.id, key) : eq(products.slug, key));
    if (!product) throw notFound("Product not found");
    return c.json(await loadReviews(product.id));
  });
