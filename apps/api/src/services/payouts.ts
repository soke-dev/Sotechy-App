// Paying marketplace stores for their orders, through Bachs or Flutterwave (see payout-rail).
// The first payment is set up when a store accepts an order; the final one falls due a while after it's
// delivered, so problems can be raised first. An admin sends them (or, once switched on, they go out by
// themselves). Each payout has a fixed reference, so retrying can never pay twice.
import { and, asc, eq, inArray, lte, or, sql } from "drizzle-orm";
import { DEFAULT_PAYOUT_SETTINGS, splitByPlan, type OrderStatus, type PayoutSettings, type PayoutStage } from "@sotechy/shared";
import { db, schema, type Tx } from "../db/client";
import { audit } from "../lib/audit";
import { badRequest, HttpError, notFound } from "../lib/errors";
import { provider, railCheck, railSend, type RailResult } from "./payout-rail";
import { getSetting } from "./settings";

const { merchantPayouts: payouts, orders, merchants } = schema;

export async function payoutSettings(tx: Pick<Tx, "select"> = db): Promise<PayoutSettings> {
  const saved = await getSetting<Partial<PayoutSettings>>("payouts", tx as Tx);
  return { ...DEFAULT_PAYOUT_SETTINGS, ...saved, standard: { ...DEFAULT_PAYOUT_SETTINGS.standard, ...saved?.standard } };
}

const reference = (orderNumber: string, stage: PayoutStage) => `SOTP-${orderNumber}-${stage === "first" ? "1" : stage === "final" ? "2" : "R"}`;

/** Called after an order's status changes */
export async function payoutsForStatus(orderId: string, status: OrderStatus) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order?.merchantId) return;
  if (status === "processing") await schedule(order, "first");
  else if (status === "delivered") await schedule(order, "final");
  else if (status === "cancelled" || status === "refunded") await unwind(order.id);
}

async function schedule(order: typeof orders.$inferSelect, stage: "first" | "final") {
  const settings = await payoutSettings();
  const [store] = await db.select({ plan: merchants.payoutPlan }).from(merchants).where(eq(merchants.id, order.merchantId!));
  const split = splitByPlan(order.subtotal, order.deliveryFee, store?.plan ?? settings.standard, settings.feeRate);
  const amount = stage === "first" ? split.first : split.second;
  if (amount <= 0) return;
  const dueAt = stage === "first" ? new Date() : new Date(Date.now() + settings.finalAfterHours * 3_600_000);
  await db
    .insert(payouts)
    .values({ merchantId: order.merchantId!, orderId: order.id, stage, amount, fee: stage === "first" ? split.firstFee : split.secondFee, dueAt, reference: reference(order.orderNumber, stage) })
    .onConflictDoNothing();
}

/** A cancelled or refunded order: payouts not yet sent are called off, and what was already paid is owed back */
async function unwind(orderId: string) {
  await db.transaction(async (tx) => {
    await tx
      .update(payouts)
      .set({ status: "cancelled" })
      .where(and(eq(payouts.orderId, orderId), inArray(payouts.status, ["scheduled", "held", "failed"])));
    const paid = await tx
      .select({ merchantId: payouts.merchantId, amount: payouts.amount })
      .from(payouts)
      .where(and(eq(payouts.orderId, orderId), eq(payouts.status, "paid"), inArray(payouts.stage, ["first", "final"])));
    const owed = paid.reduce((n, p) => n + p.amount, 0);
    if (!owed) return;
    const [order] = await tx.select({ orderNumber: orders.orderNumber }).from(orders).where(eq(orders.id, orderId));
    await tx
      .insert(payouts)
      .values({ merchantId: paid[0].merchantId, orderId, stage: "payback", amount: owed, status: "owed", reference: reference(order.orderNumber, "payback") })
      .onConflictDoUpdate({ target: payouts.reference, set: { amount: owed } });
  });
}

/** Sends one payout. Admins can send before it's due (`force`); automatic sending only sends what's due
 *  to accounts in the business's or owner's name that haven't just changed. */
