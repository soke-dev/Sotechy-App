// Payment provider integrations.
// - Paystack (card / online bank): real integration, needs PAYSTACK_SECRET_KEY.
// - Crypto (MOVE etc.): NOT implemented yet — needs the chosen provider or a Movement chain verifier.
import { createHmac, timingSafeEqual } from "node:crypto";
import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db, schema } from "../db/client";
import { env } from "../env";
import { requireAuth, type AppEnv } from "../lib/auth";
import { badRequest, HttpError, notFound } from "../lib/errors";
import { confirmPayment } from "../services/orders";

const PAYSTACK_API = "https://api.paystack.co";

async function paystack<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!env.PAYSTACK_SECRET_KEY) throw new HttpError(503, "Card payments are not configured yet");
  const res = await fetch(`${PAYSTACK_API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json", ...init.headers },
  });
  const body = (await res.json()) as { status: boolean; message: string; data: T };
  if (!res.ok || !body.status) throw new HttpError(502, `Paystack: ${body.message}`);
  return body.data;
}

export const paymentRoutes = new Hono<AppEnv>()
  /** Starts a Paystack checkout for one of the customer's unpaid card orders. */
  .post("/card/initialize", requireAuth, zValidator("json", z.object({ orderId: z.uuid() })), async (c) => {
    const user = c.get("user");
    const { orderId } = c.req.valid("json");
    const [order] = await db
      .select()
      .from(schema.orders)
      .where(and(eq(schema.orders.id, orderId), eq(schema.orders.customerId, user.id)));
    if (!order) throw notFound("Order not found");
    if (order.status !== "pending_payment" || order.paymentMethod !== "card") throw badRequest("This order is not awaiting card payment");

    const [payment] = await db
      .select()
      .from(schema.payments)
      .where(and(eq(schema.payments.orderId, orderId), eq(schema.payments.status, "pending")));
    if (!payment) throw badRequest("No pending payment for this order");

    // Amount comes from the database, never from the client. Paystack expects kobo.
    const data = await paystack<{ authorization_url: string; reference: string }>("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email: user.email,
        amount: Math.round(payment.amount * 100),
        currency: "NGN",
        reference: payment.id,
        callback_url: env.PAYSTACK_CALLBACK_URL || undefined,
        metadata: { orderId, orderNumber: order.orderNumber },
      }),
    });
    await db.update(schema.payments).set({ provider: "paystack" }).where(eq(schema.payments.id, payment.id));
    return c.json({ authorizationUrl: data.authorization_url });
  })

  /** Paystack webhook: signature-verified, then re-verified against the Paystack API before confirming. */
  .post("/webhooks/paystack", async (c) => {
    if (!env.PAYSTACK_SECRET_KEY) return c.json({ error: "Not configured" }, 503);
    const raw = await c.req.text();
    const signature = c.req.header("x-paystack-signature") ?? "";
    const expected = createHmac("sha512", env.PAYSTACK_SECRET_KEY).update(raw).digest("hex");
    const valid = signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    if (!valid) return c.json({ error: "Invalid signature" }, 401);

    const event = JSON.parse(raw) as { event: string; data: { reference: string } };
    if (event.event !== "charge.success") return c.json({ received: true });

    const tx = await paystack<{ status: string; amount: number; currency: string; reference: string; id: number }>(
      `/transaction/verify/${encodeURIComponent(event.data.reference)}`,
    );
    if (tx.status !== "success" || tx.currency !== "NGN") return c.json({ received: true });

    await confirmPayment(tx.reference, {
      amountPaid: tx.amount / 100,
      providerReference: String(tx.id),
      provider: "paystack",
      raw: tx,
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
