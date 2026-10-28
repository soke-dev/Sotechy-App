// Webhooks from outside services. Each one proves it's genuine before anything is trusted.
import { timingSafeEqual } from "node:crypto";
import { Hono } from "hono";
import { env } from "../env";
import { bachsWebhookIsGenuine } from "../services/bachs";
import { applyIdResult, webhookIsGenuine } from "../services/didit";
import { transferWebhook } from "../services/payouts";
import { bachsPaymentEvent } from "./payments";

/** Flutterwave sends back the secret hash set on the webhook in its dashboard */
const sameSecret = (given: string | undefined, expected: string | undefined) =>
  !!given && !!expected && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));

export const webhookRoutes = new Hono()
  /** Didit: a merchant's ID check changed (Console → Webhooks → URL https://<api>/webhooks/didit) */
  .post("/didit", async (c) => {
    const raw = await c.req.text();
    if (!webhookIsGenuine(raw, (name) => c.req.header(name))) return c.json({ error: "Invalid signature" }, 401);
    const event = JSON.parse(raw) as { session_id?: string; status?: string; decision?: Record<string, unknown> };
    if (event.session_id && event.status) await applyIdResult(event.session_id, event.status, event.decision);
    return c.json({ ok: true });
  })
  /** Bachs (Developer Portal → Webhooks → URL https://<api>/webhooks/bachs): a store's payout reached its bank or failed
   *  (Connect events payout.paid and payout.failed), or a customer paid by bank transfer (checkout.completed,
   *  collection.succeeded, collection.underpaid). Each is checked with Bachs itself first. */
  .post("/bachs", async (c) => {
    const raw = await c.req.text();
    if (!bachsWebhookIsGenuine(raw, (name) => c.req.header(name))) return c.json({ error: "Invalid signature" }, 401);
    const event = JSON.parse(raw) as { type?: string; data?: { id?: string; reference?: string; checkout_id?: string; object?: { id?: string; reference?: string } } };
    // A customer's bank transfer for an order (Payments events): the checkout is read from Bachs before the order changes
    if ((event.type === "checkout.completed" || event.type?.startsWith("collection.")) && event.data?.checkout_id) {
      try {
        await bachsPaymentEvent(event.data.checkout_id);
      } catch (err) {
        console.warn("Bachs payment webhook:", err instanceof Error ? err.message : err);
        return c.json({ error: "Try again" }, 500);
      }
      return c.json({ ok: true });
    }
    const payout = event.data?.object ?? event.data;
    if ((event.type === "payout.paid" || event.type === "payout.failed") && payout?.reference && payout.id) {
      await transferWebhook(payout.reference, payout.id).catch((err) => console.warn("Bachs payout webhook:", err instanceof Error ? err.message : err));
    }
    return c.json({ ok: true });
  })
  /** Flutterwave: a payout transfer finished (Settings → Webhooks → URL https://<api>/webhooks/flutterwave).
   *  The payout is then checked with Flutterwave itself before its status changes. */
  .post("/flutterwave", async (c) => {
    if (!sameSecret(c.req.header("verif-hash"), env.FLUTTERWAVE_WEBHOOK_HASH)) return c.json({ error: "Invalid signature" }, 401);
    const event = (await c.req.json().catch(() => null)) as { event?: string; data?: { id?: number | string; reference?: string } } | null;
    if (event?.event === "transfer.completed" && event.data?.reference && event.data.id != null) {
      await transferWebhook(event.data.reference, String(event.data.id)).catch((err) => console.warn("Payout webhook:", err instanceof Error ? err.message : err));
    }
    return c.json({ ok: true });
  });