export async function sendPayout(id: string, opts: { actorId: string | null; force?: boolean }) {
  const claimed = await db.transaction(async (tx) => {
    const [p] = await tx.select().from(payouts).where(eq(payouts.id, id)).for("update");
    if (!p) throw notFound("Payout not found");
    if (p.stage === "payback") throw badRequest("Paybacks are settled, not sent");
    if (!["scheduled", "failed"].includes(p.status)) throw badRequest(`This payout is ${p.status}`);
    if (!opts.force && p.dueAt > new Date()) throw badRequest("This payout isn't due yet");
    const [order] = await tx.select({ status: orders.status, orderNumber: orders.orderNumber }).from(orders).where(eq(orders.id, p.orderId));
    if (!order || order.status === "cancelled" || order.status === "refunded") throw badRequest("The order was cancelled or refunded");
    const [store] = await tx.select().from(merchants).where(eq(merchants.id, p.merchantId));
    if (!store?.payoutBankCode || !store.payoutAccountNumber || !store.payoutVerifiedAt) throw badRequest("The store hasn't added a checked payout account");
    if (provider() === "bachs" && !store.payoutRecipientId) throw badRequest("The store needs to save its payout account again before it can be paid");
    if (!opts.actorId && (!store.payoutAccountMatch || Date.now() - store.payoutVerifiedAt.getTime() < 86_400_000)) {
      throw badRequest("This account needs an admin to send the first payout");
    }
    const [row] = await tx
      .update(payouts)
      .set({
        status: "sending",
        provider: provider(),
        attempts: sql`${payouts.attempts} + 1`,
        sentAt: new Date(),
        failureReason: null,
        bankCode: store.payoutBankCode,
        bankName: store.payoutBankName,
        accountNumber: store.payoutAccountNumber,
        accountName: store.payoutAccountName,
      })
      .where(eq(payouts.id, id))
      .returning();
    await audit(tx, { actorId: opts.actorId, action: "payout.send", entityType: "payout", entityId: id, details: { amount: p.amount, stage: p.stage, auto: !opts.actorId } });
    return { row, recipientId: store.payoutRecipientId, orderNumber: order.orderNumber };
  });

  const { row } = claimed;
  const settings = await payoutSettings();
  let sent: RailResult;
  try {
    sent = await railSend({
      recipientId: claimed.recipientId,
      bankCode: row.bankCode!,
      accountNumber: row.accountNumber!,
      amount: row.amount,
      cover: settings.bankFeeCover,
      reference: row.reference,
      group: claimed.orderNumber,
      narration: `Sotechy ${claimed.orderNumber} ${row.stage === "first" ? "first" : "final"} payment`,
    });
  } catch (err) {
    // Safe to retry: the payout service won't accept the same reference twice
    const why = err instanceof Error ? err.message : "The payout service didn't answer";
    await db.update(payouts).set({ status: "failed", failureReason: why }).where(eq(payouts.id, id));
    throw err instanceof HttpError ? err : new HttpError(502, why);
  }
  await db.update(payouts).set({ providerId: sent.providerId, transferId: sent.transferId }).where(eq(payouts.id, id));
  await applyTransfer(id, sent);
  const [done] = await db.select().from(payouts).where(eq(payouts.id, id));
  return done;
}

/** Records what the payout service says happened */
async function applyTransfer(payoutId: string, t: Pick<RailResult, "status" | "failureReason">) {
  if (t.status === "paid") {
    const [p] = await db
      .update(payouts)
      .set({ status: "paid", paidAt: new Date() })
      .where(and(eq(payouts.id, payoutId), eq(payouts.status, "sending")))
      .returning();
    // Paid out for an order that was cancelled while the transfer was on its way: it's owed back
    if (p) {
      const [order] = await db.select({ status: orders.status }).from(orders).where(eq(orders.id, p.orderId));
      if (order?.status === "cancelled" || order?.status === "refunded") await unwind(p.orderId);
    }
  } else if (t.status === "failed") {
    await db
      .update(payouts)
      .set({ status: "failed", failureReason: t.failureReason ?? "The bank didn't accept the payout" })
      .where(and(eq(payouts.id, payoutId), eq(payouts.status, "sending")));
  }
}

