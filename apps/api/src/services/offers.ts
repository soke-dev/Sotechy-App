// Price offers on negotiable products. The customer offers, the store accepts, declines or counters, and
// so on (the customer makes at most three offers). An agreed price is held for the customer for the
// product's offer hours (never more than 24) and used at checkout for one unit.
import { and, asc, desc, eq, inArray, lt, or, sql } from "drizzle-orm";
import type { OfferView } from "@sotechy/shared";
import { db, schema, type Tx } from "../db/client";
import { badRequest, conflict, forbidden, notFound } from "../lib/errors";
import { sendPushLater } from "./push";

const { offers, offerMessages, products, productVariants, merchants, users } = schema;
const MAX_CUSTOMER_OFFERS = 3;
const ANSWER_HOURS = 48;
const OPEN = ["waiting_store", "waiting_customer", "agreed"] as const;
type Offer = typeof offers.$inferSelect;

/** Offers nobody answered in time, and agreed prices nobody used, lapse */
export async function expireOffers(tx: Pick<Tx, "update"> = db) {
  const now = new Date();
  await tx
    .update(offers)
    .set({ status: "expired" })
    .where(
      or(
        and(inArray(offers.status, ["waiting_store", "waiting_customer"]), lt(offers.updatedAt, new Date(now.getTime() - ANSWER_HOURS * 3_600_000))),
        and(eq(offers.status, "agreed"), lt(offers.agreedUntil, now)),
      ),
    );
}

async function views(where: ReturnType<typeof and>, forStore: boolean): Promise<OfferView[]> {
  await expireOffers();
  const rows = await db
    .select({
      o: offers,
      product: products,
      variantName: productVariants.name,
      store: merchants,
      customerName: users.fullName,
      customerUsername: users.username,
      branchId: sql<string | null>`(select b.id from branches b where b.merchant_id = ${merchants.id} limit 1)`,
    })
    .from(offers)
    .innerJoin(products, eq(products.id, offers.productId))
    .innerJoin(productVariants, eq(productVariants.id, offers.variantId))
    .innerJoin(merchants, eq(merchants.id, offers.merchantId))
    .innerJoin(users, eq(users.id, offers.customerId))
    .where(where)
    .orderBy(desc(offers.updatedAt))
    .limit(200);
  if (!rows.length) return [];
  const messages = await db.select().from(offerMessages).where(inArray(offerMessages.offerId, rows.map((r) => r.o.id))).orderBy(asc(offerMessages.createdAt));
  return rows.map(({ o, product, variantName, store, customerName, customerUsername, branchId }) => ({
    id: o.id,
    status: o.status,
    listPrice: o.listPrice,
    lastAmount: o.lastAmount,
    agreedPrice: o.agreedPrice,
    agreedUntil: o.agreedUntil?.toISOString() ?? null,
    hours: Math.min(24, product.offerHours ?? 24),
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    product: { id: product.id, slug: product.slug, name: product.name, image: product.images?.[0] ?? null, variantId: o.variantId, variantName },
    store: { slug: store.slug, name: store.name, logoUrl: store.logoUrl, branchId },
    // Stores see who's asking; customers see only themselves
    customer: forStore ? { name: customerName ?? "Customer", username: customerUsername ?? "" } : null,
    messages: messages
      .filter((m) => m.offerId === o.id)
      .map((m) => ({ id: m.id, from: m.from as "customer" | "store", kind: m.kind as OfferView["messages"][number]["kind"], amount: m.amount, text: m.text, createdAt: m.createdAt.toISOString() })),
  }));
}

export const customerOffers = (customerId: string, id?: string) => views(and(eq(offers.customerId, customerId), id ? eq(offers.id, id) : undefined), false);
export const storeOffers = (merchantId: string, id?: string) => views(and(eq(offers.merchantId, merchantId), id ? eq(offers.id, id) : undefined), true);

async function notifyStore(merchantId: string, title: string, body: string, offerId: string) {
  const [store] = await db.select({ ownerId: merchants.ownerId }).from(merchants).where(eq(merchants.id, merchantId));
  if (store?.ownerId) sendPushLater([store.ownerId], { title, body, data: { url: `/offers/${offerId}` } });
}
const notifyCustomer = (customerId: string, title: string, body: string, offerId: string) => sendPushLater([customerId], { title, body, data: { url: `/offer/${offerId}` } });
const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

/** A customer offers a price for one unit of a product option */
export async function makeOffer(customerId: string, input: { variantId: string; amount: number; text?: string | null }) {
  await expireOffers();
  const [row] = await db
    .select({ variant: productVariants, product: products, store: merchants })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .innerJoin(merchants, eq(merchants.id, products.merchantId))
    .where(eq(productVariants.id, input.variantId));
  if (!row || !row.product.isPublished || row.product.isHidden || !row.variant.isActive || row.store.status !== "approved") throw notFound("Product not found");
  if (!row.product.negotiable) throw badRequest("This store doesn't take offers on this product");
  if (row.store.ownerId === customerId) throw forbidden("You can't make an offer on your own product");
  const price = row.variant.price;
  if (!(input.amount > 0) || input.amount >= price) throw badRequest(`Offer less than the price (${naira(price)})`);
  const [open] = await db
    .select({ id: offers.id })
    .from(offers)
    .where(and(eq(offers.customerId, customerId), eq(offers.variantId, input.variantId), inArray(offers.status, [...OPEN])));
  if (open) throw conflict("You already have an offer on this. Open it to continue.");

  // Below what the store accepts: it says no straight away, without saying its lowest price
  const tooLow = row.product.offerFloor != null && input.amount < row.product.offerFloor;
  const offer = await db.transaction(async (tx) => {
    const [o] = await tx
      .insert(offers)
      .values({ merchantId: row.store.id, productId: row.product.id, variantId: row.variant.id, customerId, listPrice: price, lastAmount: input.amount, status: tooLow ? "declined" : "waiting_store" })
      .returning();
    await tx.insert(offerMessages).values({ offerId: o.id, from: "customer", kind: "offer", amount: input.amount, text: input.text?.trim() || null });
    if (tooLow) await tx.insert(offerMessages).values({ offerId: o.id, from: "store", kind: "decline", text: "That's lower than we can go. Try a higher offer." });
    return o;
  });
  if (!tooLow) void notifyStore(row.store.id, "New price offer", `${naira(input.amount)} for ${row.product.name}`, offer.id);
  return (await customerOffers(customerId, offer.id))[0];
}

