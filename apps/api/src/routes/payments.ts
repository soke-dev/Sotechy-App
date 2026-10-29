// App payments: stablecoin on a Money Moves hosted checkout; bank transfer on a Money Moves direct checkout
// or a Bachs checkout (Admin → Settings picks which). Customers come back to the app afterwards, and orders are
// confirmed from signed webhooks or while the app waits, each payment re-read from the provider first.
import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db, schema } from "../db/client";
import { env, publicApiUrl } from "../env";
import { audit } from "../lib/audit";
import { requireAuth, type AppEnv } from "../lib/auth";
import { badRequest, conflict, HttpError, notFound } from "../lib/errors";
import { requireFeature } from "../services/features";
import { createCheckout, createDirectCheckout, MoneyMovesError, retrieveCheckout, retrievePayment, verifyWebhookSignature, type MMEvent, type MMPayment } from "../services/moneymoves";
import { confirmPayment } from "../services/orders";
import { bachsCheckout, bachsCheckoutPaid, bachsCreateCheckout, type BachsCheckout } from "../services/bachs";
import { bankProvider, bankTransferAvailable, stablecoinAvailable } from "../services/bank-pay";
import { FEATURE_REF, settleFeaturing } from "../services/featuring";
import { settleWalkIn, WALK_IN_REF } from "../services/walk-in";

const isUuid = (v: string | null | undefined): v is string => !!v && /^[0-9a-f-]{36}$/i.test(v);

/**
 * Checkout we opened for a payment, kept on payments.raw until the payment completes. `bank` = a bank transfer
 * checkout, on Money Moves (direct) or, with `provider: "bachs"`, on Bachs.
 */
type SavedCheckout = { id: string; url: string; attempt: number; bank?: boolean; provider?: "bachs" };

/** A saved checkout as its provider has it now: open (with its page), paid (settled here), or neither */
async function lookUp(saved: SavedCheckout): Promise<{ state: "open" | "paid" | "other"; url: string; expiresAt: string | null }> {
  if (saved.provider === "bachs") {
    const s = await bachsCheckout(saved.id).catch(() => null);
    if (!s) return { state: "other", url: saved.url, expiresAt: null };
    if (bachsCheckoutPaid(s)) {
      await settleFromBachs(s);
      return { state: "paid", url: saved.url, expiresAt: null };
    }
    return { state: s.status === "open" ? "open" : "other", url: s.checkout_url ?? saved.url, expiresAt: s.expires_at ?? null };
  }
  const mm = await retrieveCheckout(saved.id, !!saved.bank).catch(() => null);
  if (mm?.status === "paid") {
    if (mm.payment) await settleFromMoneyMoves(mm.payment.id);
    return { state: "paid", url: mm.url, expiresAt: null };
  }
  return { state: mm?.status === "open" ? "open" : "other", url: mm?.url ?? saved.url, expiresAt: mm?.expires_at ?? null };
}

/** Applies a paid Bachs checkout to our payment (its reference is "<payment id>:<attempt>"). Read from Bachs, never from a webhook body. */
export async function settleFromBachs(s: BachsCheckout) {
  const ourId = s.reference?.split(":")[0];
  if (!isUuid(ourId) || !bachsCheckoutPaid(s)) return;
  const charge = s.charge;
  if ((charge?.currency ?? s.currency ?? "NGN").toUpperCase() !== "NGN") return;
  if (charge?.status === "underpaid") {
    await db
      .update(schema.payments)
      .set({ verificationNote: `Underpaid on Bachs (${charge.id}): received ₦${charge.amount} by bank transfer`, raw: s })
      .where(and(eq(schema.payments.id, ourId), eq(schema.payments.status, "pending")));
    await audit(db, { actorId: null, action: "payment.underpaid", entityType: "payment", entityId: ourId, details: { provider: "bachs", checkout: s.checkout_id, received: charge.amount } });
    return;
  }
  await confirmPayment(ourId, {
    amountPaid: Number(charge?.amount ?? s.amount ?? 0),
    providerReference: charge?.id ?? s.checkout_id,
    provider: "bachs",
    raw: s,
    verifiedBy: null,
    note: `Bachs ${s.checkout_id} · bank transfer`,
  });
}

