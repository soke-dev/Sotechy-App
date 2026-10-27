// Bachs (https://docs.bachs.io) for paying marketplace stores. Each store gets a recipient-only Connect
// account holding its bank account; a payout moves the store's share from Sotechy's balance to that
// account (a transfer), then from the account to its bank (a payout). Amounts are decimal strings in naira.
// Locally without a key it stands in for Bachs, so the flow can be tried end to end.
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Bank } from "@sotechy/shared";
import { env } from "../env";
import { HttpError } from "../lib/errors";
import { NIGERIAN_BANKS, readBanks } from "./banks";

export const bachsReady = () => !!env.BACHS_SECRET_KEY;
const standIn = () => !env.BACHS_SECRET_KEY && env.NODE_ENV !== "production";
// Live keys talk to production, sandbox keys to the sandbox
const base = () => env.BACHS_API_URL ?? (env.BACHS_SECRET_KEY?.startsWith("sk_live_") ? "https://api.bachs.io" : "https://sandbox-api.bachs.io");
const naira = (n: number) => n.toFixed(2);

type Json = Record<string, unknown>;
async function call<T = Json>(method: "GET" | "POST", path: string, opts: { body?: unknown; account?: string; idempotencyKey?: string } = {}): Promise<T> {
  if (!env.BACHS_SECRET_KEY) throw new HttpError(503, "Payouts aren't set up yet");
  const res = await fetch(base() + path, {
    method,
    headers: {
      Authorization: `Bearer ${env.BACHS_SECRET_KEY}`,
      "Content-Type": "application/json",
      ...(opts.account && { "X-Account-Id": opts.account }),
      ...(opts.idempotencyKey && { "Idempotency-Key": opts.idempotencyKey }),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json().catch(() => null)) as Json | null;
  if (!res.ok) {
    const err = (json?.error ?? json) as Json | string | null;
    const message = typeof err === "string" ? err : ((err?.message as string) ?? (err?.code as string) ?? `Bachs error (${res.status})`);
    throw new HttpError(res.status >= 500 ? 502 : 400, message);
  }
  return json as T;
}
/** Lists come back as { items: [...] } */
const itemsOf = (json: unknown): Json[] => (Array.isArray(json) ? json : (((json as Json)?.items ?? (json as Json)?.data ?? []) as Json[]));

let banksCache: { at: number; banks: Bank[] } | null = null;
/** Nigerian banks with their codes, A to Z (kept for a day). Bachs' list, or ours when it comes back empty. */
export async function bachsBanks(): Promise<Bank[]> {
  if (standIn()) return NIGERIAN_BANKS;
  if (banksCache && Date.now() - banksCache.at < 86_400_000) return banksCache.banks;
  let banks: Bank[] = [];
  try {
    const json = await call("GET", "/v1/reference/banks?country=NG");
    banks = readBanks(json);
    if (!banks.length) console.warn("Bachs bank list came back empty:", JSON.stringify(json).slice(0, 400));
  } catch (err) {
    console.warn("Bachs bank list failed:", err instanceof Error ? err.message : err);
  }
  if (!banks.length) return NIGERIAN_BANKS;
  banksCache = { at: Date.now(), banks };
  return banks;
}

/** The name on a bank account. `standInName` is what the local stand-in answers with. */
export async function bachsResolve(bankCode: string, accountNumber: string, standInName: string): Promise<string> {
  if (standIn()) return standInName.toUpperCase();
  try {
    const r = await call("POST", "/v1/misc/bank-accounts/resolve", { body: { account_number: accountNumber, bank_code: bankCode } });
    const name = r.account_name ?? r.accountName ?? (r.data as Json | undefined)?.account_name;
    if (!name) throw new HttpError(400, "No name came back");
    return String(name);
  } catch (err) {
    if (err instanceof HttpError && err.status === 400) throw new HttpError(400, "We couldn't find that account. Check the bank and the 10-digit number.");
    throw err;
  }
}

/** Makes (or updates) the store's Bachs account that its payouts go through. Returns its id. */
export async function bachsRecipient(input: {
  existingId: string | null;
  storeId: string;
  storeName: string;
  email: string;
  ownerName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
}): Promise<string> {
  if (standIn()) return input.existingId ?? `acct_standin_${input.storeId.slice(0, 8)}`;
  let id = input.existingId;
  if (!id) {
    const acct = await call("POST", "/v1/accounts", {
      idempotencyKey: `sotechy-store-${input.storeId}`,
      body: {
        contact_email: input.email,
        display_name: input.storeName,
        country: "NG",
        entity_type: "individual",
        configuration: { recipient: { capabilities: { transfers: { requested: true }, payouts: { requested: true } } } },
      },
    });
    id = String(acct.id);
    const [first, ...rest] = input.ownerName.trim().split(/\s+/);
    await call("POST", `/v1/accounts/${id}/persons`, {
      idempotencyKey: `sotechy-rep-${input.storeId}`,
      body: { first_name: first, last_name: rest.join(" ") || first, relationship: { representative: true, owner: true } },
    });
  }
  // A changed bank account goes back through Bachs' review
  await call("POST", `/v1/accounts/${id}`, {
    body: { fields: { payout_destination: { currency: "NGN", account_number: input.accountNumber, account_name: input.accountName, bank_code: input.bankCode } } },
  });
  return id;
}

export type BachsStatus = "pending" | "processing" | "completed" | "failed";
export interface BachsPayout {
  id: string;
  status: BachsStatus;
  reference: string;
  failureReason: string | null;
}
const toPayout = (p: Json): BachsPayout => ({
  id: String(p.id),
  status: String(p.status) as BachsStatus,
  reference: String(p.reference ?? ""),
  failureReason: (p.failure_reason as string) ?? null,
});

/** Moves the store's share to its Bachs account, then to its bank. `cover` is the bank fee Sotechy pays on top.
 *  Both steps carry idempotency keys from the payout's reference, so a retry never pays twice. */
export async function bachsSend(input: { recipientId: string; amount: number; cover: number; reference: string; group: string; narration: string }) {
  if (standIn()) return { transferId: `tr_standin_${input.reference}`, payout: { id: `po_standin_${input.reference}`, status: "completed" as BachsStatus, reference: input.reference, failureReason: null } };
  const transfer = await call("POST", "/v1/transfers", {
    idempotencyKey: `${input.reference}-transfer`,
    body: { destination: input.recipientId, amount: naira(input.amount + input.cover), currency: "NGN", transfer_group: input.group, description: input.narration },
  });
  const destinations = itemsOf(await call("GET", "/v1/payouts/destinations", { account: input.recipientId }));
  const destination = destinations.find((d) => d.is_usable && d.is_default) ?? destinations.find((d) => d.is_usable);
  if (!destination) throw new HttpError(400, "Sent to the store's Bachs balance, but Bachs is still checking its bank account. Retry once it's approved.");
  const payout = await call("POST", "/v1/payouts", {
    account: input.recipientId,
    idempotencyKey: `${input.reference}-payout`,
    body: { destination: destination.id, amount: naira(input.amount), reference: input.reference, narration: input.narration.slice(0, 100) },
  });
  return { transferId: String(transfer.id), payout: toPayout(payout) };
}

/** A payout as Bachs has it now (webhooks are checked against this before anything changes) */
export async function bachsPayout(id: string, recipientId: string): Promise<BachsPayout> {
  if (id.startsWith("po_standin_")) return { id, status: "completed", reference: id.slice("po_standin_".length), failureReason: null };
  return toPayout(await call("GET", `/v1/payouts/${encodeURIComponent(id)}`, { account: recipientId }));
}

/** Naira available in Sotechy's Bachs balance; null when it can't be read */
export async function bachsBalance(): Promise<number | null> {
  if (standIn()) return null;
  try {
    const json = await call("GET", "/v1/balances");
    const rows = [...itemsOf(json), ...((json.balances as Json[] | undefined) ?? [])];
    const ngn = rows.find((b) => String(b.currency).toUpperCase() === "NGN");
    return ngn ? Number(ngn.available_balance ?? ngn.available ?? 0) : null;
  } catch {
    return null;
  }
}

/** Bachs signs each delivery: HMAC-SHA256 of "<timestamp>.<raw body>", sent as t=…,v1=… (several v1 while a secret
 *  rotates). Its docs and dashboard name the header differently, so either name is accepted, and a bare signature
 *  takes its time from the timestamp header. */
export function bachsWebhookIsGenuine(raw: string, header: (name: string) => string | undefined) {
  const secret = env.BACHS_WEBHOOK_SECRET;
  const sig = header("x-bachs-signature-v2") ?? header("bachs-signature-v2") ?? header("bachs-signature") ?? header("x-bachs-signature");
  if (!secret || !sig) return false;
  const parts = sig.includes("=")
    ? sig.split(",").map((p) => p.trim().split("="))
    : [["t", header("x-bachs-timestamp") ?? header("bachs-timestamp") ?? ""], ["v1", sig.trim()]];
  const t = parts.find(([k]) => k === "t")?.[1];
  if (!t || Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex");
  return parts.some(([k, v]) => k === "v1" && !!v && v.length === expected.length && timingSafeEqual(Buffer.from(v), Buffer.from(expected)));
}
