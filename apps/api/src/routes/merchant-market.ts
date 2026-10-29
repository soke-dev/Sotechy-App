// A marketplace store's own business: products, delivery areas, orders, customers and setup.
// Mounted under /merchant. Everything is scoped to the signed-in owner's store.
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { z } from "zod";
import { db, schema, type Tx } from "../db/client";
import { publicApiUrl } from "../env";
import { audit } from "../lib/audit";
import { requireAuth, type AppEnv } from "../lib/auth";
import { badRequest, conflict, forbidden, notFound } from "../lib/errors";
import { BUSINESS_DOCUMENTS, MIN_BUSINESS_DESCRIPTION, tickerProblem, isMapLink } from "@sotechy/shared";
import { slugify } from "../lib/identity";
import { railBanks } from "../services/payout-rail";
import { buyFeaturing, featuredCount, featuringPayMethods, featuringSettings, proCount, purchasesOf, standardUntil, storeFeatureCount } from "../services/featuring";
import { roleAllows, storeAccess, type StoreRole } from "../services/team";
import { addPayoutAccount, makeDefault, payoutAccountsOf, removePayoutAccount } from "../services/payout-accounts";
import { findCustomer, startWalkIn, walkInsOf } from "../services/walk-in";
import { feePayMethods } from "../services/fee-checkout";
import { storeTokenStats } from "../services/tokens";
import { CHAINS, currentContract } from "../services/chain";
import { answerOffer, storeOffers } from "../services/offers";
import { sendPushLater } from "../services/push";
import { claimPayback, payoutSettings, payoutsFor, toPayoutRow } from "../services/payouts";
import { paybackAccount } from "../services/payback-account";
import { sendEmailLater } from "../lib/email";
import { storePulse } from "../services/pulse";
import { pickupChangeEmail } from "../emails/templates";
import { answerSchema } from "./offers";
import { cancelOrder, updateOrderStatus } from "../services/orders";
import { compressImage } from "../lib/images";

type Store = typeof schema.merchants.$inferSelect;
type StoreEnv = AppEnv & { Variables: { store: Store; storeRole: StoreRole } };

const { products, productVariants, inventory, orders, orderItems, deliveryZones, branches } = schema;

/** Loads the store this account runs (its own, or one it's on the team of) and checks the role allows this */
const withStore = createMiddleware<StoreEnv>(async (c, next) => {
  const access = await storeAccess(c.get("user").id);
  if (!access) throw notFound("You don't have a store yet");
  if (!roleAllows(access.role, c.req.method, c.req.path)) throw forbidden("Your role on this store's team doesn't include this. Ask the owner.");
  c.set("store", access.store);
  c.set("storeRole", access.role);
  await next();
});

/** Selling (products, orders) needs a store Sotechy has approved */
function assertVerified(store: Store) {
  if (store.status === "suspended") throw forbidden("Your store is paused. Email support@sotechy.shop to sort it out.");
  if (store.status !== "approved") throw forbidden("You can do this once Sotechy has verified your store");
}