/** Accept, decline or counter, by whoever's turn it is (either side can walk away while it's open) */
export async function answerOffer(
  offerId: string,
  by: { side: "customer"; userId: string } | { side: "store"; merchantId: string },
  input: { action: "accept" | "decline" | "counter"; amount?: number; text?: string | null },
) {
  await expireOffers();
  const result = await db.transaction(async (tx) => {
    const [o] = await tx.select().from(offers).where(eq(offers.id, offerId)).for("update");
    if (!o || (by.side === "customer" ? o.customerId !== by.userId : o.merchantId !== by.merchantId)) throw notFound("Offer not found");
    const myTurn = by.side === "store" ? o.status === "waiting_store" : o.status === "waiting_customer";
    if (input.action === "decline") {
      if (!["waiting_store", "waiting_customer"].includes(o.status)) throw badRequest("This offer is closed");
    } else if (!myTurn) throw badRequest(o.status === "agreed" ? "This price is already agreed" : "It's the other side's turn");

    const patch: Partial<Offer> = {};
    if (input.action === "accept") {
      const [product] = await tx.select({ hours: products.offerHours }).from(products).where(eq(products.id, o.productId));
      Object.assign(patch, { status: "agreed", agreedPrice: o.lastAmount, agreedUntil: new Date(Date.now() + Math.min(24, product?.hours ?? 24) * 3_600_000) });
    } else if (input.action === "decline") {
      patch.status = "declined";
    } else {
      const amount = Math.round(input.amount ?? 0);
      if (!(amount > 0) || amount >= o.listPrice) throw badRequest(`Counter with less than the price (${naira(o.listPrice)})`);
      if (by.side === "store" && amount <= o.lastAmount) throw badRequest("Counter with more than the customer offered, or accept their offer");
      if (by.side === "customer") {
        // Between their own last offer and the store's price
        const made = await tx
          .select({ amount: offerMessages.amount })
          .from(offerMessages)
          .where(and(eq(offerMessages.offerId, o.id), eq(offerMessages.from, "customer"), inArray(offerMessages.kind, ["offer", "counter"])))
          .orderBy(desc(offerMessages.createdAt));
        if (made.length >= MAX_CUSTOMER_OFFERS) throw badRequest("You've made three offers. Accept the store's price or decline.");
        if (amount >= o.lastAmount) throw badRequest(`Offer less than the store's ${naira(o.lastAmount)}, or accept it`);
        if (amount <= (made[0]?.amount ?? 0)) throw badRequest("Offer more than your last offer");
      }
      Object.assign(patch, { status: by.side === "store" ? "waiting_customer" : "waiting_store", lastAmount: amount });
    }
    const [updated] = await tx.update(offers).set(patch).where(eq(offers.id, o.id)).returning();
    await tx.insert(offerMessages).values({ offerId: o.id, from: by.side, kind: input.action, amount: input.action === "counter" ? updated.lastAmount : input.action === "accept" ? o.lastAmount : null, text: input.text?.trim() || null });
    return updated;
  });

  const [product] = await db.select({ name: products.name }).from(products).where(eq(products.id, result.productId));
  const what = product?.name ?? "your item";
  if (by.side === "store") {
    const text =
      input.action === "accept" ? `Your price of ${naira(result.lastAmount)} is agreed. Buy it before it runs out.` : input.action === "decline" ? `The store declined your offer` : `The store countered with ${naira(result.lastAmount)}`;
    notifyCustomer(result.customerId, `Offer on ${what}`, text, result.id);
  } else {
    const text = input.action === "accept" ? `Accepted your price of ${naira(result.lastAmount)}` : input.action === "decline" ? "Walked away from the offer" : `Offered ${naira(result.lastAmount)}`;
    void notifyStore(result.merchantId, `Offer on ${what}`, text, result.id);
  }
  return by.side === "store" ? (await storeOffers(by.merchantId, result.id))[0] : (await customerOffers(by.userId, result.id))[0];
}

/** At checkout: the agreed price for this line, after checking it's this customer's, still held and for one unit */
export async function agreedPriceFor(tx: Tx, customerId: string, line: { variantId: string; quantity: number; offerId?: string }) {
  if (!line.offerId) return null;
  const [o] = await tx.select().from(offers).where(eq(offers.id, line.offerId)).for("update");
  if (!o || o.customerId !== customerId || o.variantId !== line.variantId) throw badRequest("That agreed price isn't yours");
  if (o.status !== "agreed" || !o.agreedPrice || !o.agreedUntil || o.agreedUntil < new Date()) throw badRequest("Your agreed price has run out. Make a new offer or buy at the shop price.");
  if (line.quantity !== 1) throw badRequest("An agreed price is for one item");
  return o;
}

/** An unpaid order with an agreed price was cancelled: the price is the customer's again while it lasts */
export async function releaseOffers(tx: Pick<Tx, "update">, orderId: string) {
  await tx.update(offers).set({ status: "agreed", orderId: null }).where(and(eq(offers.orderId, orderId), eq(offers.status, "used")));
}
