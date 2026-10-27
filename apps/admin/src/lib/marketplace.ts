// Shared marketplace types, labels and fee rules for the admin screens. Stores and delivery areas come
// from the API; payouts, order reviews and tokens start empty until those parts of the backend exist.

const now = Date.now();
const ago = (mins: number) => new Date(now - mins * 60_000).toISOString();

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

export const MERCHANT_STATUS: Record<MerchantStatus, { label: string; tone: "warn" | "info" | "good" | "bad" | "neutral" }> = {
  review: { label: "Needs review", tone: "warn" },
  info: { label: "Waiting on merchant", tone: "info" },
  verified: { label: "Verified", tone: "good" },
  suspended: { label: "Suspended", tone: "bad" },
  rejected: { label: "Rejected", tone: "neutral" },
};

export const merchants: Merchant[] = [];

/** How many of a merchant's documents have been looked at */
export const docsChecked = (m: Pick<Merchant, "docs">) => m.docs.filter((d) => d.status !== "unchecked").length;

export type ZoneReview = "pending" | "approved" | "declined";

export interface ZoneRequest {
  id: string;
  merchant: string;
  ticker: string;
  state: string;
  areas: string[];
  homeFee: number;
  pickup?: { fee: number; point: string };
  days: string;
  review: ZoneReview;
  requestedAt: string;
  change?: string;
  evidence: string;
  note?: string;
}

export const zoneRequests: ZoneRequest[] = [];

export type CaseKind = "not_accepted" | "not_confirmed" | "payback" | "dispute";

export interface OrderCase {
  id: string;
  kind: CaseKind;
  order: string;
  merchant: string;
  customer: string;
  total: number;
  openedAt: string;
  detail: string;
  money: string;
}

export const CASE_KIND: Record<CaseKind, { label: string; tone: "warn" | "info" | "bad" | "brand"; illo: "box" | "bike" | "bank" | "chat" }> = {
  not_accepted: { label: "Not accepted in 24h", tone: "warn", illo: "box" },
  not_confirmed: { label: "Customer hasn't confirmed", tone: "info", illo: "bike" },
  payback: { label: "Merchant must pay back", tone: "bad", illo: "bank" },
  dispute: { label: "Customer complaint", tone: "brand", illo: "chat" },
};

export const orderCases: OrderCase[] = [];

export interface MerchantPayout {
  id: string;
  merchant: string;
  order: string;
  half: "First payment" | "Last payment";
  amount: number;
  status: "paid" | "scheduled" | "held" | "failed";
  at: string;
  bank: string;
}

export const merchantPayouts: MerchantPayout[] = [];

export const PAYOUT_STATUS = {
  paid: { label: "Paid", tone: "good" },
  scheduled: { label: "Sending", tone: "info" },
  held: { label: "On hold", tone: "warn" },
  failed: { label: "Failed", tone: "bad" },
} as const;

export const paybacks: { merchant: string; order: string; amount: number; since: string }[] = [];

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

export type MerchantOrderStatus = "new" | "accepted" | "shipped" | "delivered" | "completed" | "declined";

export const MERCHANT_ORDER_STATUS: Record<MerchantOrderStatus, { label: string; tone: "warn" | "info" | "brand" | "good" | "bad" }> = {
  new: { label: "Waiting for merchant", tone: "warn" },
  accepted: { label: "Accepted", tone: "info" },
  shipped: { label: "Shipped", tone: "brand" },
  delivered: { label: "Delivered", tone: "good" },
  completed: { label: "Completed", tone: "good" },
  declined: { label: "Declined", tone: "bad" },
};

/** Orders placed with marketplace merchants (Sotechy's own orders come from the API) */
export interface MerchantOrder {
  id: string;
  number: string;
  merchantId: string;
  customer: string;
  status: MerchantOrderStatus;
  fulfilment: "delivery" | "pickup";
  total: number;
  createdAt: string;
  payout: string;
}

export const merchantOrders: MerchantOrder[] = [];

