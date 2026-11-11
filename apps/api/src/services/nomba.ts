// Nomba (https://developer.nomba.com): checking the name on a bank account when a store adds its payout account,
// and customers paying in naira on Nomba's own checkout page (bank transfer or card), when Admin → Settings picks
// Nomba for "Pay with bank transfer".
// Locally without keys it stands in, so the flow can be tried end to end.
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Bank } from "@sotechy/shared";
import { env } from "../env";
import { NIGERIAN_BANKS } from "./banks";
import { HttpError } from "../lib/errors";

export const nombaReady = () => !!(env.NOMBA_CLIENT_ID && env.NOMBA_CLIENT_SECRET && env.NOMBA_ACCOUNT_ID);
const base = () => (env.NOMBA_API_URL ?? "https://api.nomba.com").replace(/\/$/, "");

type Json = Record<string, unknown>;
type NombaReply<T> = { code?: string; description?: string; message?: string; data?: T };

/** Access tokens last 30 minutes; a new one is fetched 5 minutes before that */
let token: { value: string; until: number } | null = null;
async function accessToken() {
  if (token && Date.now() < token.until) return token.value;
  const res = await fetch(`${base()}/v1/auth/token/issue`, {
    method: "POST",
    headers: { "Content-Type": "application/json", accountId: env.NOMBA_ACCOUNT_ID! },
    body: JSON.stringify({ grant_type: "client_credentials", client_id: env.NOMBA_CLIENT_ID, client_secret: env.NOMBA_CLIENT_SECRET }),
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => null)) as NombaReply<{ access_token?: string; expiresAt?: string }> | null;
  const value = json?.data?.access_token;
  if (!res.ok || json?.code !== "00" || !value) {
    console.error(`Nomba sign-in failed (${res.status}): ${json?.description ?? json?.message ?? "no answer"}`);
    throw new HttpError(503, "We can't check bank accounts right now. Please try again in a few minutes.");
  }
  const expires = json.data?.expiresAt ? new Date(json.data.expiresAt).getTime() : Date.now() + 30 * 60_000;
  token = { value, until: Math.min(expires, Date.now() + 30 * 60_000) - 5 * 60_000 };
  return value;
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<{ status: number; json: NombaReply<T> | null }> {
  const send = async () =>
    fetch(`${base()}${path}`, {
      method,
      headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json", accountId: env.NOMBA_ACCOUNT_ID! },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20_000),
    });
  let res = await send();
  // An expired token: sign in again once
  if (res.status === 401) {
    token = null;
    res = await send();
  }
  return { status: res.status, json: (await res.json().catch(() => null)) as NombaReply<T> | null };
}

let banksCache: { at: number; banks: Bank[] } | null = null;
/** Nomba's banks and their codes, A to Z (kept for a day); our own list without keys or if Nomba doesn't answer */
export async function payoutBanks(): Promise<Bank[]> {
  if (!nombaReady()) return NIGERIAN_BANKS;
  const banks = await nombaBanks().catch((err) => {
    console.warn("Nomba bank list failed:", err instanceof Error ? err.message : err);
    return [] as Bank[];
  });
  return banks.length ? banks : NIGERIAN_BANKS;
}

async function nombaBanks(): Promise<Bank[]> {
  if (banksCache && Date.now() - banksCache.at < 86_400_000) return banksCache.banks;
  const { json } = await call<Json[]>("GET", "/v1/transfers/banks");
  const banks = (Array.isArray(json?.data) ? json.data : [])
    .map((b) => ({ code: String(b.code ?? ""), name: String(b.name ?? "") }))
    .filter((b) => b.code && b.name)
    .sort((a, b) => a.name.localeCompare(b.name));
  if (banks.length) banksCache = { at: Date.now(), banks };
  return banks;
}

/** "Guaranty Trust Bank Plc" and "GTBank" both become "guarantytrust"/"gtbank" style keys for matching */
const key = (name: string) =>
  name
    .toLowerCase()
    .replace(/\b(plc|limited|ltd|bank|nigeria|nig|microfinance|mfb|of)\b/g, "")
    .replace(/[^a-z0-9]/g, "");

/**
 * The bank the store picked, as Nomba knows it: the same code, else the same name. Our bank list comes from
 * the payout service, so the two lists may label a bank differently.
 */
async function nombaCodeFor(bank: { code: string; name: string }) {
  const banks = await nombaBanks().catch(() => [] as Bank[]);
  if (!banks.length) return bank.code;
  const byCode = banks.find((b) => b.code === bank.code);
  if (byCode) return byCode.code;
  const k = key(bank.name);
  const byName = banks.find((b) => key(b.name) === k) ?? banks.find((b) => k && (key(b.name).includes(k) || k.includes(key(b.name))));
  return byName?.code ?? bank.code;
}

/** The name on a bank account, from Nomba. `standInName` is what the local stand-in answers with. */
export async function nombaResolve(bank: { code: string; name: string }, accountNumber: string, standInName: string): Promise<string> {
  if (!nombaReady()) {
    if (env.NODE_ENV !== "production") return standInName.toUpperCase();
    throw new HttpError(503, "We can't check bank accounts right now. Please try again in a few minutes.");
  }
  const bankCode = await nombaCodeFor(bank);
  const { status, json } = await call<{ accountNumber?: string; accountName?: string }>("POST", "/v1/transfers/bank/lookup", { accountNumber, bankCode });
  const name = json?.data?.accountName?.trim();
  if (json?.code === "00" && name) return name;
  if (status >= 500) {
    console.error(`Nomba lookup ${status}: ${json?.description ?? json?.message ?? "no answer"}`);
    throw new HttpError(502, "The bank didn't answer. Please try again in a minute.");
  }
  throw new HttpError(400, "We couldn't find that account. Check the bank and the 10-digit number.");
}

// ---------------------------------------------------------------------------
// Checkout: customers pay in naira on Nomba's hosted page
// ---------------------------------------------------------------------------

/**
 * A Nomba checkout page for a payment. `reference` is ours ("<payment id>:<attempt>", unique per page); Nomba sends the
 * customer back to `callbackUrl` afterwards. Amounts are naira.
 */
export async function nombaCreateCheckout(input: { reference: string; amount: number; email: string; customerId: string; callbackUrl?: string }) {
  const { json } = await call<{ checkoutLink?: string; orderReference?: string }>("POST", "/v1/checkout/order", {
    order: {
      orderReference: input.reference,
      customerId: input.customerId,
      customerEmail: input.email,
      amount: input.amount.toFixed(2),
      currency: "NGN",
      ...(input.callbackUrl && { callbackUrl: input.callbackUrl }),
    },
  });
  const link = json?.data?.checkoutLink;
  if (json?.code !== "00" || !link) {
    console.error(`Nomba checkout failed: ${json?.description ?? json?.message ?? "no answer"}`);
    throw new HttpError(502, "Bank transfer didn't open. Please try again.");
  }
  return { checkoutLink: link, nombaOrderId: json.data?.orderReference ?? null };
}

/** A checkout's payment as Nomba has it (looked up by our reference): paid only when Nomba says SUCCESS */
export type NombaCheckoutPayment = { paid: boolean; status: string; amount: number | null; transactionId: string | null; raw: unknown };

export async function nombaCheckoutPayment(reference: string): Promise<NombaCheckoutPayment> {
  const { json } = await call<Record<string, unknown>>("GET", `/v1/checkout/transaction?idType=ORDER_REFERENCE&id=${encodeURIComponent(reference)}`);
  const d = (json?.data ?? {}) as Record<string, unknown>;
  const order = (d.order ?? {}) as Record<string, unknown>;
  const tx = (d.transaction ?? d.transactionDetails ?? {}) as Record<string, unknown>;
  const status = String(d.status ?? tx.status ?? "").toUpperCase();
  const amount = Number(tx.transactionAmount ?? tx.amount ?? d.amount ?? order.amount ?? NaN);
  // What Nomba reported, for the logs: an order that stays open shows here too
  if (status || json?.code !== "00") console.log(`Nomba checkout ${reference}: code ${json?.code ?? "-"}, status ${status || "-"}, amount ${Number.isFinite(amount) ? amount : "-"}`);
  return {
    paid: json?.code === "00" && status === "SUCCESS",
    status,
    amount: Number.isFinite(amount) ? amount : null,
    transactionId: (tx.transactionId ?? tx.id ?? d.transactionId ?? null) as string | null,
    raw: json?.data ?? null,
  };
}

/**
 * Whether a webhook really came from Nomba: HMAC-SHA256 (base64) with the dashboard's signature key, over
 * event_type:requestId:userId:walletId:transactionId:type:time:responseCode:timestamp, compared with nomba-signature.
 */
export function nombaWebhookIsGenuine(raw: string, header: (name: string) => string | undefined) {
  if (!env.NOMBA_WEBHOOK_SECRET) return false;
  const signature = header("nomba-signature") ?? header("nomba-sig-value");
  const timestamp = header("nomba-timestamp");
  if (!signature || !timestamp) return false;
  let body: Record<string, any>;
  try {
    body = JSON.parse(raw);
  } catch {
    return false;
  }
  const d = body.data ?? {};
  const responseCode = d.transaction?.responseCode == null || d.transaction?.responseCode === "null" ? "" : String(d.transaction.responseCode);
  const message = [body.event_type, body.requestId, d.merchant?.userId, d.merchant?.walletId, d.transaction?.transactionId, d.transaction?.type, d.transaction?.time, responseCode, timestamp]
    .map((v) => (v == null ? "" : String(v)))
    .join(":");
  const expected = createHmac("sha256", env.NOMBA_WEBHOOK_SECRET).update(message).digest("base64");
  const a = Buffer.from(expected.toLowerCase());
  const b = Buffer.from(signature.toLowerCase());
  return a.length === b.length && timingSafeEqual(a, b);
}
