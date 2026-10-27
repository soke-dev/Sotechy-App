// Money Moves payments: start a hosted checkout for an order, send the customer back to the app
// afterwards, and confirm orders from signed webhooks (each payment re-read from the Money Moves API).
import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db, schema } from "../db/client";
import { env, publicApiUrl } from "../env";
import { audit } from "../lib/audit";
import { requireAuth, type AppEnv } from "../lib/auth";
import { badRequest, conflict, notFound } from "../lib/errors";
import { requireFeature } from "../services/features";
import { createCheckout, MoneyMovesError, retrieveCheckout, retrievePayment, verifyWebhookSignature, type MMEvent, type MMPayment } from "../services/moneymoves";
import { confirmPayment } from "../services/orders";
import { FEATURE_REF, settleFeaturing } from "../services/featuring";

const isUuid = (v: string | null | undefined): v is string => !!v && /^[0-9a-f-]{36}$/i.test(v);

/** Checkout we opened for a payment, kept on payments.raw until the payment completes. */
type SavedCheckout = { id: string; url: string; attempt: number };
const savedCheckout = (raw: unknown): SavedCheckout | null => {
  const c = (raw as { checkout?: SavedCheckout } | null)?.checkout;
  return c?.id ? c : null;
};

/** Applies a Money Moves payment to ours. The webhook body is only a hint: we read the payment from the API. */
export async function settleFromMoneyMoves(paymentId: string) {
  const p: MMPayment = await retrievePayment(paymentId);
  const ourId = p.checkout_reference;
  if (ourId?.startsWith(FEATURE_REF)) return settleFeaturing(ourId.slice(FEATURE_REF.length), p);
  if (!isUuid(ourId)) return; // not one of our checkouts (e.g. a payment link)
  if (p.status === "successful") {
    // "successful" means the full amount arrived.
    await confirmPayment(ourId, {
      amountPaid: p.amount_ngn,
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

export const paymentRoutes = new Hono<AppEnv>()
  /** Opens (or reuses) a Money Moves checkout for one of the customer's unpaid orders. */
  .post("/online/initialize", requireAuth, zValidator("json", z.object({ orderId: z.uuid() })), async (c) => {
    await requireFeature("ordering", "Online ordering is paused right now");
    const user = c.get("user");
    const { orderId } = c.req.valid("json");
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

    // Reuse an open checkout so one order never has two live payment pages.
    const saved = savedCheckout(payment.raw);
    if (saved) {
      const existing = await retrieveCheckout(saved.id).catch(() => null);
      const minuteLeft = !existing?.expires_at || new Date(existing.expires_at).getTime() > Date.now() + 60_000;
      if (existing?.status === "open" && minuteLeft) return c.json({ checkoutUrl: existing.url });
      if (existing?.status === "paid") {
        if (existing.payment) await settleFromMoneyMoves(existing.payment.id);
        throw conflict("This order is already paid. It will update in a moment.");
      }
    }

    const [customer] = await db.select({ email: schema.users.email, fullName: schema.users.fullName }).from(schema.users).where(eq(schema.users.id, user.id));
    const attempt = (saved?.attempt ?? 0) + 1;
    // Keep the payment page open about as long as the items are held (at least six minutes).
    const expiresAt = new Date(Math.max(order.reservationExpiresAt?.getTime() ?? 0, Date.now() + 6 * 60_000));
    let checkout;
    try {
      // Amount comes from the database, never from the client.
      checkout = await createCheckout({
        reference: payment.id,
        idempotencyKey: `${payment.id}-${attempt}`,
        amount: payment.amount,
        description: `Sotechy Shop order ${order.orderNumber}`,
        customer: { email: customer.email, name: customer.fullName },
        redirectUrl: publicApiUrl ? `${publicApiUrl}/payments/return?order=${order.id}` : undefined,
        expiresAt,
        metadata: { order_id: order.id, order_number: order.orderNumber },
      });
    } catch (err) {
      if (err instanceof MoneyMovesError && err.code === "bad_amount") {
        throw badRequest("Online payment works for orders from ₦100 to ₦1,000,000. Please split the order, or contact us to pay another way.");
      }
      throw err;
    }
    await db
      .update(schema.payments)
      .set({ provider: "moneymoves", raw: { checkout: { id: checkout.id, url: checkout.url, attempt } satisfies SavedCheckout } })
      .where(eq(schema.payments.id, payment.id));
    return c.json({ checkoutUrl: checkout.url });
  })

  /** Money Moves sends customers here after paying; we hand them back to the app. */
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
