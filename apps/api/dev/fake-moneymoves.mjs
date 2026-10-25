// Local stand-in for the Money Moves Business API (same shapes as docs.usemoneymoves.xyz), so the
// whole pay-and-return flow can be tested without real money. Used by `pnpm dev:local` only.
// It serves a simple payment page; choosing a method marks the checkout paid, sends a signed
// webhook to the API exactly like Money Moves does, and sends the customer back.
import crypto from "node:crypto";
import { createServer } from "node:http";

export function startFakeMoneyMoves({ port, publicUrl, webhookUrl, key, webhookSecret }) {
  const checkouts = new Map();
  const payments = new Map();
  const idempotency = new Map();
  let n = 0;
  const id = (prefix) => `${prefix}${Date.now().toString(36)}${(++n).toString(36)}`;

  const json = (res, status, body) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };
  const fail = (res, status, code, message) => json(res, status, { error: { code, message, request_id: "req_local" } });
  const naira = (n) => `₦${Number(n).toLocaleString("en-NG")}`;
  const escape = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  async function sendWebhook(type, payment) {
    const event = { id: id("evt_"), object: "event", type, mode: "test", created_at: new Date().toISOString(), data: { object: payment } };
    const body = JSON.stringify(event);
    const t = Math.floor(Date.now() / 1000);
    const v1 = crypto.createHmac("sha256", webhookSecret).update(`${t}.${body}`).digest("hex");
    try {
      const r = await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json", "mm-signature": `t=${t},v1=${v1}`, "mm-event-id": event.id }, body });
      console.log(`[money moves] ${type} → API ${r.status}`);
    } catch (err) {
      console.log(`[money moves] webhook failed: ${err.message}`);
    }
  }

  function payPage(co) {
    const methods = [
      ["bank_transfer", "Bank transfer", "Transfer from any Nigerian bank"],
      ["crypto", "Crypto", "$MOVE, USDC and other coins"],
      ["app", "Money Moves app", "Approve in the app"],
    ];
    const done = co.status !== "open";
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Money Moves (local test)</title>
<style>body{font-family:system-ui,sans-serif;background:#0B0B0C;color:#fff;margin:0;padding:24px}main{max-width:420px;margin:0 auto}
.tag{display:inline-block;background:#FDB913;color:#111;border-radius:999px;padding:3px 10px;font-size:12px;font-weight:700}
.amount{font-size:34px;font-weight:800;margin:6px 0}.muted{color:#aaa;font-size:14px}
button{display:block;width:100%;text-align:left;margin:10px 0;padding:16px;border-radius:14px;border:1px solid #333;background:#18181b;color:#fff;font-size:16px}
button small{display:block;color:#aaa;margin-top:2px}a{color:#FDB913}</style></head><body><main>
<span class="tag">LOCAL TEST · no real money</span>
<p class="muted" style="margin-top:18px">Paying ${escape(co.customer?.name ?? "")} · ${escape(co.description)}</p>
<div class="amount">${naira(co.amount)}</div>
${done ? `<p>This checkout is ${co.status}.</p>` : `<form method="post" action="/pay/${co.id}/confirm">
${methods.map(([value, label, hint]) => `<button name="method" value="${value}">${label}<small>${hint}</small></button>`).join("")}
<button name="method" value="underpaid" style="border-color:#7a5a12">Simulate an underpayment<small>Sends payment.underpaid</small></button>
</form>`}
<p class="muted"><a href="/pay/${co.id}/leave">Back to the shop without paying</a></p>
</main></body></html>`;
  }

  async function readBody(req) {
    let s = "";
    for await (const c of req) s += c;
    return s;
  }

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, "http://local");
    const raw = await readBody(req);

    // Hosted payment page
    const page = url.pathname.match(/^\/pay\/([^/]+)(\/confirm|\/leave)?$/);
    if (page) {
      const co = checkouts.get(page[1]);
      if (!co) return fail(res, 404, "not_found", "No such checkout");
      if (!page[2]) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        return res.end(payPage(co));
      }
      if (page[2] === "/confirm" && req.method === "POST" && co.status === "open") {
        const method = new URLSearchParams(raw).get("method") ?? "bank_transfer";
        const underpaid = method === "underpaid";
        const p = {
          id: id("pay_"), object: "payment", mode: "test", status: underpaid ? "underpaid" : "successful", reference: `MMB-LOCAL${n}`,
          checkout: co.id, checkout_reference: co.reference, metadata: co.metadata, currency: "NGN", amount_ngn: co.amount,
          amount_usd: +(co.amount / 1550).toFixed(2), received_ngn: underpaid ? Math.round(co.amount * 0.9) : co.amount, fee_ngn: 0,
          method: underpaid ? "bank_transfer" : method, receipt_url: null, created_at: new Date().toISOString(), paid_at: new Date().toISOString(),
        };
        payments.set(p.id, p);
        if (!underpaid) Object.assign(co, { status: "paid", payment: p });
        await sendWebhook(`payment.${p.status}`, p);
      }
      res.writeHead(303, { Location: co.redirect_url ?? `/pay/${co.id}` });
      return res.end();
    }

    // API (Bearer key, like Money Moves)
    if (req.headers.authorization !== `Bearer ${key}`) return fail(res, 401, "no_key", "No key, or not in the form Bearer sk_…");
    const path = url.pathname.replace(/^\/api\/v1/, "");
    if (req.method === "GET" && path === "/account") return json(res, 200, { object: "account", merchant_id: "m_local", name: "Sotechy (local test)", mode: "test", verified: true, key: { name: "local", prefix: key.slice(0, 10) } });
    if (req.method === "GET" && path === "/rates") return json(res, 200, { object: "rate", base: "USD", quote: "NGN", ngn_per_usd: 1550, as_of: new Date().toISOString() });
    if (req.method === "POST" && path === "/checkouts") {
      const k = req.headers["idempotency-key"];
      if (k && idempotency.has(k)) return json(res, 201, checkouts.get(idempotency.get(k)));
      const b = JSON.parse(raw || "{}");
      if (!(b.amount >= 100 && b.amount <= 1_000_000)) return fail(res, 400, "bad_amount", "The amount has to be between ₦100.00 and ₦1,000,000.00.");
      const coId = id("co_");
      const co = {
        id: coId, object: "checkout", mode: "test", status: "open", url: `${publicUrl}/pay/${coId}`, amount: b.amount, currency: b.currency,
        description: b.description, reference: b.reference, metadata: b.metadata, methods: ["bank_transfer", "app", "crypto"], customer: b.customer,
        fee_payer: null, redirect_url: b.redirect_url ?? null, payment: null, expires_at: b.expires_at ?? null, created_at: new Date().toISOString(),
      };
      checkouts.set(coId, co);
      if (k) idempotency.set(k, coId);
      return json(res, 201, co);
    }
    const m = path.match(/^\/(checkouts|payments)\/([^/]+)$/);
    if (req.method === "GET" && m) {
      const obj = (m[1] === "checkouts" ? checkouts : payments).get(m[2]);
      return obj ? json(res, 200, obj) : fail(res, 404, "not_found", "Not found");
    }
    fail(res, 404, "not_found", `${req.method} ${path}`);
  });

  return new Promise((resolve) => server.listen(port, "0.0.0.0", () => resolve(server)));
}
