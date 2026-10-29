// Paid featuring: a store pays through Money Moves to be shown first (Home, Shop and Stores) for a few
// months, with its own Home banner. Pro costs more and adds the store's own dark row of products on Home,
// for two stores at a time. Payment is confirmed from Money Moves before any time is added.
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { db, schema } from "../db/client";
import { env } from "../env";
import { featuredEmail } from "../emails/templates";
import { sendEmailLater } from "../lib/email";
import { badRequest, conflict } from "../lib/errors";
import { bachsCreateCheckout } from "./bachs";
import { bankProvider, bankProviderReady } from "./bank-pay";
import { createCheckout, createDirectCheckout, moneyMovesConfigured } from "./moneymoves";
import { getSetting } from "./settings";

export type FeatureTier = "standard" | "pro";

export interface FeaturingSettings {
  pricePerMonth: number;
  /** Most stores featured at once, so being featured still means something */
  maxStores: number;
  /** Most features one store can hold at a time (running or waiting to start) */
  maxPerStore: number;
  /** Pro: a month's price, and how many stores can have it at once (each gets a row on Home) */
  proPricePerMonth: number;
  maxPro: number;
}
const DEFAULTS: FeaturingSettings = { pricePerMonth: 2_000, maxStores: 120, maxPerStore: 2, proPricePerMonth: 10_000, maxPro: 2 };
const MONTH_MS = 30 * 86_400_000;
export const FEATURE_REF = "feat-";

export async function featuringSettings(): Promise<FeaturingSettings> {
  return { ...DEFAULTS, ...(await getSetting<Partial<FeaturingSettings>>("featuring")) };
}

/** A store's features running or still to come */
export async function storeFeatureCount(merchantId: string) {
  const fp = schema.featuredPurchases;
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(fp).where(and(eq(fp.merchantId, merchantId), eq(fp.status, "paid"), gt(fp.until, new Date())));
  return row?.n ?? 0;
}

/** How many stores are featured right now (Pro ones included) */
export async function featuredCount() {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.merchants).where(gt(schema.merchants.featuredUntil, new Date()));
  return row?.n ?? 0;
}

/** How many stores have Pro right now */
export async function proCount() {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.merchants).where(gt(schema.merchants.proUntil, new Date()));
  return row?.n ?? 0;
}

export interface StoreBannerInput {
  imageUrl: string;
  title?: string | null;
  ctaLabel?: string | null;
}

/** Starts a payment for months of featuring and returns the Money Moves checkout page. A banner designed
 *  with it is saved switched off, and goes live for the feature's months once the payment arrives. */
/** The ways a store can pay for featuring right now: stablecoin on Money Moves, or bank transfer (Admin → Settings picks who takes it) */
export async function featuringPayMethods() {
  return { stablecoin: moneyMovesConfigured(), bank: bankProviderReady(await bankProvider()) };
}

export async function buyFeaturing(
  store: typeof schema.merchants.$inferSelect,
  months: number,
  buyer: { email: string; name: string | null },
  banner?: StoreBannerInput,
  tier: FeatureTier = "standard",
  method: "stablecoin" | "bank" = "stablecoin",
) {
  if (store.status !== "approved") throw badRequest("Your store can be featured once Sotechy approves it");
  const settings = await featuringSettings();
  const now = new Date();
  const already = !!store.featuredUntil && store.featuredUntil > now;
  if (!already && (await featuredCount()) >= settings.maxStores) throw conflict("All featured spots are taken right now. Try again in a few days.");
  const alreadyPro = !!store.proUntil && store.proUntil > now;
  if (tier === "pro" && !alreadyPro && (await proCount()) >= settings.maxPro) throw conflict(`Both Pro spots are taken right now. Featured is still open, or try Pro again when one ends.`);
  if ((await storeFeatureCount(store.id)) >= settings.maxPerStore)
    throw conflict(`A store can have ${settings.maxPerStore} features at a time. You can buy another when one ends.`);
  const ways = await featuringPayMethods();
  if (!ways[method]) throw badRequest(method === "bank" ? "Bank transfer isn't available right now. Please pay with Money Moves." : "Money Moves isn't available right now. Please pay by bank transfer.");
  const amount = (tier === "pro" ? settings.proPricePerMonth : settings.pricePerMonth) * months;
  const [purchase] = await db.insert(schema.featuredPurchases).values({ merchantId: store.id, months, amount, tier }).returning();
  if (banner) {
    await db.insert(schema.banners).values({
      layout: "image",
      imageUrl: banner.imageUrl,
      title: banner.title?.trim() || null,
      ctaLabel: banner.ctaLabel?.trim() || null,
      style: "dark",
      linkType: "store",
      linkValue: store.slug,
      merchantId: store.id,
      featuredPurchaseId: purchase.id,
      isActive: false,
    });
  }
  const reference = `${FEATURE_REF}${purchase.id}`;
  const description = `${tier === "pro" ? "Featured Pro" : "Featuring"} for ${store.name} on Sotechy, ${months} month${months === 1 ? "" : "s"}`;
  const returnUrl = `${env.MERCHANT_APP_URL.replace(/\/$/, "")}/featured?paid=1`;
  const expiresAt = new Date(Date.now() + 30 * 60_000);
  const metadata = { featured_purchase: purchase.id, merchant_id: store.id };
  if (method === "bank" && (await bankProvider()) === "bachs") {
    const s = await bachsCreateCheckout({ reference, amount, customer: buyer, returnUrl, expiresAt, metadata });
    await db.update(schema.featuredPurchases).set({ checkoutId: s.checkout_id }).where(eq(schema.featuredPurchases.id, purchase.id));
    if (!s.checkout_url) throw badRequest("Bank transfer didn't open. Please try again.");
    return { checkoutUrl: s.checkout_url };
  }
  // Stablecoin on Money Moves' checkout, or a bank transfer on its direct checkout
  const checkout = await (method === "bank" ? createDirectCheckout : createCheckout)({
    reference,
    idempotencyKey: reference,
    amount,
    description,
    customer: buyer,
    redirectUrl: returnUrl,
    expiresAt,
    metadata,
  });
  await db.update(schema.featuredPurchases).set({ checkoutId: checkout.id }).where(eq(schema.featuredPurchases.id, purchase.id));
  return { checkoutUrl: checkout.url };
}

