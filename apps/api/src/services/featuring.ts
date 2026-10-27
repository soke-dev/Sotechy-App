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

/** Starts a payment for months of featuring and returns the Money Moves checkout page */
export async function buyFeaturing(store: typeof schema.merchants.$inferSelect, months: number, buyer: { email: string; name: string | null }) {
  if (store.status !== "approved") throw badRequest("Your store can be featured once Sotechy approves it");
  const settings = await featuringSettings();
  const already = !!store.featuredUntil && store.featuredUntil > new Date();
  if (!already && (await featuredCount()) >= settings.maxStores) throw conflict("All featured spots are taken right now. Try again in a few days.");
  const amount = settings.pricePerMonth * months;
  const [purchase] = await db.insert(schema.featuredPurchases).values({ merchantId: store.id, months, amount }).returning();
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
    return { store, until, amount: purchase.amount };
  });
  if (!done?.store.ownerId) return;
  const [owner] = await db.select({ email: schema.users.email }).from(schema.users).where(eq(schema.users.id, done.store.ownerId));
  if (owner) sendEmailLater(featuredEmail(owner.email, { store: done.store.name, until: done.until, price: done.amount }));
}

/** A store's featuring payments, newest first */
export const purchasesOf = (merchantId: string) =>
  db
    .select()
    .from(schema.featuredPurchases)
    .where(and(eq(schema.featuredPurchases.merchantId, merchantId), eq(schema.featuredPurchases.status, "paid")))
    .orderBy(desc(schema.featuredPurchases.createdAt))
    .limit(50);
