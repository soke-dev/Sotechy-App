// Money Moves adapter (online payments).
//
// NOT IMPLEMENTED YET: fill in the three functions below from Money Moves' API documentation.
// Everything around them (amounts from the database, the webhook route, idempotent order
// confirmation, stock commit, audit log) is already wired up in routes/payments.ts.
//
// Until this is done, the "online" payment method must stay disabled in Admin → Settings.
import { env } from "../env";
import { HttpError } from "../lib/errors";

export interface ProviderTransaction {
  /** Our reference (the payment id we sent when creating the checkout) */
  reference: string;
  status: "success" | "failed" | "pending";
  /** Amount actually paid, in NGN (convert from kobo if Money Moves uses minor units) */
  amount: number;
  currency: string;
  /** Money Moves' own transaction id */
  providerId: string;
  raw: unknown;
}

export const moneyMovesConfigured = () => Boolean(env.MONEYMOVES_API_URL && env.MONEYMOVES_SECRET_KEY);

const notImplemented = () =>
  new HttpError(501, "Money Moves integration is not implemented yet (apps/api/src/services/moneymoves.ts)");

function assertConfigured() {
  if (!moneyMovesConfigured()) throw new HttpError(503, "Online payments are not configured yet");
}

/** Creates a hosted checkout for the exact amount due and returns the URL to send the customer to. */
export async function createCheckout(_input: {
  reference: string;
  amount: number;
  currency: "NGN";
  email: string;
  callbackUrl?: string;
  metadata: Record<string, string>;
}): Promise<{ checkoutUrl: string }> {
  assertConfigured();
  // TODO(Money Moves): call the create-payment/checkout endpoint with MONEYMOVES_SECRET_KEY.
  throw notImplemented();
}

/** Proves a webhook request really came from Money Moves. Must return false until implemented. */
export function verifyWebhookSignature(_rawBody: string, _headers: Headers): boolean {
  // TODO(Money Moves): verify the signature header using MONEYMOVES_WEBHOOK_SECRET as documented
  // (typically an HMAC of the raw body compared with crypto.timingSafeEqual).
  return false;
}

/** Looks a transaction up on Money Moves' API. Never trust a webhook body on its own. */
export async function fetchTransaction(_reference: string): Promise<ProviderTransaction> {
  assertConfigured();
  // TODO(Money Moves): fetch the transaction by our reference and map it to ProviderTransaction.
  throw notImplemented();
}

/** Placeholder naira-per-dollar rate, used until the Money Moves rate endpoint is connected. */
const PLACEHOLDER_USD_NGN = 1550;
const RATE_TTL_MS = 10 * 60 * 1000;
let rateCache: { rate: number; source: "moneymoves" | "placeholder"; updatedAt: string; at: number } | null = null;

/** Naira per 1 US dollar (cached for 10 minutes). Shown next to prices as a dollar estimate. */
export async function getUsdRate() {
  if (rateCache && Date.now() - rateCache.at < RATE_TTL_MS) return rateCache;
  // TODO(Money Moves): fetch the live USD→NGN rate here and set source: "moneymoves".
  rateCache = { rate: PLACEHOLDER_USD_NGN, source: "placeholder", updatedAt: new Date().toISOString(), at: Date.now() };
  return rateCache;
}