/** A payment for featuring arrived (Money Moves or Bachs, read from the provider): add the months, from the end of any current feature */
export async function settleFeaturing(purchaseId: string, p: { paid: boolean; amount: number }) {
  if (!p.paid) return;
  const done = await db.transaction(async (tx) => {
    const [purchase] = await tx.select().from(schema.featuredPurchases).where(eq(schema.featuredPurchases.id, purchaseId)).for("update");
    if (!purchase || purchase.status !== "pending" || p.amount + 0.005 < purchase.amount) return null;
    const [store] = await tx.select().from(schema.merchants).where(eq(schema.merchants.id, purchase.merchantId)).for("update");
    if (!store) return null;
    // Featured and Pro each run on their own clock, at the same time: a payment adds months to the end of its
    // own kind only. The store is featured while either runs (Pro includes everything Featured gives).
    const now = new Date();
    const pro = purchase.tier === "pro";
    const from = pro ? (store.proUntil && store.proUntil > now ? store.proUntil : now) : ((await standardUntil(tx, store.id, now)) ?? now);
    const until = new Date(from.getTime() + purchase.months * MONTH_MS);
    const proUntil = pro ? until : store.proUntil;
    const latest = [store.featuredUntil, until, proUntil].filter((d): d is Date => !!d && d > now).sort((a, b) => b.getTime() - a.getTime())[0];
    await tx.update(schema.merchants).set({ featuredUntil: latest, proUntil }).where(eq(schema.merchants.id, store.id));
    await tx.update(schema.featuredPurchases).set({ status: "paid", paidAt: now, until }).where(eq(schema.featuredPurchases.id, purchase.id));
    // Its banner shows for exactly these months, then switches off (an admin can switch it on again)
    await tx.update(schema.banners).set({ isActive: true, startsAt: from, endsAt: until }).where(eq(schema.banners.featuredPurchaseId, purchase.id));
    return { store, until, amount: purchase.amount };
  });
  if (!done?.store.ownerId) return;
  const [owner] = await db.select({ email: schema.users.email }).from(schema.users).where(eq(schema.users.id, done.store.ownerId));
  if (owner) sendEmailLater(featuredEmail(owner.email, { store: done.store.name, until: done.until, price: done.amount }));
}

/** When a store's paid Featured (not Pro) time ends, if it's still running */
export async function standardUntil(tx: Pick<typeof db, "select">, merchantId: string, now = new Date()) {
  const fp = schema.featuredPurchases;
  const [row] = await tx
    .select({ until: sql<Date | null>`max(${fp.until})` })
    .from(fp)
    .where(and(eq(fp.merchantId, merchantId), eq(fp.status, "paid"), eq(fp.tier, "standard"), gt(fp.until, now)));
  return row?.until ? new Date(row.until) : null;
}

/** A store's featuring payments, newest first, each with the banner it paid for */
export async function purchasesOf(merchantId: string) {
  const rows = await db
    .select({ p: schema.featuredPurchases, banner: schema.banners })
    .from(schema.featuredPurchases)
    .leftJoin(schema.banners, eq(schema.banners.featuredPurchaseId, schema.featuredPurchases.id))
    .where(and(eq(schema.featuredPurchases.merchantId, merchantId), eq(schema.featuredPurchases.status, "paid")))
    .orderBy(desc(schema.featuredPurchases.createdAt))
    .limit(50);
  const now = new Date();
  return rows.map(({ p, banner }) => ({
    ...p,
    banner: banner
      ? {
          imageUrl: banner.imageUrl,
          title: banner.title,
          ctaLabel: banner.ctaLabel,
          // Live while switched on and inside its months; "ended" once they're over
          state: !banner.isActive ? "off" : banner.endsAt && banner.endsAt < now ? "ended" : banner.startsAt && banner.startsAt > now ? "scheduled" : "live",
        }
      : null,
  }));
}
