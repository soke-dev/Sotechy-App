// Fee rules and payout plan labels for the admin screens. Everything else comes from the API.

export const FEE = { rate: 0.02, reserveShare: 0.5, maxReviewBonus: 0.1, crossBonus: 0.1 };

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



export { splitByPlan, type FeeTiming, type PayoutPlan } from "@sotechy/shared";
import type { FeeTiming, PayoutPlan } from "@sotechy/shared";

export const FEE_TIMING: Record<FeeTiming, { label: string; hint: string }> = {
  spread: { label: "Spread over both", hint: "Taken off the total before it's split, so each payment carries its share." },
  first: { label: "From the first payment", hint: "All of it comes out of the payment made when they accept." },
  last: { label: "From the last payment", hint: "Held back until delivery is confirmed. Good when you pay more up front." },
};

export const describePlan = (plan: PayoutPlan) => `${plan.firstPercent}% first · fee ${plan.fee === "spread" ? "spread over both" : plan.fee === "first" ? "from the first payment" : "from the last payment"}`;



export const formatTokens = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2)}M` : n.toLocaleString("en-NG"));