/** The store's own "branch", where its stock lives. Made the first time it's needed. */
export async function storeBranch(tx: Tx | typeof db, store: Store) {
  const [existing] = await tx.select().from(branches).where(eq(branches.merchantId, store.id));
  if (existing) return existing;
  const [row] = await tx
    .insert(branches)
    .values({ merchantId: store.id, name: store.name, code: `M-${store.slug}`.slice(0, 40), address: "", city: "", state: "", phone: store.contactPhone })
    .returning();
  return row;
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------
const OFFER_HOURS = [6, 12, 24] as const;

const productInput = z.object({
  name: z.string().trim().min(2, "Give the product a name").max(140),
  brand: z.string().trim().max(60).optional().nullable(),
  category: z.string().trim().min(1, "Choose a category").max(60),
  condition: z.enum(["new", "used", "refurbished"]).default("new"),
  description: z.string().trim().max(4000).optional().nullable(),
  warrantyMonths: z.number().int().min(0).max(120).optional().nullable(),
  inTheBox: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  highlights: z.array(z.string().trim().min(1).max(140)).min(1, "Add at least one key feature").max(10),
  specifications: z.record(z.string().trim().min(1).max(60), z.string().trim().min(1).max(200)).refine((s) => Object.keys(s).length > 0, "Add at least one specification"),
  images: z.array(z.string().url()).min(1, "Add at least one photo").max(10),
  price: z.number().positive("Set a price").max(100_000_000),
  compareAt: z.number().positive().max(100_000_000).optional().nullable(),
  /** One stock number, or options (e.g. colours) each with their own stock */
  stock: z.number().int().min(0).max(100_000).default(0),
  options: z.array(z.object({ name: z.string().trim().min(1).max(40), stock: z.number().int().min(0).max(100_000) })).max(20).default([]),
  status: z.enum(["live", "draft", "hidden"]).default("live"),
  negotiable: z.boolean().default(false),
  offerFloor: z.number().positive().optional().nullable(),
  offerHours: z.union([z.literal(6), z.literal(12), z.literal(24)]).optional().nullable(),
  deliveryZoneIds: z.array(z.uuid()).max(50).default([]),
  pickup: z.boolean().default(true),
});
type ProductInput = z.infer<typeof productInput>;

/** A product as the dashboard shows it */
async function productsForDashboard(storeId: string, ids?: string[]) {
  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.merchantId, storeId), isNull(products.deletedAt), ids ? inArray(products.id, ids) : undefined))
    .orderBy(desc(products.createdAt));
  if (!rows.length) return [];
  const variants = await db
    .select({ v: productVariants, quantity: inventory.quantity, reserved: inventory.reserved })
    .from(productVariants)
    .leftJoin(inventory, eq(inventory.variantId, productVariants.id))
    .where(inArray(productVariants.productId, rows.map((r) => r.id)));
  const sold = await db
    .select({ productId: productVariants.productId, qty: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int` })
    .from(orderItems)
    .innerJoin(productVariants, eq(productVariants.id, orderItems.variantId))
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(and(inArray(productVariants.productId, rows.map((r) => r.id)), inArray(orders.status, ["paid", "processing", "dispatched", "ready_for_pickup", "delivered"])))
    .groupBy(productVariants.productId);
  return rows.map((p) => {
    const vs = variants.filter((x) => x.v.productId === p.id && x.v.isActive);
    const first = vs[0]?.v;
    const optionVariants = vs.filter((x) => x.v.name !== "Standard");
    return {
      id: p.id,
      name: p.name,
      brand: p.brand,
      image: p.images[0] ?? null,
      images: p.images,
      category: p.storeCategory ?? "Other",
      condition: p.condition,
      description: p.description,
      warrantyMonths: p.warrantyMonths,
      inTheBox: p.inTheBox,
      highlights: p.highlights,
      specifications: p.specifications,
      price: first?.price ?? 0,
      compareAt: first?.compareAtPrice ?? null,
      stock: vs.reduce((n, x) => n + Math.max((x.quantity ?? 0) - (x.reserved ?? 0), 0), 0),
      options: optionVariants.map((x) => ({ name: x.v.name, stock: Math.max((x.quantity ?? 0) - (x.reserved ?? 0), 0) })),
      status: p.isPublished ? ("live" as const) : p.isHidden ? ("hidden" as const) : ("draft" as const),
      sold: sold.find((s) => s.productId === p.id)?.qty ?? 0,
      negotiable: p.negotiable ? { floor: p.offerFloor, hours: (p.offerHours ?? 12) as (typeof OFFER_HOURS)[number] } : null,
      deliveryZoneIds: p.deliveryZoneIds,
      pickup: p.allowPickup,
      createdAt: p.createdAt,
    };
  });
}

async function uniqueSlug(tx: Tx, base: string) {
  for (let n = 1; ; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const [taken] = await tx.select({ id: products.id }).from(products).where(eq(products.slug, slug));
    if (!taken) return slug;
  }
}

/** Writes a product's variants and stock to match the form: one "Standard" variant, or one per option */
async function syncVariants(tx: Tx, store: Store, productId: string, input: ProductInput) {
  const branch = await storeBranch(tx, store);
  const wanted = input.options.length ? input.options : [{ name: "Standard", stock: input.stock }];
  const existing = await tx.select().from(productVariants).where(eq(productVariants.productId, productId));
  for (const [i, opt] of wanted.entries()) {
    let variant = existing.find((v) => v.name === opt.name);
    if (variant) {
      [variant] = await tx
        .update(productVariants)
        .set({ price: input.price, compareAtPrice: input.compareAt ?? null, isActive: true })
        .where(eq(productVariants.id, variant.id))
        .returning();
    } else {
      [variant] = await tx
        .insert(productVariants)
        .values({ productId, sku: `${store.ticker}-${productId.slice(0, 8)}-${i + 1}-${Date.now().toString(36)}`.toUpperCase(), name: opt.name, price: input.price, compareAtPrice: input.compareAt ?? null })
        .returning();
    }
    // Stock entered is what's available to sell now, on top of anything held for unpaid orders
    const [inv] = await tx.select().from(inventory).where(and(eq(inventory.variantId, variant.id), eq(inventory.branchId, branch.id)));
    if (inv) await tx.update(inventory).set({ quantity: opt.stock + inv.reserved }).where(eq(inventory.id, inv.id));
    else await tx.insert(inventory).values({ variantId: variant.id, branchId: branch.id, quantity: opt.stock });
  }
  // Options taken out of the form stop selling (kept for past orders)
  const gone = existing.filter((v) => !wanted.some((w) => w.name === v.name)).map((v) => v.id);
  if (gone.length) await tx.update(productVariants).set({ isActive: false }).where(inArray(productVariants.id, gone));
}

async function checkZones(storeId: string, ids: string[]) {
  if (!ids.length) return;
  const mine = await db.select({ id: deliveryZones.id }).from(deliveryZones).where(and(eq(deliveryZones.merchantId, storeId), inArray(deliveryZones.id, ids)));
  if (mine.length !== new Set(ids).size) throw badRequest("Choose delivery areas from your own list");
}

function productValues(input: ProductInput) {
  if (input.negotiable && input.offerFloor && input.offerFloor > input.price) throw badRequest("Your lowest offer can't be more than the price");
  if (input.compareAt && input.compareAt <= input.price) throw badRequest("The old price must be higher than the price");
  if (!input.deliveryZoneIds.length && !input.pickup) throw badRequest("Choose at least one delivery area, or allow pickup");
  return {
    name: input.name,
    brand: input.brand || null,
    storeCategory: input.category,
    condition: input.condition,
    description: input.description || null,
    warrantyMonths: input.warrantyMonths ?? null,
    inTheBox: input.inTheBox,
    highlights: input.highlights,
    specifications: input.specifications,
    images: input.images,
    isPublished: input.status === "live",
    isHidden: input.status === "hidden",
    negotiable: input.negotiable,
    offerFloor: input.negotiable ? (input.offerFloor ?? null) : null,
    offerHours: input.negotiable ? (input.offerHours ?? 12) : null,
    deliveryZoneIds: input.deliveryZoneIds,
    allowDelivery: input.deliveryZoneIds.length > 0,
    allowPickup: input.pickup,
  };
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------
/** How the dashboard names an order's stage */
function dashboardStatus(s: (typeof schema.orderStatusEnum.enumValues)[number]) {
  switch (s) {
    case "paid":
      return "new" as const;
    case "processing":
      return "accepted" as const;
    case "dispatched":
    case "ready_for_pickup":
      return "shipped" as const;
    case "delivered":
      return "completed" as const;
    default:
      return "declined" as const; // cancelled, refunded, payment_failed
  }
}

const ACCEPT_HOURS = 24;

async function ordersForDashboard(storeId: string, ids?: string[]) {
  const rows = await db
    .select({ o: orders, name: schema.users.fullName, username: schema.users.username, phone: schema.users.phone, point: schema.deliveryZones.pickupPoint, pointAddress: schema.deliveryZones.pickupAddress })
    .from(orders)
    .leftJoin(schema.users, eq(schema.users.id, orders.customerId))
    .leftJoin(schema.deliveryZones, eq(schema.deliveryZones.id, orders.deliveryZoneId))
    // Unpaid orders aren't the store's business yet
    .where(and(eq(orders.merchantId, storeId), sql`${orders.status} <> 'pending_payment'`, ids ? inArray(orders.id, ids) : undefined))
    .orderBy(desc(orders.createdAt))
    .limit(300);
  if (!rows.length) return [];
  const orderIds = rows.map((r) => r.o.id);
  const [items, history] = await Promise.all([
    db
      .select({ item: orderItems, images: products.images })
      .from(orderItems)
      .leftJoin(productVariants, eq(productVariants.id, orderItems.variantId))
      .leftJoin(products, eq(products.id, productVariants.productId))
      .where(inArray(orderItems.orderId, orderIds)),
    db.select().from(schema.orderStatusHistory).where(inArray(schema.orderStatusHistory.orderId, orderIds)).orderBy(schema.orderStatusHistory.createdAt),
  ]);
  return rows.map(({ o, name, username, phone, point, pointAddress }) => {
    const a = o.deliveryAddress;
    const paidAt = history.find((h) => h.orderId === o.id && h.toStatus === "paid")?.createdAt ?? o.createdAt;
    return {
      id: o.id,
      number: o.orderNumber,
      // Delivered orders wait for the customer to say they got it (or the final payment's wait to pass)
      status:
        o.status === "delivered" && !o.customerConfirmedAt && Date.now() - o.updatedAt.getTime() < 48 * 3_600_000 ? ("delivered" as const) : dashboardStatus(o.status),
      customerConfirmedAt: o.customerConfirmedAt?.toISOString() ?? null,
      customer: {
        name: name ?? a?.recipientName ?? "Customer",
        username: username ?? "",
        phone: a?.phone ?? phone ?? "",
        address: a ? [a.line1, a.line2, a.city, a.state].filter(Boolean).join(", ") : "",
      },
      fulfilment: o.fulfilmentType,
      pickupPoint: o.fulfilmentType === "pickup" ? ((o.pickupChangeStatus === "approved" ? o.pickupChangePoint : (o.pickupSpot ?? [point, pointAddress].filter(Boolean).join(", "))) || undefined) : undefined,
      pickupChange: o.pickupChangePoint && o.pickupChangeStatus ? { point: o.pickupChangePoint, status: o.pickupChangeStatus } : undefined,
      handover: o.handoverTracking || o.handoverPhone ? { tracking: o.handoverTracking, phone: o.handoverPhone } : undefined,
      items: items
        .filter((i) => i.item.orderId === o.id)
        .map((i) => ({ name: i.item.productName, image: i.images?.[0] ?? null, qty: i.item.quantity, price: i.item.unitPrice, option: i.item.variantName !== "Standard" ? i.item.variantName : undefined })),
      subtotal: o.subtotal,
      deliveryFee: o.deliveryFee,
      total: o.total,
      paidWithTokens: 0,
      createdAt: o.createdAt,
      acceptBy: o.status === "paid" ? new Date(new Date(paidAt).getTime() + ACCEPT_HOURS * 3_600_000).toISOString() : undefined,
      history: history.filter((h) => h.orderId === o.id).map((h) => ({ at: h.createdAt, label: h.note ?? h.toStatus, note: undefined as string | undefined })),
    };
  });
}

async function ownOrder(storeId: string, orderId: string) {
  const [o] = await db.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.merchantId, storeId)));
  if (!o) throw notFound("Order not found");
  return o;
}

// ---------------------------------------------------------------------------
// Delivery areas
// ---------------------------------------------------------------------------
/** A pickup area's points as stored: every place, with the first also as the main point */
function pickupColumns(pickup: { fee: number; point: string; address?: string | null; places?: { name: string; address: string; mapUrl?: string | null; fee?: number | null }[] } | null | undefined) {
  if (!pickup) return { pickupFee: null, pickupPoint: null, pickupAddress: null, pickupPlaces: [] };
  const places = pickup.places?.length ? pickup.places : [{ name: pickup.point, address: pickup.address ?? "" }];
  return { pickupFee: pickup.fee, pickupPoint: places[0].name, pickupAddress: places[0].address || null, pickupPlaces: places };
}

/** A store's promo code: a percentage or an amount off its own products */
const storePromoFields = z.object({
  name: z.string().trim().min(2).max(80),
  code: z.string().trim().min(3).max(20).regex(/^[A-Za-z0-9]+$/, "Use letters and numbers only"),
  discountType: z.enum(["percentage", "fixed"]),
  value: z.number().positive().max(1_000_000),
  maxDiscountAmount: z.number().positive().nullable().optional(),
  minOrderAmount: z.number().positive().nullable().optional(),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  usageLimit: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
});
const storePromo = storePromoFields.refine((v) => v.discountType !== "percentage" || v.value <= 90, "A percentage can be up to 90%");

const zoneInput = z.object({
  state: z.string().trim().min(2).max(40),
  areas: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  homeFee: z.number().min(0).max(1_000_000),
  pickup: z
    .object({
      fee: z.number().min(0).max(1_000_000),
      point: z.string().trim().min(3).max(140),
      address: z.string().trim().max(200).optional().nullable(),
      // Up to 5 pickup points in the area; when sent, the first one is `point`/`address`
      places: z.array(z.object({ name: z.string().trim().min(3).max(140), address: z.string().trim().min(3).max(200), fee: z.number().int().min(0).max(1_000_000).nullable().optional(), mapUrl: z.string().trim().max(500).refine(isMapLink, "Paste a Google Maps link").nullable().optional() })).min(1).max(5).optional(),
    })
    .optional()
    .nullable(),
  days: z.string().trim().min(1).max(40),
  freeOver: z.number().positive().max(100_000_000).optional().nullable(),
  active: z.boolean().default(true),
});

const zoneForDashboard = (z: typeof deliveryZones.$inferSelect) => ({
  id: z.id,
  state: z.state,
  areas: z.areas,
  homeFee: z.homeFee,
  pickup:
    z.pickupFee != null && z.pickupPoint
      ? { fee: z.pickupFee, point: z.pickupPoint, address: z.pickupAddress, places: z.pickupPlaces.length ? z.pickupPlaces : [{ name: z.pickupPoint, address: z.pickupAddress ?? "" }] }
      : undefined,
  days: z.days,
  freeOver: z.freeOver ?? undefined,
  active: z.isActive,
  review: z.review,
  reviewNote: z.reviewNote ?? undefined,
});

// ---------------------------------------------------------------------------
// Uploads
// ---------------------------------------------------------------------------
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const DOC_TYPES = [...IMAGE_TYPES, "application/pdf"];

// ---------------------------------------------------------------------------
export const merchantMarketRoutes = new Hono<StoreEnv>()
  .use(requireAuth, withStore)

  // --- Uploads: product photos and storefront images are public; business documents are private ---
  .post("/media", async (c) => {
    const body = await c.req.parseBody({ all: true });
    const files = [body.file].flat().filter((f): f is File => f instanceof File);
    const kind = body.kind === "document" ? "document" : "image";
    if (!files.length) throw badRequest("Choose a file to upload");
    const saved = [];
    for (const file of files.slice(0, 10)) {
      if (!(kind === "document" ? DOC_TYPES : IMAGE_TYPES).includes(file.type)) throw badRequest(`${file.name}: use ${kind === "document" ? "a PDF, JPG or PNG" : "a JPG, PNG or WebP image"}`);
      // Photos can be big (they're shrunk below); documents are kept exactly as sent
      if (file.size > (kind === "document" ? 10 : 15) * 1024 * 1024) throw badRequest(`${file.name} is too large (max ${kind === "document" ? 10 : 15} MB)`);
      const raw = Buffer.from(await file.arrayBuffer());
      const img = kind === "document" ? { data: raw, type: file.type, filename: file.name.slice(0, 200) } : await compressImage(raw, file.type, file.name.slice(0, 200));
      const [row] = await db
        .insert(schema.media)
        .values({ filename: img.filename, contentType: img.type, size: img.data.length, data: img.data, isPrivate: kind === "document", createdBy: c.get("user").id })
        .returning({ id: schema.media.id, filename: schema.media.filename });
      saved.push({ ...row, url: kind === "document" ? `/media/private/${row.id}` : `${publicApiUrl || new URL(c.req.url).origin}/media/${row.id}` });
    }
    return c.json(saved, 201);
  })

  .get("/media/private/:id", async (c) => {
    const [row] = await db.select().from(schema.media).where(and(eq(schema.media.id, c.req.param("id")), eq(schema.media.createdBy, c.get("user").id)));
    if (!row) throw notFound("File not found");
    return c.body(new Uint8Array(row.data), 200, { "Content-Type": row.contentType, "Cache-Control": "private, no-store" });
  })

  // --- Paid featuring ---
  .get("/featuring", async (c) => {
    const store = c.get("store");
    const [settings, taken, proTaken, purchases, mine, payMethods, featuredOnly] = await Promise.all([
      featuringSettings(),
      featuredCount(),
      proCount(),
      purchasesOf(store.id),
      storeFeatureCount(store.id),
      featuringPayMethods(),
      standardUntil(db, store.id),
    ]);
    return c.json({
      ...settings,
      spotsLeft: Math.max(0, settings.maxStores - taken),
      proSpotsLeft: Math.max(0, settings.maxPro - proTaken),
      featuredUntil: store.featuredUntil,
      proUntil: store.proUntil,
      // When the paid Featured months end (they run alongside Pro)
      standardUntil: featuredOnly,
      purchases,
      activeFeatures: mine,
      payMethods,
    });
  })
  .post(
    "/featuring",
    zValidator(
      "json",
      z.object({
        months: z.number().int().min(1).max(3),
        tier: z.enum(["standard", "pro"]).default("standard"),
        method: z.enum(["stablecoin", "bank"]).default("stablecoin"),
        // The store's own Home banner for these months (one per payment)
        banner: z.object({ imageUrl: z.string().url().max(500), title: z.string().trim().max(80).nullable().optional(), ctaLabel: z.string().trim().max(30).nullable().optional() }).optional(),
      }),
    ),
    async (c) => {
      const [owner] = await db.select({ email: schema.users.email, name: schema.users.fullName }).from(schema.users).where(eq(schema.users.id, c.get("user").id));
      const { months, banner, tier, method } = c.req.valid("json");
      return c.json(await buyFeaturing(c.get("store"), months, { email: owner.email, name: owner.name }, banner, tier, method));
    },
  )

  // --- The store's token, and walk-in sales that earn it ---
  .get("/token", async (c) => {
    const stats = await storeTokenStats(c.get("store").id);
    const contract = currentContract("tokens", "monad");
    return c.json(stats ? { ...stats, contractUrl: contract ? `${CHAINS.monad.explorer}/address/${contract.address}` : null } : null);
  })
  .get("/walk-in/customer", async (c) => c.json(await findCustomer(c.req.query("q") ?? "")))
  .get("/walk-in", async (c) => c.json(await walkInsOf(c.get("store").id)))
  /** How the fee can be paid right now */
  .get("/walk-in/pay-methods", async (c) => c.json(await feePayMethods()))
  .post("/walk-in", zValidator("json", z.object({ customer: z.string().min(3).max(60), amount: z.number().positive().max(100_000_000), note: z.string().max(200).optional(), method: z.enum(["stablecoin", "bank"]).default("stablecoin") })), async (c) => {
    const [me] = await db.select({ id: schema.users.id, email: schema.users.email, name: schema.users.fullName }).from(schema.users).where(eq(schema.users.id, c.get("user").id));
    return c.json(await startWalkIn(c.get("store"), me, c.req.valid("json")), 201);
  })

  // --- Reviews of the store's products, and its replies ---
  .get("/reviews", async (c) => {
    const r = schema.productReviews;
    const rows = await db
      .select({ id: r.id, rating: r.rating, title: r.title, body: r.body, verified: r.verified, createdAt: r.createdAt, reply: r.storeReply, repliedAt: r.storeRepliedAt, product: products.name, productImage: products.images, customer: schema.users.fullName })
      .from(r)
      .innerJoin(products, eq(products.id, r.productId))
      .innerJoin(schema.users, eq(schema.users.id, r.userId))
      .where(and(eq(products.merchantId, c.get("store").id), eq(r.isPublished, true)))
      .orderBy(desc(r.createdAt))
      .limit(300);
    return c.json(rows.map(({ productImage, ...x }) => ({ ...x, productImage: productImage?.[0] ?? null })));
  })
  .post("/reviews/:id/reply", zValidator("json", z.object({ text: z.string().trim().min(2).max(600) })), async (c) => {
    const r = schema.productReviews;
    const [review] = await db.select({ id: r.id, merchantId: products.merchantId }).from(r).innerJoin(products, eq(products.id, r.productId)).where(eq(r.id, c.req.param("id")));
    if (!review || review.merchantId !== c.get("store").id) throw notFound("Review not found");
    await db.update(r).set({ storeReply: c.req.valid("json").text, storeRepliedAt: new Date() }).where(eq(r.id, review.id));
    return c.json({ ok: true });
  })

  // --- Messages to followers ---
  .get("/notices", async (c) => {
    const store = c.get("store");
    const [followers] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.storeFollows).where(eq(schema.storeFollows.merchantId, store.id));
    const rows = await db.select().from(schema.storeNotices).where(eq(schema.storeNotices.merchantId, store.id)).orderBy(desc(schema.storeNotices.createdAt)).limit(100);
    return c.json({ followers: followers?.n ?? 0, notices: rows });
  })
  .post(
    "/notices",
    zValidator("json", z.object({ title: z.string().trim().min(3).max(60), body: z.string().trim().min(5).max(240), productId: z.uuid().nullable().optional() })),
    async (c) => {
      const store = c.get("store");
      assertVerified(store);
      const input = c.req.valid("json");
      // A few messages a day keeps followers following
      const [recent] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(schema.storeNotices)
        .where(and(eq(schema.storeNotices.merchantId, store.id), gte(schema.storeNotices.createdAt, new Date(Date.now() - 86_400_000))));
      if ((recent?.n ?? 0) >= 3) throw badRequest("You can send three messages a day. Try again tomorrow.");
      let productSlug: string | null = null;
      if (input.productId) {
        const [p] = await db.select({ slug: products.slug, merchantId: products.merchantId }).from(products).where(eq(products.id, input.productId));
        if (!p || p.merchantId !== store.id) throw badRequest("Choose one of your products");
        productSlug = p.slug;
      }
      const followers = await db.select({ userId: schema.storeFollows.userId }).from(schema.storeFollows).where(eq(schema.storeFollows.merchantId, store.id));
      const [notice] = await db.insert(schema.storeNotices).values({ merchantId: store.id, title: input.title, body: input.body, productId: input.productId ?? null, sentTo: followers.length }).returning();
      sendPushLater(
        followers.map((f) => f.userId),
        { title: `${store.name}: ${input.title}`, body: input.body, data: { url: productSlug ? `/product/${productSlug}` : `/store/${store.slug}` } },
      );
      return c.json(notice, 201);
    },
  )

  // --- Price offers from customers ---
  .get("/offers", async (c) => c.json(await storeOffers(c.get("store").id)))
  .get("/offers/:id", async (c) => {
    const [offer] = await storeOffers(c.get("store").id, c.req.param("id"));
    if (!offer) throw notFound("Offer not found");
    return c.json(offer);
  })
  .post("/offers/:id/answer", zValidator("json", answerSchema), async (c) => c.json(await answerOffer(c.req.param("id"), { side: "store", merchantId: c.get("store").id }, c.req.valid("json"))))

  /** Whether a ticker is free for this store's token */
  .get("/ticker/:ticker", async (c) => {
    const t = c.req.param("ticker").toUpperCase().replace(/^\$/, "");
    const store = c.get("store");
    if (t === store.ticker) return c.json({ ticker: t, available: true, reason: null });
    const problem = tickerProblem(t);
    if (problem) return c.json({ ticker: t, available: false, reason: problem });
    const [taken] = await db.select({ id: schema.merchants.id }).from(schema.merchants).where(eq(schema.merchants.ticker, t));
    return c.json({ ticker: t, available: !taken, reason: taken ? "Another store has it" : null });
  })

  // --- Payouts: the account they go to, and what's been paid ---
  .get("/banks", async (c) => c.json(await railBanks()))
  /** Setup's single account: checked with the bank, added, and made the default */
  .put(
    "/payout-account",
    zValidator("json", z.object({ bankCode: z.string().trim().min(2).max(10), accountNumber: z.string().regex(/^\d{10}$/, "Account numbers have 10 digits") })),
    async (c) => c.json(await addPayoutAccount(c.get("store"), c.get("user").id, { ...c.req.valid("json"), makeDefault: true })),
  )
  /** Up to 3 accounts; payouts always go to the default */
  .get("/payout-accounts", async (c) => c.json(await payoutAccountsOf(c.get("store").id)))
  .post(
    "/payout-accounts",
    zValidator("json", z.object({ bankCode: z.string().trim().min(2).max(10), accountNumber: z.string().regex(/^\d{10}$/, "Account numbers have 10 digits"), makeDefault: z.boolean().optional() })),
    async (c) => c.json(await addPayoutAccount(c.get("store"), c.get("user").id, c.req.valid("json")), 201),
  )
  .post("/payout-accounts/:id/default", async (c) => {
    await makeDefault(c.get("store"), c.get("user").id, c.req.param("id"));
    return c.json(await payoutAccountsOf(c.get("store").id));
  })
  .delete("/payout-accounts/:id", async (c) => {
    await removePayoutAccount(c.get("store"), c.get("user").id, c.req.param("id"));
    return c.json(await payoutAccountsOf(c.get("store").id));
  })
  .get("/payouts", async (c) => {
    const store = c.get("store");
    const settings = await payoutSettings();
    const rows = await payoutsFor({ merchantId: store.id });
    return c.json({ payouts: rows.map(toPayoutRow), plan: store.payoutPlan ?? settings.standard, feeRate: settings.feeRate, finalAfterHours: settings.finalAfterHours });
  })

  // --- Store details, changed only once Sotechy approves ---
  .put(
    "/profile-change",
    zValidator(
      "json",
      z.object({
        name: z.string().trim().min(2, "Give your store a name").max(60),
        tagline: z.string().trim().max(90).nullable().optional(),
        sells: z.array(z.string().trim().min(1).max(40)).min(1, "Choose what you sell").max(3),
        socials: z.object({
          instagram: z.string().trim().max(100).nullable().optional(),
          x: z.string().trim().max(100).nullable().optional(),
          facebook: z.string().trim().max(200).nullable().optional(),
          tiktok: z.string().trim().max(100).nullable().optional(),
        }),
        website: z.string().trim().max(200).nullable().optional(),
      }),
    ),
    async (c) => {
      const store = c.get("store");
      const v = c.req.valid("json");
      const clean = (x: string | null | undefined) => x?.trim() || null;
      const change = {
        name: v.name,
        tagline: clean(v.tagline),
        sells: v.sells,
        socials: { instagram: clean(v.socials.instagram), x: clean(v.socials.x), facebook: clean(v.socials.facebook), tiktok: clean(v.socials.tiktok) },
        website: clean(v.website),
      };
      const now = store.application?.socials ?? {};
      const same =
        change.name === store.name &&
        change.tagline === (store.tagline ?? null) &&
        change.sells.join("|") === store.sells.join("|") &&
        (["instagram", "x", "facebook", "tiktok"] as const).every((k) => change.socials[k] === (now[k] || null)) &&
        change.website === (store.application?.website || null);
      if (same) throw badRequest("Nothing has changed yet");
      const [row] = await db
        .update(schema.merchants)
        .set({ profileChange: change, profileChangeStatus: "pending", profileChangeNote: null, profileChangeAt: new Date(), updatedAt: new Date() })
        .where(eq(schema.merchants.id, store.id))
        .returning();
      await audit(db, { actorId: c.get("user").id, action: "merchant.profile_change", entityType: "merchant", entityId: store.id, details: change });
      return c.json(row);
    },
  )
  /** Takes back a request that's waiting, or clears a declined one */
  .delete("/profile-change", async (c) => {
    const [row] = await db
      .update(schema.merchants)
      .set({ profileChange: null, profileChangeStatus: null, profileChangeNote: null, profileChangeAt: null })
      .where(eq(schema.merchants.id, c.get("store").id))
      .returning();
    return c.json(row);
  })

  // --- Storefront look ---
  .patch(
    "/storefront",
    zValidator(
      "json",
      z.object({
        logoUrl: z.string().url().nullable().optional(),
        coverUrl: z.string().url().nullable().optional(),
        storefront: z
          .object({
            themeId: z.string().max(30),
            accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
            hero: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
            header: z.enum(["cover", "band"]),
            layout: z.enum(["grid", "large"]),
            announcement: z.string().trim().max(80).nullable().optional(),
          })
          .optional(),
      }),
    ),
    async (c) => {
      const [row] = await db.update(schema.merchants).set({ ...c.req.valid("json"), updatedAt: new Date() }).where(eq(schema.merchants.id, c.get("store").id)).returning();
      return c.json(row);
    },
  )

  // --- Setup for review ---
  .put(
    "/application",
    zValidator(
      "json",
      z.object({
        sellerKind: z.enum(["registered", "individual"]),
        // Saved step by step, so only required when it's submitted
        sells: z.array(z.string().trim().min(1).max(40)).max(3).default([]),
        structure: z.enum(["BN", "LTD", "PLC", "IT"]).nullable().optional(),
        registeredName: z.string().trim().max(160).nullable().optional(),
        registrationNumber: z.string().trim().max(30).nullable().optional(),
        registeredOn: z.string().max(20).nullable().optional(),
        tin: z.string().trim().max(30).nullable().optional(),
        businessAddress: z.string().trim().max(200).nullable().optional(),
        businessMapUrl: z.string().trim().max(500).refine(isMapLink, "Paste a Google Maps link").nullable().optional(),
        documents: z.record(z.string().max(60), z.string().max(200)).default({}),
        people: z.array(z.object({ name: z.string().trim().min(1).max(120), role: z.string().max(60), share: z.number().min(0).max(100) })).max(20).default([]),
        bank: z.object({ bankName: z.string().min(2).max(60), accountNumber: z.string().regex(/^\d{10}$/, "Account numbers have 10 digits") }).nullable().optional(),
        description: z.string().trim().max(1000).nullable().optional(),
        website: z.string().trim().max(200).nullable().optional(),
        socials: z
          .object({ instagram: z.string().trim().max(100).nullable().optional(), x: z.string().trim().max(100).nullable().optional(), facebook: z.string().trim().max(200).nullable().optional(), tiktok: z.string().trim().max(100).nullable().optional() })
          .nullable()
          .optional(),
        ticker: z.string().trim().max(9).nullable().optional(),
        submit: z.boolean().default(false),
      }),
    ),
    async (c) => {
      const { sellerKind, sells, submit, ticker: asked, ...application } = c.req.valid("json");
      const store = c.get("store");
      if (submit && store.status === "declined") throw forbidden("Your store wasn't approved. Email support@sotechy.shop if things have changed.");

      // The store names its own token, until Sotechy approves it
      let ticker = store.ticker;
      let tickerChosen = store.application?.tickerChosen ?? false;
      if (asked) {
        const t = asked.toUpperCase().replace(/^\$/, "");
        if (t !== store.ticker) {
          if (store.tokenApprovedAt) throw badRequest("Your token is already created. Ask Sotechy if you need to rename it.");
          const problem = tickerProblem(t);
          if (problem) throw badRequest(`Ticker: ${problem}`);
          const [taken] = await db.select({ id: schema.merchants.id }).from(schema.merchants).where(eq(schema.merchants.ticker, t));
          if (taken) throw conflict(`$${t} is taken. Try another ticker.`);
          ticker = t;
        }
        tickerChosen = true;
      }

      if (submit) {
        const kyc = store.kycStatus;
        const docs = sellerKind === "registered" ? BUSINESS_DOCUMENTS[application.structure ?? "LTD"].filter((d) => !d.optional) : [];
        const missingDoc = docs.find((d) => !application.documents[d.name]);
        const shares = application.people.reduce((n, p) => n + p.share, 0);
        const problem = !sells.length
          ? "Choose what you sell"
          : (application.description ?? "").length < MIN_BUSINESS_DESCRIPTION
            ? `Describe your business in at least ${MIN_BUSINESS_DESCRIPTION} characters`
            : !tickerChosen
              ? "Choose your token's ticker"
              : sellerKind === "registered" && (!application.structure || !application.registeredName || !application.registrationNumber || !application.businessAddress)
                ? "Fill in your business details"
                : missingDoc
                  ? `Upload your ${missingDoc.name}`
                  : sellerKind === "registered" && (!application.people.length || shares > 100)
                    ? "List your directors and owners (shares can't add up to more than 100%)"
                    : kyc !== "in_review" && kyc !== "approved"
                      ? "Finish your ID check"
                      : !store.payoutVerifiedAt
                        ? "Add and check your payout account"
                        : null;
        if (problem) throw badRequest(`${problem} before submitting.`);
      }
      const [row] = await db
        .update(schema.merchants)
        .set({ sellerKind, sells, ticker, application: { ...application, tickerChosen }, updatedAt: new Date(), ...(submit && { submittedAt: new Date(), reviewNote: null, reviewNoteAt: null }) })
        .where(eq(schema.merchants.id, store.id))
        .returning();
      if (submit) await audit(db, { actorId: c.get("user").id, action: "merchant.submitted", entityType: "merchant", entityId: store.id });
      return c.json(row);
    },
  )

  // --- Products ---
  .get("/products", async (c) => c.json(await productsForDashboard(c.get("store").id)))
  .get("/products/:id", async (c) => {
    const [p] = await productsForDashboard(c.get("store").id, [c.req.param("id")]);
    if (!p) throw notFound("Product not found");
    return c.json(p);
  })
  .post("/products", zValidator("json", productInput), async (c) => {
    const store = c.get("store");
    assertVerified(store);
    const input = c.req.valid("json");
    await checkZones(store.id, input.deliveryZoneIds);
    const id = await db.transaction(async (tx) => {
      const [p] = await tx
        .insert(products)
        .values({ ...productValues(input), merchantId: store.id, slug: await uniqueSlug(tx, `${store.slug}-${slugify(input.name)}`.slice(0, 80)) })
        .returning({ id: products.id });
      await syncVariants(tx, store, p.id, input);
      return p.id;
    });
    const [p] = await productsForDashboard(store.id, [id]);
    return c.json(p, 201);
  })
  .put("/products/:id", zValidator("json", productInput), async (c) => {
    const store = c.get("store");
    assertVerified(store);
    const input = c.req.valid("json");
    const id = c.req.param("id");
    const [own] = await db.select({ id: products.id }).from(products).where(and(eq(products.id, id), eq(products.merchantId, store.id), isNull(products.deletedAt)));
    if (!own) throw notFound("Product not found");
    await checkZones(store.id, input.deliveryZoneIds);
    await db.transaction(async (tx) => {
      await tx.update(products).set(productValues(input)).where(eq(products.id, id));
      await syncVariants(tx, store, id, input);
    });
    const [p] = await productsForDashboard(store.id, [id]);
    return c.json(p);
  })

  /** A copy to edit: a draft with no stock, so nothing sells before it's checked */
  .post("/products/:id/duplicate", async (c) => {
    const store = c.get("store");
    assertVerified(store);
    const [src] = await db.select().from(products).where(and(eq(products.id, c.req.param("id")), eq(products.merchantId, store.id), isNull(products.deletedAt)));
    if (!src) throw notFound("Product not found");
    const variants = await db.select().from(productVariants).where(and(eq(productVariants.productId, src.id), eq(productVariants.isActive, true)));
    const id = await db.transaction(async (tx) => {
      const { id: _id, slug: _slug, createdAt: _c, updatedAt: _u, ...rest } = src;
      const name = `${src.name} (copy)`.slice(0, 140);
      const [p] = await tx
        .insert(products)
        .values({ ...rest, name, isPublished: false, isHidden: false, deletedAt: null, slug: await uniqueSlug(tx, `${store.slug}-${slugify(name)}`.slice(0, 80)) })
        .returning({ id: products.id });
      const first = variants[0];
      const options = variants.filter((v) => v.name !== "Standard").map((v) => ({ name: v.name, stock: 0 }));
      await syncVariants(tx, store, p.id, { price: first?.price ?? 0, compareAt: first?.compareAtPrice ?? null, stock: 0, options } as ProductInput);
      return p.id;
    });
    await audit(db, { actorId: c.get("user").id, action: "product.duplicate", entityType: "product", entityId: id, details: { from: src.id } });
    const [p] = await productsForDashboard(store.id, [id]);
    return c.json(p, 201);
  })
  /**
   * One change to several products: make them live, hide them from the store, mark them out of stock, or delete
   * them. A product that has sold is kept for its orders (taken off the store and out of the dashboard).
   */
  .post(
    "/products/actions",
    zValidator("json", z.object({ ids: z.array(z.uuid()).min(1).max(200), action: z.enum(["live", "hidden", "out_of_stock", "delete"]) })),
    async (c) => {
      const store = c.get("store");
      const { ids, action } = c.req.valid("json");
      if (action === "live") assertVerified(store);
      const mine = await db.select({ id: products.id }).from(products).where(and(eq(products.merchantId, store.id), isNull(products.deletedAt), inArray(products.id, ids)));
      const own = mine.map((p) => p.id);
      if (!own.length) throw notFound("Product not found");
      let deleted = 0;
      let archived = 0;
      if (action === "live" || action === "hidden") {
        await db.update(products).set({ isPublished: action === "live", isHidden: action === "hidden" }).where(inArray(products.id, own));
      } else if (action === "out_of_stock") {
        // Nothing left to sell; stock held for unpaid orders stays held
        const branch = await storeBranch(db, store);
        const vs = await db.select({ id: productVariants.id }).from(productVariants).where(inArray(productVariants.productId, own));
        if (vs.length) await db.update(inventory).set({ quantity: inventory.reserved }).where(and(eq(inventory.branchId, branch.id), inArray(inventory.variantId, vs.map((v) => v.id))));
      } else {
        for (const id of own) {
          try {
            // Gone for good when nothing points at it; a product with orders can't be removed
            await db.transaction((tx) => tx.delete(products).where(eq(products.id, id)));
            deleted++;
          } catch {
            await db.update(products).set({ deletedAt: new Date(), isPublished: false, isHidden: true }).where(eq(products.id, id));
            archived++;
          }
        }
      }
      await audit(db, { actorId: c.get("user").id, action: `product.bulk_${action}`, entityType: "product", details: { ids: own, deleted, archived } });
      return c.json({ done: own.length, deleted, archived });
    },
  )

  // --- Delivery areas (each new area or change in coverage waits for Sotechy) ---
  .get("/delivery-zones", async (c) => {
    const rows = await db.select().from(deliveryZones).where(eq(deliveryZones.merchantId, c.get("store").id)).orderBy(deliveryZones.createdAt);
    return c.json(rows.map(zoneForDashboard));
  })
  .post("/delivery-zones", zValidator("json", zoneInput), async (c) => {
    const z = c.req.valid("json");
    const [row] = await db
      .insert(deliveryZones)
      .values({ merchantId: c.get("store").id, state: z.state, areas: z.areas, homeFee: z.homeFee, ...pickupColumns(z.pickup), days: z.days, freeOver: z.freeOver ?? null, isActive: z.active })
      .returning();
    return c.json(zoneForDashboard(row), 201);
  })
  .put("/delivery-zones/:id", zValidator("json", zoneInput), async (c) => {
    const z = c.req.valid("json");
    const [before] = await db.select().from(deliveryZones).where(and(eq(deliveryZones.id, c.req.param("id")), eq(deliveryZones.merchantId, c.get("store").id)));
    if (!before) throw notFound("Delivery area not found");
    // A different state, list of areas or pickup location needs checking again; prices and days don't
    const coverageChanged =
      before.state !== z.state ||
      before.areas.join("|") !== z.areas.join("|") ||
      // (a pickup point's own price is a price, so it doesn't count)
      JSON.stringify((before.pickupPlaces ?? []).map(({ fee: _f, ...pl }) => pl)) !== JSON.stringify(pickupColumns(z.pickup).pickupPlaces.map(({ fee: _f, ...pl }) => pl));
    const [row] = await db
      .update(deliveryZones)
      .set({ state: z.state, areas: z.areas, homeFee: z.homeFee, ...pickupColumns(z.pickup), days: z.days, freeOver: z.freeOver ?? null, isActive: z.active, ...(coverageChanged && { review: "pending" as const, reviewNote: null }) })
      .where(eq(deliveryZones.id, before.id))
      .returning();
    return c.json(zoneForDashboard(row));
  })
  .delete("/delivery-zones/:id", async (c) => {
    const [row] = await db.delete(deliveryZones).where(and(eq(deliveryZones.id, c.req.param("id")), eq(deliveryZones.merchantId, c.get("store").id))).returning({ id: deliveryZones.id });
    if (!row) throw notFound("Delivery area not found");
    return c.json({ deleted: true });
  })

  // --- Orders ---
  .get("/orders", async (c) => c.json(await ordersForDashboard(c.get("store").id)))
  .get("/orders/:id", async (c) => {
    const store = c.get("store");
    const [o] = await ordersForDashboard(store.id, [c.req.param("id")]);
    if (!o) throw notFound("Order not found");
    const settings = await payoutSettings();
    const mp = schema.merchantPayouts;
    const [payback] = await db
      .select({ amount: mp.amount, status: mp.status, claimedAt: mp.paybackClaimedAt, reference: mp.paybackReference })
      .from(mp)
      .where(and(eq(mp.orderId, o.id), eq(mp.merchantId, store.id), eq(mp.stage, "payback")));
    const paid = await db
      .select({ stage: mp.stage, amount: mp.amount, status: mp.status, dueAt: mp.dueAt, paidAt: mp.paidAt })
      .from(mp)
      .where(and(eq(mp.orderId, o.id), eq(mp.merchantId, store.id)));
    return c.json({
      ...o,
      payoutTerms: { plan: store.payoutPlan ?? settings.standard, feeRate: settings.feeRate, finalAfterHours: settings.finalAfterHours },
      payouts: paid.filter((p) => p.stage !== "payback").map((p) => ({ ...p, dueAt: p.dueAt.toISOString(), paidAt: p.paidAt?.toISOString() ?? null })),
      // Money the store owes back for this order, and where to send it
      ...(payback && {
        status: payback.status === "owed" ? "payback" : o.status,
        payback: { amount: payback.amount, settled: payback.status === "settled", claimedAt: payback.claimedAt?.toISOString() ?? null, reference: payback.reference },
        paybackAccount: await paybackAccount(),
      }),
    });
  })
  .post(
    "/orders/:id/:action",
    zValidator(
      "json",
      z
        .object({
          note: z.string().trim().max(300).optional(),
          // Sending a pickup order to its pickup point
          tracking: z.string().trim().max(60).optional(),
          driverPhone: z.string().trim().max(20).regex(/^[\d+\s()-]*$/, "Enter a phone number").optional(),
        })
        .default({}),
    ),
    async (c) => {
    const store = c.get("store");
    const action = c.req.param("action");
    const o = await ownOrder(store.id, c.req.param("id"));
    const actor = c.get("user");
    const { note, tracking, driverPhone } = c.req.valid("json");
    if (action === "accept") {
      if (o.status !== "paid") throw conflict("This order can't be accepted now");
      await updateOrderStatus(actor, o.id, "processing", note ?? "Store accepted the order");
    } else if (action === "payback-sent") {
      // The store sent back money for a cancelled order; an admin checks it arrived
      await claimPayback(store.id, o.id, note?.trim() || null);
    } else if (action === "pickup-change") {
      // Handing it over somewhere else needs Sotechy's approval first
      const point = note?.trim();
      if (o.fulfilmentType !== "pickup") throw badRequest("Only pickup orders have a pickup location");
      if (o.status !== "processing") throw conflict("You can change where it's collected before it's ready");
      if (!point || point.length < 5) throw badRequest("Enter the new pickup location");
      await db.update(orders).set({ pickupChangePoint: point, pickupChangeStatus: "pending", pickupChangeAt: new Date() }).where(eq(orders.id, o.id));
      const [zone] = o.deliveryZoneId ? await db.select({ point: schema.deliveryZones.pickupPoint }).from(schema.deliveryZones).where(eq(schema.deliveryZones.id, o.deliveryZoneId)) : [];
      const admins = await db.select({ email: schema.users.email, name: schema.users.fullName }).from(schema.users).where(eq(schema.users.role, "admin"));
      for (const a of admins) sendEmailLater(pickupChangeEmail(a.email, { name: a.name, store: store.name, orderNumber: o.orderNumber, from: zone?.point ?? null, to: point }));
    } else if (action === "ship") {
      if (o.status !== "processing") throw conflict("Accept the order first");
      if (o.pickupChangeStatus === "pending") throw conflict("Wait for the new pickup location to be approved, or use your approved one");
      if (o.fulfilmentType === "pickup") {
        // How it reaches the pickup point the customer chose, so they can follow it
        const t = tracking?.trim() || null;
        const p = driverPhone?.trim() || null;
        await db.update(orders).set({ handoverTracking: t, handoverPhone: p }).where(eq(orders.id, o.id));
        const where = o.pickupSpot ?? null;
        const parts = [where ? `Ready for pickup at ${where}` : "Ready for pickup", t && `Tracking number: ${t}`, p && `Driver's phone: ${p}`].filter(Boolean);
        await updateOrderStatus(actor, o.id, "ready_for_pickup", note ?? parts.join(" · "));
      } else {
        await updateOrderStatus(actor, o.id, "dispatched", note ?? "On its way");
      }
    } else if (action === "deliver") {
      if (o.status !== "dispatched" && o.status !== "ready_for_pickup") throw conflict("Send the order first");
      await updateOrderStatus(actor, o.id, "delivered", note ?? (o.fulfilmentType === "pickup" ? "Collected" : "Delivered"));
    } else if (action === "decline") {
      if (o.status !== "paid" && o.status !== "processing") throw conflict("This order can't be declined now");
      await cancelOrder(actor, o.id, note ?? "The store couldn't fill this order", { asStoreId: store.id });
    } else {
      throw notFound("Unknown action");
    }
    const [updated] = await ordersForDashboard(store.id, [o.id]);
    return c.json(updated);
  },
  )

  // --- Customers: everyone who has bought from the store ---
  .get("/customers", async (c) => {
    const rows = await db
      .select({
        userId: orders.customerId,
        name: schema.users.fullName,
        username: schema.users.username,
        phone: schema.users.phone,
        orders: sql<number>`count(*)::int`,
        spent: sql<number>`coalesce(sum(${orders.total}), 0)::float`,
        lastOrderAt: sql<string>`max(${orders.createdAt})`,
        firstOrderAt: sql<string>`min(${orders.createdAt})`,
        following: sql<boolean>`exists (select 1 from store_follows f where f.user_id = ${orders.customerId} and f.merchant_id = ${c.get("store").id})`,
      })
      .from(orders)
      .innerJoin(schema.users, eq(schema.users.id, orders.customerId))
      .where(and(eq(orders.merchantId, c.get("store").id), inArray(orders.status, ["paid", "processing", "dispatched", "ready_for_pickup", "delivered"])))
      .groupBy(orders.customerId, schema.users.fullName, schema.users.username, schema.users.phone)
      .orderBy(desc(sql`max(${orders.createdAt})`));
    return c.json(rows);
  })

  // --- The store's own promo codes (it gives the discount) ---
  .get("/promotions", async (c) => {
    const p = schema.promotions;
    return c.json(await db.select().from(p).where(eq(p.merchantId, c.get("store").id)).orderBy(desc(p.createdAt)));
  })
  .post("/promotions", zValidator("json", storePromo), async (c) => {
    const input = c.req.valid("json");
    const code = input.code.trim().toUpperCase();
    const [taken] = await db.select({ id: schema.promotions.id }).from(schema.promotions).where(sql`upper(${schema.promotions.code}) = ${code}`);
    if (taken) throw conflict("That code is already used on Sotechy. Try another.");
    const [row] = await db.insert(schema.promotions).values({ ...input, code, merchantId: c.get("store").id }).returning();
    return c.json(row, 201);
  })
  .patch("/promotions/:id", zValidator("json", storePromoFields.partial()), async (c) => {
    const input = c.req.valid("json");
    const [row] = await db
      .update(schema.promotions)
      .set({ ...input, ...(input.code && { code: input.code.trim().toUpperCase() }) })
      .where(and(eq(schema.promotions.id, c.req.param("id")), eq(schema.promotions.merchantId, c.get("store").id)))
      .returning();
    if (!row) throw notFound("Promo code not found");
    return c.json(row);
  })
  .delete("/promotions/:id", async (c) => {
    const [row] = await db.delete(schema.promotions).where(and(eq(schema.promotions.id, c.req.param("id")), eq(schema.promotions.merchantId, c.get("store").id))).returning({ id: schema.promotions.id });
    if (!row) throw notFound("Promo code not found");
    return c.json({ ok: true });
  })
  /** Changes since the dashboard last looked, so open pages refresh by themselves */
  .get("/summary/pulse", async (c) => c.json({ v: await storePulse(c.get("store").id) }))
  // --- The bell: what needs the store now, and the latest goings-on (under /summary so every role can read it) ---
  .get("/summary/attention", async (c) => {
    const storeId = c.get("store").id;
    const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;
    const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
    const [byStatus, offersWaiting, issues, pickupAnswers, history, paid, offerRows] = await Promise.all([
      db.select({ status: orders.status, fulfilment: orders.fulfilmentType, n: sql<number>`count(*)::int` }).from(orders).where(eq(orders.merchantId, storeId)).groupBy(orders.status, orders.fulfilmentType),
      db.select({ n: sql<number>`count(*)::int` }).from(schema.offers).where(and(eq(schema.offers.merchantId, storeId), eq(schema.offers.status, "waiting_store"))),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(orders)
        .where(and(eq(orders.merchantId, storeId), eq(orders.status, "delivered"), sql`${orders.customerIssueAt} is not null`, sql`${orders.customerConfirmedAt} is null`)),
      db.select({ id: orders.id, number: orders.orderNumber, status: orders.pickupChangeStatus, point: orders.pickupChangePoint, at: orders.updatedAt }).from(orders).where(and(eq(orders.merchantId, storeId), eq(orders.status, "processing"), inArray(orders.pickupChangeStatus, ["approved", "declined"]))),
      db
        .select({ id: schema.orderStatusHistory.id, orderId: orders.id, number: orders.orderNumber, fulfilment: orders.fulfilmentType, total: orders.subtotal, from: schema.orderStatusHistory.fromStatus, to: schema.orderStatusHistory.toStatus, note: schema.orderStatusHistory.note, at: schema.orderStatusHistory.createdAt })
        .from(schema.orderStatusHistory)
        .innerJoin(orders, eq(orders.id, schema.orderStatusHistory.orderId))
        .where(and(eq(orders.merchantId, storeId), sql`${schema.orderStatusHistory.toStatus} <> 'pending_payment'`, sql`${schema.orderStatusHistory.toStatus} <> 'payment_failed'`))
        .orderBy(desc(schema.orderStatusHistory.createdAt))
        .limit(12),
      db
        .select({ id: schema.merchantPayouts.id, amount: schema.merchantPayouts.amount, stage: schema.merchantPayouts.stage, paidAt: schema.merchantPayouts.paidAt, number: orders.orderNumber })
        .from(schema.merchantPayouts)
        .innerJoin(orders, eq(orders.id, schema.merchantPayouts.orderId))
        .where(and(eq(schema.merchantPayouts.merchantId, storeId), eq(schema.merchantPayouts.status, "paid")))
        .orderBy(desc(schema.merchantPayouts.paidAt))
        .limit(5),
      db
        .select({ id: schema.offers.id, status: schema.offers.status, amount: schema.offers.lastAmount, at: schema.offers.updatedAt, product: schema.products.name })
        .from(schema.offers)
        .innerJoin(schema.products, eq(schema.products.id, schema.offers.productId))
        .where(eq(schema.offers.merchantId, storeId))
        .orderBy(desc(schema.offers.updatedAt))
        .limit(5),
    ]);
    const count = (status: string, fulfilment?: string) => byStatus.filter((r) => r.status === status && (!fulfilment || r.fulfilment === fulfilment)).reduce((n, r) => n + r.n, 0);
    const newOrders = count("paid");
    const toSend = count("processing");
    const offers = offersWaiting[0]?.n ?? 0;
    const problems = issues[0]?.n ?? 0;
    const needs = [
      newOrders && { key: "new", count: newOrders, title: plural(newOrders, "new order"), hint: "Accept within 24 hours", href: "/orders", illo: "box" },
      offers && { key: "offers", count: offers, title: plural(offers, "price offer"), hint: "Accept, counter or decline", href: "/offers", illo: "tag" },
      toSend && { key: "send", count: toSend, title: `${plural(toSend, "order")} to send`, hint: "Ship them, or get them ready for pickup", href: "/orders", illo: "bike" },
      problems && { key: "issues", count: problems, title: `${plural(problems, "customer")} didn't get their order`, hint: "Sotechy is checking; your final payment waits", href: "/orders", illo: "chat" },
      ...pickupAnswers.map((p) => ({
        key: `pickup-${p.id}`,
        count: 1,
        title: p.status === "approved" ? `${p.number}: new pickup location approved` : `${p.number}: pickup location declined`,
        hint: p.status === "approved" ? `Collect at ${p.point}. Mark it ready when it is.` : "Use your approved pickup location",
        href: `/orders/${p.id}`,
        illo: "pin",
      })),
    ].filter(Boolean) as { key: string; count: number; title: string; hint: string; href: string; illo: string }[];

    const STEP: Record<string, (h: (typeof history)[number]) => { title: string; illo: string }> = {
      paid: (h) => ({ title: `New order ${h.number} · ${naira(h.total)}`, illo: "box" }),
      processing: (h) => ({ title: `You accepted ${h.number}`, illo: "box" }),
      dispatched: (h) => ({ title: `${h.number} is on its way`, illo: "bike" }),
      ready_for_pickup: (h) => ({ title: `${h.number} is available for pickup`, illo: "pin" }),
      delivered: (h) => ({ title: h.from === "delivered" ? `${h.number}: ${h.note ?? "update"}` : `${h.number} ${h.fulfilment === "pickup" ? "collected" : "delivered"}`, illo: "heart" }),
      cancelled: (h) => ({ title: `${h.number} was cancelled`, illo: "doc" }),
      refunded: (h) => ({ title: `${h.number} was refunded`, illo: "doc" }),
    };
    const OFFER: Record<string, string> = { waiting_store: "Offer waiting for you", waiting_customer: "Waiting on the customer", agreed: "Offer agreed", declined: "Offer declined", expired: "Offer expired", used: "Offer bought" };
    const recent = [
      ...history.map((h) => {
        const step = STEP[h.to]?.(h) ?? { title: `${h.number} updated`, illo: "box" };
        return { id: `h-${h.id}`, title: step.title, hint: h.from === "delivered" && h.to === "delivered" ? "From the customer" : "Order update", href: `/orders/${h.orderId}`, illo: step.illo, at: h.at.toISOString() };
      }),
      ...paid
        .filter((p) => p.paidAt)
        .map((p) => ({ id: `p-${p.id}`, title: `${naira(p.amount)} paid to you`, hint: `${p.stage === "first" ? "First" : "Final"} payment for ${p.number}`, href: "/payouts", illo: "bank", at: p.paidAt!.toISOString() })),
      ...offerRows.map((o) => ({ id: `o-${o.id}`, title: `${OFFER[o.status] ?? "Offer updated"}: ${naira(o.amount)}`, hint: o.product, href: "/offers", illo: "tag", at: o.at.toISOString() })),
    ]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 8);
    return c.json({ needs, recent });
  })

  // --- Home page numbers ---
  .get("/summary", async (c) => {
    const storeId = c.get("store").id;
    const since = new Date(Date.now() - 13 * 86_400_000);
    since.setHours(0, 0, 0, 0);
    const [daily, counts] = await Promise.all([
      db
        .select({ day: sql<string>`to_char(${orders.createdAt} at time zone 'Africa/Lagos', 'YYYY-MM-DD')`, amount: sql<number>`coalesce(sum(${orders.subtotal}), 0)::float`, n: sql<number>`count(*)::int` })
        .from(orders)
        .where(and(eq(orders.merchantId, storeId), gte(orders.createdAt, since), inArray(orders.status, ["paid", "processing", "dispatched", "ready_for_pickup", "delivered"])))
        .groupBy(sql`1`),
      db
        .select({ status: orders.status, n: sql<number>`count(*)::int`, total: sql<number>`coalesce(sum(${orders.total}), 0)::float` })
        .from(orders)
        .where(eq(orders.merchantId, storeId))
        .groupBy(orders.status),
    ]);
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(since.getTime() + i * 86_400_000);
      const key = d.toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
      const row = daily.find((r) => r.day === key);
      return { day: d.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", timeZone: "Africa/Lagos" }), amount: row?.amount ?? 0, orders: row?.n ?? 0 };
    });
    const count = (...s: string[]) => counts.filter((r) => s.includes(r.status)).reduce((n, r) => n + r.n, 0);
    const [offersWaiting] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.offers)
      .where(and(eq(schema.offers.merchantId, c.get("store").id), eq(schema.offers.status, "waiting_store")));
    // Customers' reviews the store hasn't replied to yet
    const r = schema.productReviews;
    const [toReply] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(r)
      .innerJoin(products, eq(products.id, r.productId))
      .where(and(eq(products.merchantId, storeId), eq(r.isPublished, true), sql`${r.storeReply} is null`));
    return c.json({
      offersWaiting: offersWaiting?.n ?? 0,
      reviewsToReply: toReply?.n ?? 0,
      salesByDay: days,
      completedOrders: count("delivered"),
      waiting: count("paid"),
      inProgress: count("processing", "dispatched", "ready_for_pickup"),
    });
  });