/** A Bachs payments event (checkout.completed, collection.succeeded, collection.underpaid): re-read its checkout and settle */
export async function bachsPaymentEvent(checkoutId: string) {
  await settleFromBachs(await bachsCheckout(checkoutId));
}

/** What a refused direct checkout means for the customer (Money Moves → Direct payments → If a call is refused) */
const DIRECT_REFUSED: Record<string, string> = {
  direct_off: "Bank transfer isn't available right now. Please pay with stablecoin.",
  direct_daily_limit: "Bank transfer has reached today's limit. Please pay with stablecoin, or try again tomorrow.",
  direct_busy: "Too many payments for this amount are open right now. Please try again in a few minutes, or pay with stablecoin.",
};
const savedCheckout = (raw: unknown): SavedCheckout | null => {
  const c = (raw as { checkout?: SavedCheckout } | null)?.checkout;
  return c?.id ? c : null;
};

/** Applies a Money Moves payment to ours. The webhook body is only a hint: we read the payment from the API. */
export async function settleFromMoneyMoves(paymentId: string) {
  const p: MMPayment = await retrievePayment(paymentId);
  const ourId = p.checkout_reference;
  if (ourId?.startsWith(FEATURE_REF)) return settleFeaturing(ourId.slice(FEATURE_REF.length), p);
  if (ourId?.startsWith(WALK_IN_REF)) return settleWalkIn(ourId.slice(WALK_IN_REF.length), p);
  if (!isUuid(ourId)) return; // not one of our checkouts (e.g. a payment link)
  if (p.status === "successful") {
    // "successful" means the full amount arrived. A bank transfer can be a few kobo over (received_ngn).
    await confirmPayment(ourId, {
      amountPaid: Math.max(p.amount_ngn, p.received_ngn ?? 0),
      providerReference: p.id,
      provider: "moneymoves",
      raw: p,
      verifiedBy: null,
      note: `Money Moves ${p.reference}${p.method ? ` · ${p.method.replace("_", " ")}` : ""}`,
    });
  } else if (p.status === "underpaid") {
    // Funds are held by Money Moves; staff decide whether to ask for the rest or refund.
    await db
      .update(schema.payments)
      .set({ verificationNote: `Underpaid on Money Moves (${p.reference}): received ₦${p.received_ngn ?? 0} of ₦${p.amount_ngn}`, raw: p })
      .where(and(eq(schema.payments.id, ourId), eq(schema.payments.status, "pending")));
    await audit(db, { actorId: null, action: "payment.underpaid", entityType: "payment", entityId: ourId, details: { provider: "moneymoves", reference: p.reference, received: p.received_ngn, due: p.amount_ngn } });
  }
  // "expired": nothing to do. The order's stock hold lapses on its own and the customer can pay again.
}

/** When each payment was last asked about, so a waiting app can't call Money Moves more than every few seconds */
const lastAsked = new Map<string, number>();
const ASK_EVERY_MS = 4000;

