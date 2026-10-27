// A marketplace store's own business: products, delivery areas, orders, customers and setup.
// Mounted under /merchant. Everything is scoped to the signed-in owner's store.
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { z } from "zod";
import { db, schema, type Tx } from "../db/client";
import { publicApiUrl } from "../env";
import { audit } from "../lib/audit";
import { requireAuth, type AppEnv } from "../lib/auth";
import { badRequest, conflict, forbidden, notFound } from "../lib/errors";
import { accountNameMatch, slugify } from "../lib/identity";
import { nigerianBanks, resolveAccount } from "../services/flutterwave";
import { payoutSettings, payoutsFor, toPayoutRow } from "../services/payouts";
import { cancelOrder, updateOrderStatus } from "../services/orders";

type Store = typeof schema.merchants.$inferSelect;
type StoreEnv = AppEnv & { Variables: { store: Store } };

const { products, productVariants, inventory, orders, orderItems, deliveryZones, branches } = schema;

/** Loads the owner's store; 404 without one */
const withStore = createMiddleware<StoreEnv>(async (c, next) => {
  const [store] = await db.select().from(schema.merchants).where(eq(schema.merchants.ownerId, c.get("user").id));
  if (!store) throw notFound("You don't have a store yet");
  c.set("store", store);
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
    .where(and(eq(products.merchantId, storeId), ids ? inArray(products.id, ids) : undefined))
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
    .select({ o: orders, name: schema.users.fullName, username: schema.users.username, phone: schema.users.phone, point: schema.deliveryZones.pickupPoint })
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
  return rows.map(({ o, name, username, phone, point }) => {
    const a = o.deliveryAddress;
    const paidAt = history.find((h) => h.orderId === o.id && h.toStatus === "paid")?.createdAt ?? o.createdAt;
    return {
      id: o.id,
      number: o.orderNumber,
      status: dashboardStatus(o.status),
      customer: {
        name: name ?? a?.recipientName ?? "Customer",
        username: username ?? "",
        phone: a?.phone ?? phone ?? "",
        address: a ? [a.line1, a.line2, a.city, a.state].filter(Boolean).join(", ") : "",
      },
      fulfilment: o.fulfilmentType,
      pickupPoint: o.fulfilmentType === "pickup" ? (point ?? undefined) : undefined,
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
const zoneInput = z.object({
  state: z.string().trim().min(2).max(40),
  areas: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  homeFee: z.number().min(0).max(1_000_000),
  pickup: z.object({ fee: z.number().min(0).max(1_000_000), point: z.string().trim().min(3).max(140) }).optional().nullable(),
  days: z.string().trim().min(1).max(40),
  freeOver: z.number().positive().max(100_000_000).optional().nullable(),
  active: z.boolean().default(true),
});

const zoneForDashboard = (z: typeof deliveryZones.$inferSelect) => ({
  id: z.id,
  state: z.state,
  areas: z.areas,
  homeFee: z.homeFee,
  pickup: z.pickupFee != null && z.pickupPoint ? { fee: z.pickupFee, point: z.pickupPoint } : undefined,
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
      if (file.size > (kind === "document" ? 10 : 5) * 1024 * 1024) throw badRequest(`${file.name} is too large (max ${kind === "document" ? 10 : 5} MB)`);
      const [row] = await db
        .insert(schema.media)
        .values({ filename: file.name.slice(0, 200), contentType: file.type, size: file.size, data: Buffer.from(await file.arrayBuffer()), isPrivate: kind === "document", createdBy: c.get("user").id })
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

  // --- Payouts: the account they go to, and what's been paid ---
  .get("/banks", async (c) => c.json(await nigerianBanks()))
  /** Checks the account with the bank and saves it. Payouts only go automatically to an account in
   *  the business's or the owner's name; anything else waits for Sotechy. */
  .put(
    "/payout-account",
    zValidator("json", z.object({ bankCode: z.string().trim().min(2).max(10), accountNumber: z.string().regex(/^\d{10}$/, "Account numbers have 10 digits") })),
    async (c) => {
      const { bankCode, accountNumber } = c.req.valid("json");
      const store = c.get("store");
      const bank = (await nigerianBanks()).find((b) => b.code === bankCode);
      if (!bank) throw badRequest("Choose your bank from the list");
      const [owner] = await db.select({ fullName: schema.users.fullName }).from(schema.users).where(eq(schema.users.id, c.get("user").id));
      const accountName = await resolveAccount(bankCode, accountNumber, owner?.fullName ?? store.name);
      const match = accountNameMatch(accountName, [store.name, store.application?.registeredName], owner?.fullName ?? "");
      const verifiedAt = new Date();
      await db
        .update(schema.merchants)
        .set({
          payoutBankCode: bank.code,
          payoutBankName: bank.name,
          payoutAccountNumber: accountNumber,
          payoutAccountName: accountName,
          payoutAccountMatch: match,
          payoutVerifiedAt: verifiedAt,
          // Setup shows the same account
          application: { ...(store.application ?? {}), bank: { bankName: bank.name, accountNumber } } as typeof store.application,
          updatedAt: verifiedAt,
        })
        .where(eq(schema.merchants.id, store.id));
      await audit(db, { actorId: c.get("user").id, action: "merchant.payout_account", entityType: "merchant", entityId: store.id, details: { bank: bank.name, last4: accountNumber.slice(-4), match } });
      return c.json({ bankCode: bank.code, bankName: bank.name, accountNumber, accountName, match, verifiedAt: verifiedAt.toISOString() });
    },
  )
  .get("/payouts", async (c) => {
    const store = c.get("store");
    const settings = await payoutSettings();
    const rows = await payoutsFor({ merchantId: store.id });
    return c.json({ payouts: rows.map(toPayoutRow), plan: store.payoutPlan ?? settings.standard, feeRate: settings.feeRate, finalAfterHours: settings.finalAfterHours });
  })

  // --- Storefront look ---
  .patch(
    "/storefront",
    zValidator(
      "json",
      z.object({
        tagline: z.string().trim().max(90).nullable().optional(),
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
        documents: z.record(z.string().max(60), z.string().max(200)).default({}),
        people: z.array(z.object({ name: z.string().trim().min(1).max(120), role: z.string().max(60), share: z.number().min(0).max(100) })).max(20).default([]),
        bank: z.object({ bankName: z.string().min(2).max(60), accountNumber: z.string().regex(/^\d{10}$/, "Account numbers have 10 digits") }).nullable().optional(),
        submit: z.boolean().default(false),
      }),
    ),
    async (c) => {
      const { sellerKind, sells, submit, ...application } = c.req.valid("json");
      const store = c.get("store");
      if (submit) {
        if (!sells.length) throw badRequest("Choose what you sell before submitting");
        if (sellerKind === "registered" && (!application.registeredName || !application.registrationNumber || !application.businessAddress)) {
          throw badRequest("Fill in your business details before submitting");
        }
        if (!application.bank) throw badRequest("Add a payout account before submitting");
      }
      const [row] = await db
        .update(schema.merchants)
        .set({ sellerKind, sells, application, ...(submit && { submittedAt: new Date() }) })
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
    const [own] = await db.select({ id: products.id }).from(products).where(and(eq(products.id, id), eq(products.merchantId, store.id)));
    if (!own) throw notFound("Product not found");
    await checkZones(store.id, input.deliveryZoneIds);
    await db.transaction(async (tx) => {
      await tx.update(products).set(productValues(input)).where(eq(products.id, id));
      await syncVariants(tx, store, id, input);
    });
    const [p] = await productsForDashboard(store.id, [id]);
    return c.json(p);
  })

  // --- Delivery areas (each new area or change in coverage waits for Sotechy) ---
  .get("/delivery-zones", async (c) => {
    const rows = await db.select().from(deliveryZones).where(eq(deliveryZones.merchantId, c.get("store").id)).orderBy(deliveryZones.createdAt);
    return c.json(rows.map(zoneForDashboard));
  })
  .post("/delivery-zones", zValidator("json", zoneInput), async (c) => {
    const z = c.req.valid("json");
    const [row] = await db
      .insert(deliveryZones)
      .values({ merchantId: c.get("store").id, state: z.state, areas: z.areas, homeFee: z.homeFee, pickupFee: z.pickup?.fee ?? null, pickupPoint: z.pickup?.point ?? null, days: z.days, freeOver: z.freeOver ?? null, isActive: z.active })
      .returning();
    return c.json(zoneForDashboard(row), 201);
  })
  .put("/delivery-zones/:id", zValidator("json", zoneInput), async (c) => {
    const z = c.req.valid("json");
    const [before] = await db.select().from(deliveryZones).where(and(eq(deliveryZones.id, c.req.param("id")), eq(deliveryZones.merchantId, c.get("store").id)));
    if (!before) throw notFound("Delivery area not found");
    // A different state or list of areas needs checking again; prices and days don't
    const coverageChanged = before.state !== z.state || before.areas.join("|") !== z.areas.join("|");
    const [row] = await db
      .update(deliveryZones)
      .set({ state: z.state, areas: z.areas, homeFee: z.homeFee, pickupFee: z.pickup?.fee ?? null, pickupPoint: z.pickup?.point ?? null, days: z.days, freeOver: z.freeOver ?? null, isActive: z.active, ...(coverageChanged && { review: "pending" as const, reviewNote: null }) })
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
    const [o] = await ordersForDashboard(c.get("store").id, [c.req.param("id")]);
    if (!o) throw notFound("Order not found");
    return c.json(o);
  })
  .post("/orders/:id/:action", zValidator("json", z.object({ note: z.string().trim().max(300).optional() }).default({})), async (c) => {
    const store = c.get("store");
    const action = c.req.param("action");
    const o = await ownOrder(store.id, c.req.param("id"));
    const actor = c.get("user");
    const note = c.req.valid("json").note;
    if (action === "accept") {
      if (o.status !== "paid") throw conflict("This order can't be accepted now");
      await updateOrderStatus(actor, o.id, "processing", note ?? "Store accepted the order");
    } else if (action === "ship") {
      if (o.status !== "processing") throw conflict("Accept the order first");
      await updateOrderStatus(actor, o.id, o.fulfilmentType === "pickup" ? "ready_for_pickup" : "dispatched", note ?? (o.fulfilmentType === "pickup" ? "Ready for pickup" : "On its way"));
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
  })

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
      })
      .from(orders)
      .innerJoin(schema.users, eq(schema.users.id, orders.customerId))
      .where(and(eq(orders.merchantId, c.get("store").id), inArray(orders.status, ["paid", "processing", "dispatched", "ready_for_pickup", "delivered"])))
      .groupBy(orders.customerId, schema.users.fullName, schema.users.username, schema.users.phone)
      .orderBy(desc(sql`max(${orders.createdAt})`));
    return c.json(rows);
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
    return c.json({
      salesByDay: days,
      completedOrders: count("delivered"),
      waiting: count("paid"),
      inProgress: count("processing", "dispatched", "ready_for_pickup"),
    });
  });
