// The account stores pay money back into when an order they were paid for is cancelled: the bank details
// in Admin > Settings (bank transfer), or Sotechy's collection account until those are filled in.
import { getSetting } from "./settings";

const SOTECHY_ACCOUNT = { bankName: "Nomba", accountName: "SOTECHY TECH VENTURES", accountNumber: "8641877928" };

export async function paybackAccount() {
  const saved = await getSetting<{ bankName: string | null; accountName: string | null; accountNumber: string | null }>("bank_transfer");
  return saved?.accountNumber ? { bankName: saved.bankName ?? "", accountName: saved.accountName ?? "", accountNumber: saved.accountNumber } : SOTECHY_ACCOUNT;
}
