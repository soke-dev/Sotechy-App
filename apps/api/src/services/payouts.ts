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
import { sendEmailLater } from "../lib/email";
import { sendWhatsAppLater } from "../lib/whatsapp";
import { env } from "../env";
import { payoutApprovalEmail, payoutSentEmail } from "../emails/templates";
import { sendPushLater } from "./push";
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
  const [created] = await db
    .insert(payouts)
    .values({ merchantId: order.merchantId!, orderId: order.id, stage, amount, fee: stage === "first" ? split.firstFee : split.secondFee, dueAt, reference: reference(order.orderNumber, stage) })
    .onConflictDoNothing()
    .returning();
  if (created) void tellAdmins(created, order.orderNumber);
}

/** Every payout waits for an admin: they get an email and a WhatsApp message when one is set up */
async function tellAdmins(p: typeof payouts.$inferSelect, orderNumber: string) {
  const [store] = await db.select({ name: merchants.name }).from(merchants).where(eq(merchants.id, p.merchantId));
  const admins = await db.select({ email: schema.users.email, name: schema.users.fullName, phone: schema.users.phone }).from(schema.users).where(eq(schema.users.role, "admin"));
  const stage = p.stage === "first" ? "First payment" : "Final payment";
  for (const a of admins) sendEmailLater(payoutApprovalEmail(a.email, { name: a.name, store: store?.name ?? "A store", orderNumber, stage, amount: p.amount, dueAt: p.dueAt }));
  const phones = [...admins.map((a) => a.phone ?? ""), ...env.ADMIN_ALERT_PHONES.split(",").map((x) => x.trim())];
  // Template: "Sotechy: the {{1}} of {{2}} to {{3}} for order {{4}} needs your approval…"
  sendWhatsAppLater(phones, env.WHATSAPP_PAYOUT_TEMPLATE, [stage.toLowerCase(), `₦${p.amount.toLocaleString("en-NG")}`, store?.name ?? "a store", orderNumber]);
}

/** The store hears when money is on its way to its bank */
async function tellStorePaid(p: typeof payouts.$inferSelect) {
  const [row] = await db
    .select({ store: merchants.name, ownerId: merchants.ownerId, email: schema.users.email, contactEmail: merchants.contactEmail, orderNumber: orders.orderNumber })
    .from(merchants)
    .innerJoin(orders, eq(orders.id, p.orderId))
    .leftJoin(schema.users, eq(schema.users.id, merchants.ownerId))
    .where(eq(merchants.id, p.merchantId));
  if (!row) return;
  const stage = p.stage === "first" ? "First payment" : "Final payment";
  // The store's contact email (where its order emails go) and the owner's sign-in email, once each
  for (const to of [...new Set([row.contactEmail, row.email].filter((e): e is string => !!e).map((e) => e.toLowerCase()))]) {
    sendEmailLater(
      payoutSentEmail(to, {
        store: row.store,
        amount: p.amount,
        bank: p.bankName ?? "your bank",
        account: `••••${p.accountNumber?.slice(-4) ?? ""}`,
        reference: p.reference,
        orders: [{ number: row.orderNumber, amount: p.amount, stage }],
      }),
    );
  }
  if (row.ownerId) sendPushLater([row.ownerId], { title: "Payout sent", body: `₦${p.amount.toLocaleString("en-NG")} for ${row.orderNumber} is on its way to your bank`, data: { url: "/payouts" } });
}

/** The customer confirmed they got the order: the store's final payment is due now rather than after the wait.
 *  `release` also frees one held because the customer had said it didn't arrive. */
export async function finalDueNow(orderId: string, release = false) {
  await db
    .update(payouts)
    .set({ dueAt: new Date(), status: "scheduled" })
    .where(and(eq(payouts.orderId, orderId), eq(payouts.stage, "final"), inArray(payouts.status, release ? ["scheduled", "held"] : ["scheduled"])));
}

/** The customer says it didn't arrive: the final payment waits for Sotechy to look into it */
export async function holdFinal(orderId: string) {
  await db
    .update(payouts)
    .set({ status: "held" })
    .where(and(eq(payouts.orderId, orderId), eq(payouts.stage, "final"), eq(payouts.status, "scheduled")));
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
      transferId: row.transferId,
      // Kept the moment the money moves, so a retry days later can't move it again
      onTransfer: async (transferId) => {
        await db.update(payouts).set({ transferId }).where(eq(payouts.id, id));
      },
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

/** An admin paid the store from Sotechy's bank themselves: the payout is recorded as paid to the store's
 *  default account and the store hears about it, as if it had gone through the payout service. */
export async function markPaidByHand(id: string, opts: { actorId: string; reference: string | null }) {
  const row = await db.transaction(async (tx) => {
    const [p] = await tx.select().from(payouts).where(eq(payouts.id, id)).for("update");
    if (!p) throw notFound("Payout not found");
    if (p.stage === "payback") throw badRequest("Paybacks are settled, not paid");
    if (!["scheduled", "failed", "held"].includes(p.status)) throw badRequest(`This payout is ${p.status}`);
    const [store] = await tx.select().from(merchants).where(eq(merchants.id, p.merchantId));
    const [updated] = await tx
      .update(payouts)
      .set({
        status: "paid",
        provider: "manual",
        providerId: opts.reference,
        sentAt: new Date(),
        paidAt: new Date(),
        failureReason: null,
        bankCode: store?.payoutBankCode ?? p.bankCode,
        bankName: store?.payoutBankName ?? p.bankName,
        accountNumber: store?.payoutAccountNumber ?? p.accountNumber,
        accountName: store?.payoutAccountName ?? p.accountName,
      })
      .where(eq(payouts.id, id))
      .returning();
    await audit(tx, { actorId: opts.actorId, action: "payout.paid_by_hand", entityType: "payout", entityId: id, details: { amount: p.amount, stage: p.stage, reference: opts.reference } });
    return updated;
  });
  void tellStorePaid(row);
  // Paid for an order that's since been cancelled: it's owed back
  const [order] = await db.select({ status: orders.status }).from(orders).where(eq(orders.id, row.orderId));
  if (order?.status === "cancelled" || order?.status === "refunded") await unwind(row.orderId);
  return row;
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
      void tellStorePaid(p);
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

/** Every couple of minutes: catch payouts whose webhook didn't arrive */
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

  // Nothing is sent automatically: every payout waits for an admin to approve it
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
