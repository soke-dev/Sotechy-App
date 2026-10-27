// Flutterwave v3 for paying marketplace stores: bank list, account name checks and bank transfers.
// https://developer.flutterwave.com/v3.0/docs/introduction-6
// Locally without a key it stands in for Flutterwave (transfers succeed at once) so the payout
// flow can be tried end to end; in production without a key, payouts report that they aren't set up.
import type { Bank } from "@sotechy/shared";
import { env } from "../env";
import { HttpError } from "../lib/errors";

const BASE = "https://api.flutterwave.com/v3";
export const flutterwaveReady = () => !!env.FLUTTERWAVE_SECRET_KEY;
/** Locally without a key: pretend transfers, so the flow can be tried */
export const standIn = () => !env.FLUTTERWAVE_SECRET_KEY && env.NODE_ENV !== "production";

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  if (!env.FLUTTERWAVE_SECRET_KEY) throw new HttpError(503, "Payouts aren't set up yet");
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: `Bearer ${env.FLUTTERWAVE_SECRET_KEY}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json().catch(() => null)) as { status?: string; message?: string; data?: T } | null;
  if (!res.ok || json?.status !== "success") throw new HttpError(res.status >= 500 ? 502 : 400, json?.message ?? `Flutterwave error (${res.status})`);
  return json.data as T;
}

const STAND_IN_BANKS: Bank[] = [
  { code: "044", name: "Access Bank" },
  { code: "058", name: "GTBank" },
  { code: "011", name: "First Bank of Nigeria" },
  { code: "033", name: "United Bank for Africa" },
  { code: "057", name: "Zenith Bank" },
  { code: "50211", name: "Kuda Bank" },
  { code: "999992", name: "OPay" },
  { code: "50515", name: "Moniepoint MFB" },
];

let banksCache: { at: number; banks: Bank[] } | null = null;
/** Nigerian banks with their codes, A to Z (kept for a day) */
export async function nigerianBanks(): Promise<Bank[]> {
  if (standIn()) return STAND_IN_BANKS;
  if (banksCache && Date.now() - banksCache.at < 86_400_000) return banksCache.banks;
  const rows = await call<{ code: string; name: string }[]>("GET", "/banks/NG");
  const seen = new Set<string>();
  const banks = rows
    .filter((b) => b.code && b.name && !seen.has(b.code) && !!seen.add(b.code))
    .map((b) => ({ code: b.code, name: b.name.trim() }))
    .sort((a, b) => a.name.localeCompare(b.name));
  banksCache = { at: Date.now(), banks };
  return banks;
}

/** The name on a bank account. `standInName` is what the local stand-in answers with. */
export async function resolveAccount(bankCode: string, accountNumber: string, standInName: string): Promise<string> {
  if (standIn()) return standInName.toUpperCase();
  try {
    const data = await call<{ account_name: string }>("POST", "/accounts/resolve", { account_number: accountNumber, account_bank: bankCode });
    return data.account_name;
  } catch (err) {
    if (err instanceof HttpError && err.status === 400) throw new HttpError(400, "We couldn't find that account. Check the bank and the 10-digit number.");
    throw err;
  }
}

export type TransferStatus = "NEW" | "PENDING" | "SUCCESSFUL" | "FAILED";
export interface Transfer {
  id: string;
  status: TransferStatus;
  reference: string;
  amount: number;
  completeMessage: string | null;
}

const toTransfer = (d: { id: number | string; status: TransferStatus; reference: string; amount: number; complete_message?: string | null }): Transfer => ({
  id: String(d.id),
  status: d.status,
  reference: d.reference,
  amount: Number(d.amount),
  completeMessage: d.complete_message || null,
});

/** Sends naira to a Nigerian bank account. The reference makes it safe to retry: Flutterwave refuses a repeat. */
export async function sendTransfer(input: { bankCode: string; accountNumber: string; amount: number; reference: string; narration: string }): Promise<Transfer> {
  if (standIn()) return { id: `standin-${input.reference}`, status: "SUCCESSFUL", reference: input.reference, amount: input.amount, completeMessage: null };
  const data = await call<Parameters<typeof toTransfer>[0]>("POST", "/transfers", {
    account_bank: input.bankCode,
    account_number: input.accountNumber,
    amount: input.amount,
    currency: "NGN",
    debit_currency: "NGN",
    reference: input.reference,
    narration: input.narration.slice(0, 100),
  });
  return toTransfer(data);
}

/** A transfer as Flutterwave has it now (webhooks are checked against this before anything changes) */
export async function getTransfer(id: string): Promise<Transfer> {
  if (standIn() && id.startsWith("standin-")) return { id, status: "SUCCESSFUL", reference: id.slice("standin-".length), amount: 0, completeMessage: null };
  return toTransfer(await call<Parameters<typeof toTransfer>[0]>("GET", `/transfers/${encodeURIComponent(id)}`));
}

/** Naira available for payouts in the Flutterwave balance; null when it can't be read */
export async function payoutBalance(): Promise<number | null> {
  if (standIn()) return null;
  try {
    const data = await call<{ available_balance: number }>("GET", "/balances/NGN");
    return Number(data.available_balance);
  } catch {
    return null;
  }
}
