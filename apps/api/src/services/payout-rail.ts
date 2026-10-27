// Which service pays stores: Bachs (the default) or Flutterwave, chosen with PAYOUT_PROVIDER.
// Each payout remembers the service that sent it, so switching never loses track of one on its way.
import type { Bank } from "@sotechy/shared";
import { env } from "../env";
import { bachsBalance, bachsBanks, bachsPayout, bachsReady, bachsRecipient, bachsResolve, bachsSend } from "./bachs";
import { flutterwaveReady, getTransfer, nigerianBanks, payoutBalance, resolveAccount, sendTransfer, type Transfer } from "./flutterwave";
import { HttpError } from "../lib/errors";

export type PayoutProvider = "bachs" | "flutterwave";
export interface RailResult {
  providerId: string;
  transferId: string | null;
  status: "paid" | "sending" | "failed";
  failureReason: string | null;
}

export const provider = (): PayoutProvider => env.PAYOUT_PROVIDER;
export const providerName = (p: PayoutProvider = provider()) => (p === "bachs" ? "Bachs" : "Flutterwave");
export const railReady = () => (provider() === "bachs" ? bachsReady() : flutterwaveReady());
/** Locally without a key: pretend payouts, so the flow can be tried */
export const railStandIn = () => !railReady() && env.NODE_ENV !== "production";

export const railBanks = (): Promise<Bank[]> => (provider() === "bachs" ? bachsBanks() : nigerianBanks());
export const railResolve = (bankCode: string, accountNumber: string, standInName: string) =>
  provider() === "bachs" ? bachsResolve(bankCode, accountNumber, standInName) : resolveAccount(bankCode, accountNumber, standInName);
export const railBalance = () => (provider() === "bachs" ? bachsBalance() : payoutBalance());

/** Bachs pays through an account of the store's own; Flutterwave pays the bank directly (null) */
export const railRecipient = (input: Parameters<typeof bachsRecipient>[0]) => (provider() === "bachs" ? bachsRecipient(input) : Promise.resolve(null));

const fromFlutterwave = (t: Transfer): RailResult => ({
  providerId: t.id,
  transferId: null,
  status: t.status === "SUCCESSFUL" ? "paid" : t.status === "FAILED" ? "failed" : "sending",
  failureReason: t.status === "FAILED" ? (t.completeMessage ?? "The bank didn't accept the transfer") : null,
});

export async function railSend(input: { recipientId: string | null; bankCode: string; accountNumber: string; amount: number; cover: number; reference: string; group: string; narration: string }): Promise<RailResult & { provider: PayoutProvider }> {
  if (provider() === "flutterwave") {
    const t = await sendTransfer({ bankCode: input.bankCode, accountNumber: input.accountNumber, amount: input.amount, reference: input.reference, narration: input.narration });
    return { ...fromFlutterwave(t), provider: "flutterwave" };
  }
  if (!input.recipientId) throw new HttpError(400, "The store needs to save its payout account again before it can be paid");
  const { transferId, payout } = await bachsSend({ recipientId: input.recipientId, amount: input.amount, cover: input.cover, reference: input.reference, group: input.group, narration: input.narration });
  return {
    provider: "bachs",
    providerId: payout.id,
    transferId,
    status: payout.status === "completed" ? "paid" : payout.status === "failed" ? "failed" : "sending",
    failureReason: payout.status === "failed" ? (payout.failureReason ?? "The bank didn't accept the payout") : null,
  };
}

/** Where a payout is now, asked of the service that sent it */
export async function railCheck(p: { provider: string | null; providerId: string; recipientId: string | null }): Promise<RailResult & { reference: string }> {
  if (p.provider === "flutterwave") {
    const t = await getTransfer(p.providerId);
    return { ...fromFlutterwave(t), reference: t.reference };
  }
  if (!p.recipientId) throw new HttpError(400, "The store's Bachs account is missing");
  const b = await bachsPayout(p.providerId, p.recipientId);
  return {
    providerId: b.id,
    transferId: null,
    reference: b.reference,
    status: b.status === "completed" ? "paid" : b.status === "failed" ? "failed" : "sending",
    failureReason: b.status === "failed" ? (b.failureReason ?? "The bank didn't accept the payout") : null,
  };
}