/** A webhook named this payout: check it with the service that sent it before changing anything */
export async function transferWebhook(ref: string, providerId: string) {
  const [p] = await db.select().from(payouts).where(eq(payouts.reference, ref));
  if (!p) return;
  const [store] = await db.select({ recipientId: merchants.payoutRecipientId }).from(merchants).where(eq(merchants.id, p.merchantId));
  const t = await railCheck({ provider: p.provider, providerId: p.providerId ?? providerId, recipientId: store?.recipientId ?? null });
  if (t.reference !== p.reference) return;
  if (!p.providerId) await db.update(payouts).set({ providerId: t.providerId }).where(eq(payouts.id, p.id));
  await applyTransfer(p.id, t);
}

/** Every couple of minutes: catch transfers whose webhook didn't arrive, and send due payouts when that's switched on */
export async function payoutRound() {
  const stuck = await db
    .select({ id: payouts.id, provider: payouts.provider, providerId: payouts.providerId, recipientId: merchants.payoutRecipientId })
    .from(payouts)
    .innerJoin(merchants, eq(merchants.id, payouts.merchantId))
    .where(and(eq(payouts.status, "sending"), lte(payouts.sentAt, new Date(Date.now() - 2 * 60_000))))
    .limit(25);
  for (const p of stuck) {
    if (!p.providerId) continue;
    await railCheck({ provider: p.provider, providerId: p.providerId, recipientId: p.recipientId })
      .then((t) => applyTransfer(p.id, t))
      .catch((err) => console.warn("Payout check failed:", err instanceof Error ? err.message : err));
  }

  const settings = await payoutSettings();
  if (!settings.autoSend) return;
  const due = await db
    .select({ id: payouts.id })
    .from(payouts)
    .where(and(eq(payouts.status, "scheduled"), lte(payouts.dueAt, new Date()), or(eq(payouts.stage, "first"), eq(payouts.stage, "final"))))
    .orderBy(asc(payouts.dueAt))
    .limit(10);
  for (const p of due) {
    await sendPayout(p.id, { actorId: null }).catch((err) => {
      // Waiting on an admin (new or unmatched account) isn't a failure worth shouting about
      if (!(err instanceof HttpError && err.status === 400)) console.warn("Automatic payout failed:", err instanceof Error ? err.message : err);
    });
  }
}

/** A store's payouts and paybacks, newest first */
export async function payoutsFor(where: { merchantId?: string; status?: string }) {
  return db
    .select({ p: payouts, orderNumber: orders.orderNumber, storeName: merchants.name, storeTicker: merchants.ticker, ready: sql<boolean>`${merchants.payoutVerifiedAt} is not null` })
    .from(payouts)
    .innerJoin(orders, eq(orders.id, payouts.orderId))
    .innerJoin(merchants, eq(merchants.id, payouts.merchantId))
    .where(and(where.merchantId ? eq(payouts.merchantId, where.merchantId) : undefined, where.status ? sql`${payouts.status}::text = ${where.status}` : undefined))
    .orderBy(sql`${payouts.createdAt} desc`)
    .limit(500);
}

export const toPayoutRow = ({ p, orderNumber }: { p: typeof payouts.$inferSelect; orderNumber: string }) => ({
  id: p.id,
  orderId: p.orderId,
  orderNumber,
  stage: p.stage,
  amount: p.amount,
  fee: p.fee,
  status: p.status,
  dueAt: p.dueAt.toISOString(),
  sentAt: p.sentAt?.toISOString() ?? null,
  paidAt: p.paidAt?.toISOString() ?? null,
  failureReason: p.failureReason,
  bankName: p.bankName,
  accountLast4: p.accountNumber?.slice(-4) ?? null,
  createdAt: p.createdAt.toISOString(),
});
