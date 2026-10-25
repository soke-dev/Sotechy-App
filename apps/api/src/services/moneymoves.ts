// Money Moves Business API (https://docs.usemoneymoves.xyz).
// Customers pay on Money Moves' hosted checkout by bank transfer, crypto or the Money Moves app.
// We hear about payments by signed webhook and re-read each payment from the API before
// marking an order paid. Keys: sk_test_… (test mode) or sk_live_… (live), webhook secret whsec_….
import crypto from "node:crypto";
import { env } from "../env";
import { HttpError } from "../lib/errors";
import { getSetting } from "./settings";

const API = (env.MONEYMOVES_API_URL || "https://business.usemoneymoves.xyz/api/v1").replace(/\/+$/, "");

export const moneyMovesConfigured = () => Boolean(env.MONEYMOVES_SECRET_KEY);
export const moneyMovesMode = (): "test" | "live" | null =>
  !env.MONEYMOVES_SECRET_KEY ? null : env.MONEYMOVES_SECRET_KEY.startsWith("sk_live_") ? "live" : "test";

/** A Money Moves API error, with its stable code (docs → Errors). */
export class MoneyMovesError extends HttpError {
  constructor(
    public providerStatus: number,
    public code: string,
    message: string,
    public requestId?: string,
  ) {
    // Their 4xx means our request needs fixing; anything else is "provider unavailable".
    super(providerStatus >= 400 && providerStatus < 500 && providerStatus !== 401 && providerStatus !== 429 ? 400 : 502, message, { provider: "moneymoves", code, requestId });
  }
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown, idempotencyKey?: string): Promise<T> {
  if (!env.MONEYMOVES_SECRET_KEY) throw new HttpError(503, "Online payments are not configured yet");
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${env.MONEYMOVES_SECRET_KEY}`,
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new HttpError(502, "Couldn't reach Money Moves. Please try again.");
  }
  const json = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string; request_id?: string } } | null;
  if (!res.ok) {
    const e = json?.error;
    throw new MoneyMovesError(res.status, e?.code ?? "unknown", e?.message ?? `Money Moves returned ${res.status}`, e?.request_id);
  }
  return json as T;
}

export interface MMPayment {
  id: string;
  object: "payment";
  mode: "test" | "live";
  status: "successful" | "underpaid" | "expired" | (string & {});
  reference: string;
  checkout: string | null;
  /** The reference we sent when creating the checkout (our payment id) */
  checkout_reference: string | null;
  metadata: Record<string, unknown> | null;
  currency: string;
  amount_ngn: number;
  amount_usd: number | null;
  received_ngn: number | null;
  fee_ngn: number | null;
  method: string | null;
  receipt_url: string | null;
  paid_at: string | null;
}

export interface MMCheckout {
  id: string;
  object: "checkout";
  mode: "test" | "live";
  status: "open" | "paid" | "expired" | "cancelled";
  url: string;
  amount: number;
  currency: string;
  reference: string | null;
  payment: MMPayment | null;
  expires_at: string | null;
}

export interface MMEvent {
  id: string;
  object: "event";
  type: string;
  mode: "test" | "live";
  data: { object: { id: string; object: string } & Record<string, unknown> };
}

/** Creates a hosted checkout for the exact amount due. The idempotency key stops retries making duplicates. */
export function createCheckout(input: {
  reference: string;
  idempotencyKey: string;
  amount: number;
  description: string;
  customer: { email: string; name?: string | null };
  redirectUrl?: string;
  expiresAt?: Date;
  metadata: Record<string, string>;
}) {
  return call<MMCheckout>(
    "POST",
    "/checkouts",
    {
      amount: input.amount,
      currency: "NGN",
      reference: input.reference,
      description: input.description.slice(0, 200),
      customer: { email: input.customer.email, ...(input.customer.name ? { name: input.customer.name } : {}) },
      ...(input.redirectUrl ? { redirect_url: input.redirectUrl } : {}),
      ...(input.expiresAt ? { expires_at: input.expiresAt.toISOString() } : {}),
      metadata: input.metadata,
    },
    input.idempotencyKey,
  );
}

export const retrieveCheckout = (id: string) => call<MMCheckout>("GET", `/checkouts/${encodeURIComponent(id)}`);
export const retrievePayment = (id: string) => call<MMPayment>("GET", `/payments/${encodeURIComponent(id)}`);
export const getAccount = () =>
  call<{ object: "account"; merchant_id: string; name: string; mode: "test" | "live"; verified: boolean; key?: { name: string; prefix: string } }>("GET", "/account");

/**
 * Checks the `mm-signature` header: `t=<unix seconds>,v1=<hex HMAC-SHA256 of "{t}.{raw body}">`.
 * Rejects anything older than five minutes to stop replays.
 */
export function verifyWebhookSignature(rawBody: string, header: string | null | undefined, nowMs = Date.now()): boolean {
  const secret = env.MONEYMOVES_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  let t = NaN;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const i = part.indexOf("=");
    const key = part.slice(0, i).trim();
    const value = part.slice(i + 1).trim();
    if (key === "t") t = Number(value);
    if (key === "v1" && /^[0-9a-f]{64}$/i.test(value)) signatures.push(value.toLowerCase());
  }
  if (!Number.isFinite(t) || signatures.length === 0 || Math.abs(nowMs / 1000 - t) > 300) return false;
  const expected = Buffer.from(crypto.createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex"), "hex");
  return signatures.some((s) => {
    const given = Buffer.from(s, "hex");
    return given.length === expected.length && crypto.timingSafeEqual(given, expected);
  });
}

// ---------------------------------------------------------------------------
// Dollar exchange rate (shown as "≈ $" next to prices)
// ---------------------------------------------------------------------------
export interface FxSettings {
  /** "moneymoves" = live rate; "manual" = manualRate */
  source: "moneymoves" | "manual";
  manualRate: number | null;
}

/** Used only when there's no live rate and no manual rate. */
const FALLBACK_USD_NGN = 1550;
const RATE_TTL_MS = 10 * 60 * 1000;
let liveRate: { rate: number; updatedAt: string; at: number } | null = null;

/** Naira per 1 US dollar. Manual rate from Admin → Settings wins; otherwise Money Moves' live rate (cached 10 min). */
export async function getUsdRate(): Promise<{ rate: number; source: "moneymoves" | "manual" | "placeholder"; updatedAt: string }> {
  const fx = await getSetting<FxSettings>("fx");
  if (fx?.source === "manual" && fx.manualRate && fx.manualRate > 0) {
    return { rate: fx.manualRate, source: "manual", updatedAt: new Date().toISOString() };
  }
  if (liveRate && Date.now() - liveRate.at < RATE_TTL_MS) return { rate: liveRate.rate, source: "moneymoves", updatedAt: liveRate.updatedAt };
  if (moneyMovesConfigured()) {
    try {
      const r = await call<{ ngn_per_usd: number; as_of: string }>("GET", "/rates");
      if (r.ngn_per_usd > 0) {
        liveRate = { rate: r.ngn_per_usd, updatedAt: r.as_of, at: Date.now() };
        return { rate: r.ngn_per_usd, source: "moneymoves", updatedAt: r.as_of };
      }
    } catch {
      // Rate unavailable (Money Moves returns 503 rather than a stale rate): keep the last good one.
      if (liveRate) return { rate: liveRate.rate, source: "moneymoves", updatedAt: liveRate.updatedAt };
    }
  }
  return { rate: fx?.manualRate || FALLBACK_USD_NGN, source: "placeholder", updatedAt: new Date().toISOString() };
}
