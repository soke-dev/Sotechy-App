// Paid featuring: a store pays through Money Moves to be shown first (Home, Shop and Stores) for a few
// months. Payment is confirmed from Money Moves before any time is added.
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { db, schema } from "../db/client";
import { env } from "../env";
import { featuredEmail } from "../emails/templates";
import { sendEmailLater } from "../lib/email";
import { badRequest, conflict } from "../lib/errors";
import { createCheckout, type MMPayment } from "./moneymoves";
import { getSetting } from "./settings";

export interface FeaturingSettings {
  pricePerMonth: number;
  /** Most stores featured at once, so being featured still means something */
  maxStores: number;
}
const DEFAULTS: FeaturingSettings = { pricePerMonth: 2_000, maxStores: 8 };
const MONTH_MS = 30 * 86_400_000;
export const FEATURE_REF = "feat-";

export async function featuringSettings(): Promise<FeaturingSettings> {
  return { ...DEFAULTS, ...(await getSetting<Partial<FeaturingSettings>>("featuring")) };
}

/** How many stores are featured right now */
export async function featuredCount() {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.merchants).where(gt(schema.merchants.featuredUntil, new Date()));
  return row?.n ?? 0;
}

export interface StoreBannerInput {
  imageUrl: string;
  title?: string | null;
  ctaLabel?: string | null;
}

/** Starts a payment for months of featuring and returns the Money Moves checkout page. A banner designed
 *  with it is saved switched off, and goes live for the feature's months once the payment arrives. */
export async function buyFeaturing(store: typeof schema.merchants.$inferSelect, months: number, buyer: { email: string; name: string | null }, banner?: StoreBannerInput) {
  if (store.status !== "approved") throw badRequest("Your store can be featured once Sotechy approves it");
  const settings = await featuringSettings();
  const already = !!store.featuredUntil && store.featuredUntil > new Date();
  if (!already && (await featuredCount()) >= settings.maxStores) throw conflict("All featured spots are taken right now. Try again in a few days.");
  const amount = settings.pricePerMonth * months;
  const [purchase] = await db.insert(schema.featuredPurchases).values({ merchantId: store.id, months, amount }).returning();
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
  const checkout = await createCheckout({
    reference: `${FEATURE_REF}${purchase.id}`,
    idempotencyKey: `${FEATURE_REF}${purchase.id}`,
    amount,
    description: `Featuring ${store.name} on Sotechy for ${months} month${months === 1 ? "" : "s"}`,
    customer: buyer,
    redirectUrl: `${env.MERCHANT_APP_URL.replace(/\/$/, "")}/featured?paid=1`,
    expiresAt: new Date(Date.now() + 30 * 60_000),
    metadata: { featured_purchase: purchase.id, merchant_id: store.id },
  });
  await db.update(schema.featuredPurchases).set({ checkoutId: checkout.id }).where(eq(schema.featuredPurchases.id, purchase.id));
  return { checkoutUrl: checkout.url };
}

/** A Money Moves payment for featuring arrived: add the months, from the end of any current feature */
export async function settleFeaturing(purchaseId: string, p: MMPayment) {
  if (p.status !== "successful") return;
  const done = await db.transaction(async (tx) => {
    const [purchase] = await tx.select().from(schema.featuredPurchases).where(eq(schema.featuredPurchases.id, purchaseId)).for("update");
    if (!purchase || purchase.status !== "pending" || p.amount_ngn < purchase.amount) return null;
    const [store] = await tx.select().from(schema.merchants).where(eq(schema.merchants.id, purchase.merchantId)).for("update");
    if (!store) return null;
    const from = store.featuredUntil && store.featuredUntil > new Date() ? store.featuredUntil : new Date();
    const until = new Date(from.getTime() + purchase.months * MONTH_MS);
    await tx.update(schema.merchants).set({ featuredUntil: until }).where(eq(schema.merchants.id, store.id));
    await tx.update(schema.featuredPurchases).set({ status: "paid", paidAt: new Date(), until }).where(eq(schema.featuredPurchases.id, purchase.id));
    // Its banner shows for exactly these months, then switches off (an admin can switch it on again)
    await tx.update(schema.banners).set({ isActive: true, startsAt: from, endsAt: until }).where(eq(schema.banners.featuredPurchaseId, purchase.id));
    return { store, until, amount: purchase.amount };
  });
  if (!done?.store.ownerId) return;
  const [owner] = await db.select({ email: schema.users.email }).from(schema.users).where(eq(schema.users.id, done.store.ownerId));
  if (owner) sendEmailLater(featuredEmail(owner.email, { store: done.store.name, until: done.until, price: done.amount }));
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