export const paymentRoutes = new Hono<AppEnv>()
  /**
   * The app asks this while the customer waits. If the order's checkout is paid at its provider we settle it
   * straight away, without waiting for the webhook (a bank transfer is matched about a minute after it lands).
   */
  .post("/online/check", requireAuth, zValidator("json", z.object({ orderId: z.uuid() })), async (c) => {
    const { orderId } = c.req.valid("json");
    const status = async () =>
      (await db.select({ status: schema.orders.status }).from(schema.orders).where(and(eq(schema.orders.id, orderId), eq(schema.orders.customerId, c.get("user").id))))[0]?.status;
    const before = await status();
    if (!before) throw notFound("Order not found");
    if (before !== "pending_payment") return c.json({ status: before });
    const [payment] = await db
      .select()
      .from(schema.payments)
      .where(and(eq(schema.payments.orderId, orderId), eq(schema.payments.status, "pending")));
    const saved = payment && savedCheckout(payment.raw);
    if (!saved || Date.now() - (lastAsked.get(payment.id) ?? 0) < ASK_EVERY_MS) return c.json({ status: before });
    lastAsked.set(payment.id, Date.now());
    if (lastAsked.size > 5000) lastAsked.clear();
    await lookUp(saved).catch(() => {});
    return c.json({ status: (await status()) ?? before });
  })

  /**
   * Opens (or reuses) a checkout for one of the customer's unpaid orders: stablecoin on Money Moves' hosted
   * checkout, or `method: "bank"` for a bank transfer through the provider chosen in Admin → Settings.
   */
  .post("/online/initialize", requireAuth, zValidator("json", z.object({ orderId: z.uuid(), method: z.enum(["stablecoin", "bank"]).default("stablecoin") })), async (c) => {
    await requireFeature("ordering", "Online ordering is paused right now");
    const user = c.get("user");
    const { orderId, method } = c.req.valid("json");
    const bank = method === "bank";
    if (bank ? !(await bankTransferAvailable()) : !(await stablecoinAvailable())) {
      throw new HttpError(503, bank ? "Bank transfer isn't available right now. Please pay with stablecoin." : "Stablecoin payments aren't available right now. Please pay by bank transfer.");
    }
    const provider = bank ? await bankProvider() : "moneymoves";
    const [order] = await db
      .select()
      .from(schema.orders)
      .where(and(eq(schema.orders.id, orderId), eq(schema.orders.customerId, user.id)));
    if (!order) throw notFound("Order not found");
    if (order.status !== "pending_payment" || order.paymentMethod !== "online") throw badRequest("This order is not awaiting payment");

    const [payment] = await db
      .select()
      .from(schema.payments)
      .where(and(eq(schema.payments.orderId, orderId), eq(schema.payments.status, "pending")));
    if (!payment) throw badRequest("No pending payment for this order");

    // Reuse an open checkout so one order never has two live payment pages (unless the customer switches how they pay).
    const saved = savedCheckout(payment.raw);
    if (saved) {
      const existing = await lookUp(saved);
      const minuteLeft = !existing.expiresAt || new Date(existing.expiresAt).getTime() > Date.now() + 60_000;
      const same = !!saved.bank === bank && (saved.provider ?? "moneymoves") === provider;
      if (existing.state === "open" && minuteLeft && same) return c.json({ checkoutUrl: existing.url });
      if (existing.state === "paid") throw conflict("This order is already paid. It will update in a moment.");
    }

    const [customer] = await db.select({ email: schema.users.email, fullName: schema.users.fullName }).from(schema.users).where(eq(schema.users.id, user.id));
    // Counted even after the page was dropped (e.g. the tokens changed), so a new page never reuses an old key
    const attempt = ((payment.raw as { checkout?: { attempt?: number } } | null)?.checkout?.attempt ?? saved?.attempt ?? 0) + 1;
    // A page lasts up to an hour (at least six minutes, never past the order's deadline); a fresh one opens after that.
    const expiresAt = new Date(Math.max(Math.min(order.reservationExpiresAt?.getTime() ?? Infinity, Date.now() + 60 * 60_000), Date.now() + 6 * 60_000));
    const returnUrl = publicApiUrl ? `${publicApiUrl}/payments/return?order=${order.id}` : undefined;
    const metadata = { order_id: order.id, order_number: order.orderNumber };
    if (provider === "bachs") {
      if (!returnUrl) throw new HttpError(503, "Bank transfer isn't available right now. Please pay with stablecoin.");
      // Amount comes from the database, never from the client. Bachs keeps every reference, so each page gets a new one.
      const s = await bachsCreateCheckout({ reference: `${payment.id}:${attempt}`, amount: payment.amount, customer: { email: customer.email, name: customer.fullName }, returnUrl, expiresAt, metadata });
      if (!s.checkout_url) throw new HttpError(502, "Bank transfer didn't open. Please try again.");
      await db
        .update(schema.payments)
        .set({ provider: "bachs", raw: { checkout: { id: s.checkout_id, url: s.checkout_url, attempt, bank: true, provider: "bachs" } satisfies SavedCheckout } })
        .where(eq(schema.payments.id, payment.id));
      return c.json({ checkoutUrl: s.checkout_url });
    }
    let checkout;
    try {
      // Amount comes from the database, never from the client.
      checkout = await (bank ? createDirectCheckout : createCheckout)({
        reference: payment.id,
        idempotencyKey: `${payment.id}-${attempt}`,
        amount: payment.amount,
        description: `Sotechy Shop order ${order.orderNumber}`,
        customer: { email: customer.email, name: customer.fullName },
        redirectUrl: returnUrl,
        expiresAt,
        metadata,
      });
    } catch (err) {
      if (bank && err instanceof MoneyMovesError && DIRECT_REFUSED[err.code]) throw new HttpError(503, DIRECT_REFUSED[err.code]);
      if (err instanceof MoneyMovesError && err.code === "bad_amount") {
        throw badRequest("Online payment works for orders from ₦100 to ₦1,000,000. Please split the order, or contact us to pay another way.");
      }
      throw err;
    }
    await db
      .update(schema.payments)
      .set({ provider: "moneymoves", raw: { checkout: { id: checkout.id, url: checkout.url, attempt, ...(bank && { bank }) } satisfies SavedCheckout } })
      .where(eq(schema.payments.id, payment.id));
    return c.json({ checkoutUrl: checkout.url });
  })

  /** Money Moves and Bachs send customers here after paying; we hand them back to the app. */
  .get("/return", (c) => {
    const order = c.req.query("order");
    const deepLink = `${env.APP_SCHEME}://${isUuid(order) ? `order/${order}` : "orders"}`;
    const href = JSON.stringify(deepLink);
    return c.html(`<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Back to Sotechy</title>
<style>body{font-family:system-ui,sans-serif;background:#FAF7F3;color:#17120E;text-align:center;padding:64px 24px}a{display:inline-block;margin-top:16px;background:#17120E;color:#fff;padding:14px 22px;border-radius:999px;text-decoration:none;font-weight:600}</style>
</head><body><h2>Thanks!</h2><p>Head back to the Sotechy app to see your order.</p><a href=${href}>Open Sotechy</a>
<script>location.href=${href}</script></body></html>`);
  })

  /** Money Moves webhook: signed with mm-signature; each event handled once. */
  .post("/webhooks/moneymoves", async (c) => {
    if (!env.MONEYMOVES_WEBHOOK_SECRET) return c.json({ error: "Not configured" }, 503);
    const raw = await c.req.text();
    if (!verifyWebhookSignature(raw, c.req.header("mm-signature"))) return c.json({ error: "Invalid signature" }, 400);

    const event = JSON.parse(raw) as MMEvent;
    if (event.type === "webhook.test") return c.json({ received: true });
    const [fresh] = await db.insert(schema.webhookEvents).values({ id: event.id, provider: "moneymoves", type: event.type }).onConflictDoNothing().returning();
    if (!fresh) return c.json({ received: true, duplicate: true });

    try {
      if (event.type.startsWith("payment.")) {
        await settleFromMoneyMoves(event.data.object.id);
      } else {
        // Refunds, disputes, settlements and payouts are recorded for staff to see in the audit log.
        await audit(db, { actorId: null, action: `moneymoves.${event.type}`, entityType: event.data.object.object ?? "event", details: { id: event.data.object.id, event: event.id } });
      }
    } catch (err) {
      // Forget the event so Money Moves' retry gets processed.
      await db.delete(schema.webhookEvents).where(eq(schema.webhookEvents.id, event.id));
      throw err;
    }
    return c.json({ received: true });
  });