/** How a merchant is paid: the share of the goods paid when they accept (the rest when delivery is
 *  confirmed), and when Sotechy's fee comes out. The delivery fee is always paid with the first payment. */
export type FeeTiming = "spread" | "first" | "last";
export interface PayoutPlan {
  firstPercent: number;
  fee: FeeTiming;
}

export const FEE_TIMING: Record<FeeTiming, { label: string; hint: string }> = {
  spread: { label: "Spread over both", hint: "Taken off the total before it's split, so each payment carries its share." },
  first: { label: "From the first payment", hint: "All of it comes out of the payment made when they accept." },
  last: { label: "From the last payment", hint: "Held back until delivery is confirmed. Good when you pay more up front." },
};

/** The default plan and the merchants with their own. Kept here for the session until the backend stores it. */
export const payoutPlans: { standard: PayoutPlan; merchants: Record<string, PayoutPlan> } = {
  standard: { firstPercent: 50, fee: "spread" },
  merchants: {},
};

export const planFor = (merchantId: string): { plan: PayoutPlan; custom: boolean } =>
  payoutPlans.merchants[merchantId] ? { plan: payoutPlans.merchants[merchantId], custom: true } : { plan: payoutPlans.standard, custom: false };

/** What a merchant receives at each step for an order, and whether a payment is too small to carry the fee */
export function splitByPlan(goods: number, delivery: number, plan: PayoutPlan, rate = FEE.rate) {
  const fee = Math.round(goods * rate);
  const p = plan.firstPercent / 100;
  let first: number;
  let second: number;
  if (plan.fee === "first") {
    first = Math.round(goods * p) - fee;
    second = goods - Math.round(goods * p);
  } else if (plan.fee === "last") {
    first = Math.round(goods * p);
    second = goods - Math.round(goods * p) - fee;
  } else {
    first = Math.round((goods - fee) * p);
    second = goods - fee - first;
  }
  return { fee, first: first + delivery, second, problem: first < 0 || second < 0 };
}

export const describePlan = (plan: PayoutPlan) => `${plan.firstPercent}% first · fee ${plan.fee === "spread" ? "spread over both" : plan.fee === "first" ? "from the first payment" : "from the last payment"}`;

/** What the admin needs to look at, for the nav badges and the dashboard */
export const queue = {
  merchants: merchants.filter((m) => m.status === "review").length,
  zones: zoneRequests.filter((z) => z.review === "pending").length,
  cases: orderCases.length,
};

/** Outstanding token value at store prices, against the naira the reserve holds */
export function reserveHealth() {
  const outstanding = tokens.reduce((n, t) => n + t.circulating + t.pending, 0) * TOKEN_VALUE;
  // null while no tokens are out yet (nothing to cover)
  return { outstanding, cover: outstanding > 0 ? reserve.walletNaira / outstanding : null };
}

export const formatTokens = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2)}M` : n.toLocaleString("en-NG"));

/** "₦28.1m", "₦940k": for big numbers in small cards */
export const nairaShort = (n: number) => (n >= 1_000_000 ? `₦${(n / 1_000_000).toFixed(1)}m` : n >= 10_000 ? `₦${Math.round(n / 1_000)}k` : `₦${n.toLocaleString("en-NG")}`);

/** Paid featured placement: the monthly price and stores currently featured (sample) */
const DAY_MS = 86_400_000;
export const featuring = {
  pricePerMonth: 2_000,
  /** Most stores featured at once; a full slot list keeps it meaningful */
  maxStores: 8,
  stores: [
    { merchantId: "m2", since: ago(60 * 24 * 4), until: new Date(Date.now() + 26 * DAY_MS).toISOString(), paid: 2_000 },
    { merchantId: "m6", since: ago(60 * 24 * 10), until: new Date(Date.now() + 20 * DAY_MS).toISOString(), paid: 2_000 },
    { merchantId: "m3", since: ago(60 * 24 * 9), until: new Date(Date.now() + 21 * DAY_MS).toISOString(), paid: 2_000 },
  ],
  revenueThisMonth: 6_000,
};

