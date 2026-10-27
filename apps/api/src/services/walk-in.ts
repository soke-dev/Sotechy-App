// Walk-in sales: a customer buys in the store's own shop and gives their @username or phone number.
// The sale itself stays between them; the store pays a 1% fee through Money Moves, and only
// then does the customer get the store's token (plus $SOTECHY), as with an online order.
import { and, desc, eq } from "drizzle-orm";
import { TOKEN_RULES } from "@sotechy/shared";
import { db, schema } from "../db/client";
import { env } from "../env";
import { badRequest, notFound } from "../lib/errors";
import { createCheckout, type MMPayment } from "./moneymoves";
import { earnForWalkIn } from "./tokens";

export const WALK_IN_REF = "walk-";
const { walkInSales: sales, users } = schema;

/** A Sotechy customer by @username or phone number (any common Nigerian format) */
export async function findCustomer(query: string) {
  const q = query.trim().replace(/^@/, "").toLowerCase();
  if (q.length < 3) return null;
  const digits = q.replace(/\D/g, "");
  const phone = digits.length >= 10 ? `+234${digits.slice(-10)}` : null;
  const pick = { id: users.id, name: users.fullName, username: users.username, active: users.isActive };
  const [byName] = await db.select(pick).from(users).where(eq(users.username, q)).limit(1);
  // A phone number can be on more than one account; then only their @username is sure to be the right person
  const byPhone = !byName && phone ? await db.select(pick).from(users).where(eq(users.phone, phone)).limit(2) : [];
  if (byPhone.length > 1) throw badRequest("More than one account has that phone number. Ask for their @username instead.");
  const user = byName ?? byPhone[0];
  if (!user || !user.active) return null;
  return { id: user.id, name: user.name, username: user.username };
}

/** Records the sale and opens the fee payment; the tokens follow once it's paid */
export async function startWalkIn(store: typeof schema.merchants.$inferSelect, by: { id: string; email: string; name: string | null }, input: { customer: string; amount: number; note?: string }) {
  if (store.status !== "approved" || !store.tokenId) throw badRequest("Walk-in sales open once Sotechy approves your store and its token is created");
  const customer = await findCustomer(input.customer);
  if (!customer) throw notFound("No Sotechy account found. Ask them to sign up in the app, then try again.");
  if (customer.id === store.ownerId) throw badRequest("You can't reward your own account");
  const fee = Math.max(1, Math.round(input.amount * TOKEN_RULES.walkInFeeRate * 100) / 100);
  const [sale] = await db.insert(sales).values({ merchantId: store.id, customerId: customer.id, amount: input.amount, fee, note: input.note ?? null, createdBy: by.id }).returning();
  const checkout = await createCheckout({
    reference: `${WALK_IN_REF}${sale.id}`,
    idempotencyKey: `${WALK_IN_REF}${sale.id}`,
    amount: fee,
    description: `Sotechy fee for a ₦${input.amount.toLocaleString("en-NG")} walk-in sale at ${store.name}`,
    customer: { email: by.email, name: by.name },
    redirectUrl: `${env.MERCHANT_APP_URL.replace(/\/$/, "")}/walk-in?paid=${sale.id}`,
    expiresAt: new Date(Date.now() + 30 * 60_000),
    metadata: { walk_in_sale: sale.id, merchant_id: store.id },
  });
  await db.update(sales).set({ checkoutId: checkout.id }).where(eq(sales.id, sale.id));
  return { id: sale.id, fee, checkoutUrl: checkout.url, customer: { name: customer.name, username: customer.username } };
}

/** Money Moves says the fee arrived: release the customer's tokens */
export async function settleWalkIn(saleId: string, p: MMPayment) {
  if (p.status !== "successful") return;
  await db.transaction(async (tx) => {
    const [sale] = await tx.select().from(sales).where(eq(sales.id, saleId)).for("update");
    if (!sale || sale.status !== "pending" || p.amount_ngn < sale.fee) return;
    await tx.update(sales).set({ status: "paid", paidAt: new Date() }).where(eq(sales.id, sale.id));
    await earnForWalkIn(tx, sale);
  });
}

/** A store's walk-in sales, newest first */
export async function walkInsOf(merchantId: string) {
  const rows = await db
    .select({ id: sales.id, amount: sales.amount, fee: sales.fee, note: sales.note, status: sales.status, createdAt: sales.createdAt, paidAt: sales.paidAt, username: users.username, name: users.fullName })
    .from(sales)
    .innerJoin(users, eq(users.id, sales.customerId))
    .where(and(eq(sales.merchantId, merchantId)))
    .orderBy(desc(sales.createdAt))
    .limit(30);
  return rows;
}
