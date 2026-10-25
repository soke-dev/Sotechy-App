// Payment provider routes.
// - Money Moves (online payments): routes are ready; the API calls live in services/moneymoves.ts
//   and still need Money Moves' documentation and credentials.
// - Crypto (MOVE etc.): NOT implemented yet — needs the chosen provider or a Movement chain verifier.
import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db, schema } from "../db/client";
import { env } from "../env";
import { requireAuth, type AppEnv } from "../lib/auth";
import { badRequest, notFound } from "../lib/errors";
import { createCheckout, fetchTransaction, moneyMovesConfigured, verifyWebhookSignature } from "../services/moneymoves";
import { confirmPayment } from "../services/orders";

export const paymentRoutes = new Hono<AppEnv>()
  /** Starts a Money Moves checkout for one of the customer's unpaid online-payment orders. */
  .post("/online/initialize", requireAuth, zValidator("json", z.object({ orderId: z.uuid() })), async (c) => {
    const user = c.get("user");
    const { orderId } = c.req.valid("json");
    const [order] = await db
      .select()
      .from(schema.orders)
      .where(and(eq(schema.orders.id, orderId), eq(schema.orders.customerId, user.id)));
    if (!order) throw notFound("Order not found");
    if (order.status !== "pending_payment" || order.paymentMethod !== "online") {
      throw badRequest("This order is not awaiting online payment");
    }

    const [payment] = await db
      .select()
      .from(schema.payments)
      .where(and(eq(schema.payments.orderId, orderId), eq(schema.payments.status, "pending")));
    if (!payment) throw badRequest("No pending payment for this order");

    // Amount comes from the database, never from the client.
    const { checkoutUrl } = await createCheckout({
      reference: payment.id,
      amount: payment.amount,
      currency: "NGN",
      email: user.email,
      callbackUrl: env.MONEYMOVES_CALLBACK_URL,
      metadata: { orderId, orderNumber: order.orderNumber },
    });
    await db.update(schema.payments).set({ provider: "moneymoves" }).where(eq(schema.payments.id, payment.id));
    return c.json({ checkoutUrl });
  })

  /** Money Moves webhook: signature-verified, then re-checked against Money Moves before confirming. */
  .post("/webhooks/moneymoves", async (c) => {
    if (!moneyMovesConfigured()) return c.json({ error: "Not configured" }, 503);
    const raw = await c.req.text();
    if (!verifyWebhookSignature(raw, c.req.raw.headers)) return c.json({ error: "Invalid signature" }, 401);

    // TODO(Money Moves): adjust to the real webhook payload shape.
    const event = JSON.parse(raw) as { reference?: string };
    if (!event.reference) return c.json({ received: true });

    const tx = await fetchTransaction(event.reference);
    if (tx.status !== "success" || tx.currency !== "NGN") return c.json({ received: true });

    await confirmPayment(tx.reference, {
      amountPaid: tx.amount,
      providerReference: tx.providerId,
      provider: "moneymoves",
      raw: tx.raw,
      verifiedBy: null,
    });
    return c.json({ received: true });
  })

  /** Placeholder: crypto payments must be verified on-chain or by a provider before an order is paid. */
  .post("/crypto/verify", requireAuth, (c) => {
    return c.json(
      {
        error: "Crypto payment verification is not implemented yet",
        details: "Integrate Sotechy's crypto payment provider or a Movement network verifier in apps/api/src/routes/payments.ts.",
      },
      501,
    );
  });
