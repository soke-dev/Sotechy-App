// Webhooks from outside services. Each one proves it's genuine before anything is trusted.
import { Hono } from "hono";
import { applyIdResult, webhookIsGenuine } from "../services/didit";

export const webhookRoutes = new Hono()
  /** Didit: a merchant's ID check changed (Console → Webhooks → URL https://<api>/webhooks/didit) */
  .post("/didit", async (c) => {
    const raw = await c.req.text();
    if (!webhookIsGenuine(raw, (name) => c.req.header(name))) return c.json({ error: "Invalid signature" }, 401);
    const event = JSON.parse(raw) as { session_id?: string; status?: string; decision?: Record<string, unknown> };
    if (event.session_id && event.status) await applyIdResult(event.session_id, event.status, event.decision);
    return c.json({ ok: true });
  });
