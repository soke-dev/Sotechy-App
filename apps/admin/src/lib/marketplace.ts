// Fee rules, payout plan labels and token figures for the admin screens. Stores, orders, payouts, order
// reviews and featuring come from the API; token figures stay at zero until the Monad contract is live.

export const FEE = { rate: 0.02, reserveShare: 0.5, maxReviewBonus: 0.1, crossBonus: 0.1 };
/** Store value of one token: the reserve half of the fee, spread over the token plus its maximum review bonus */
export const TOKEN_VALUE = (FEE.rate * FEE.reserveShare) / (1 + FEE.maxReviewBonus);

export type MerchantStatus = "review" | "info" | "verified" | "suspended" | "rejected";
export type DocStatus = "accepted" | "rejected" | "unchecked";
export type DocKind = "id" | "address" | "cac" | "photos";

export interface MerchantDoc {
  id: string;
  kind: DocKind;
  label: string;
  file: "JPG" | "PDF" | "PNG";
  status: DocStatus;
  uploadedAt: string;
  /** What the reviewer should look at, or why it was turned down */
  note?: string;
}

export interface MerchantEvent {
  at: string;
  text: string;
  tone: "good" | "warn" | "bad" | "neutral";
}

export interface Merchant {
  id: string;
  name: string;
  kind: "Registered business" | "Freelancer";
  owner: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  ticker: string;
  regNumber?: string;
  status: MerchantStatus;
  appliedAt: string;
  products: number;
  sales30d: number;
  rating?: number;
  docs: MerchantDoc[];
  idCheck: { ok: boolean | null; note: string };
  payout: { bank: string; accountName: string; last4: string; matches: "business" | "owner" | null };
  states: string[];
  history: MerchantEvent[];
  teamNotes?: string;
  note?: string;
}



/** How many of a merchant's documents have been looked at */
export const docsChecked = (m: Pick<Merchant, "docs">) => m.docs.filter((d) => d.status !== "unchecked").length;



export interface TokenRow {
  ticker: string;
  merchant: string;
  issued: number;
  circulating: number;
  pending: number;
  holders: number;
  redeemed: number;
  contract: string;
}

export const tokens: TokenRow[] = [];

/** The token reserve: all zero until the Monad contracts and payments are live */
export const reserve = {
  walletNaira: 0,
  recyclingPool: 0,
  feesThisMonth: { total: 0, reserve: 0, revenue: 0 },
  posMintsThisMonth: 0,
  wallet: null as string | null,
};

export interface TokenEvent {
  id: string;
  kind: "release" | "pending" | "spend" | "bonus" | "pos";
  ticker: string;
  amount: number;
  who: string;
  at: string;
}

export const tokenEvents: TokenEvent[] = [];

export const TOKEN_EVENT = {
  release: { label: "Released", tone: "good" },
  pending: { label: "Pending", tone: "warn" },
  spend: { label: "Spent", tone: "info" },
  bonus: { label: "Review bonus", tone: "brand" },
  pos: { label: "Walk-in mint", tone: "neutral" },
} as const;


/** How a merchant is paid: the plan and the split live in the shared package, so the API pays the same numbers */
export { splitByPlan, type FeeTiming, type PayoutPlan } from "@sotechy/shared";
import type { FeeTiming, PayoutPlan } from "@sotechy/shared";

export const FEE_TIMING: Record<FeeTiming, { label: string; hint: string }> = {
  spread: { label: "Spread over both", hint: "Taken off the total before it's split, so each payment carries its share." },
  first: { label: "From the first payment", hint: "All of it comes out of the payment made when they accept." },
  last: { label: "From the last payment", hint: "Held back until delivery is confirmed. Good when you pay more up front." },
};

export const describePlan = (plan: PayoutPlan) => `${plan.firstPercent}% first · fee ${plan.fee === "spread" ? "spread over both" : plan.fee === "first" ? "from the first payment" : "from the last payment"}`;


/** Outstanding token value at store prices, against the naira the reserve holds */
export function reserveHealth() {
  const outstanding = tokens.reduce((n, t) => n + t.circulating + t.pending, 0) * TOKEN_VALUE;
  // null while no tokens are out yet (nothing to cover)
  return { outstanding, cover: outstanding > 0 ? reserve.walletNaira / outstanding : null };
}

export const formatTokens = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2)}M` : n.toLocaleString("en-NG"));
