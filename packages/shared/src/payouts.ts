// How a marketplace store is paid for an order: part when it accepts, the rest after delivery, with
// Sotechy's fee taken on the goods. The API pays with this and the dashboards show the same numbers.

/** When Sotechy's fee comes out */
export type FeeTiming = "spread" | "first" | "last";

export interface PayoutPlan {
  /** Share of the goods paid when the store accepts (the rest after delivery) */
  firstPercent: number;
  fee: FeeTiming;
}

export interface PayoutSettings {
  /** Send due payouts without an admin pressing Send */
  autoSend: boolean;
  /** Sotechy's fee on the goods (0.02 = 2%) */
  feeRate: number;
  /** The plan for stores without their own */
  standard: PayoutPlan;
  /** Hours after delivery before the final payment is sent, so problems can be raised */
  finalAfterHours: number;
}

export const DEFAULT_PAYOUT_SETTINGS: PayoutSettings = {
  autoSend: false,
  feeRate: 0.02,
  standard: { firstPercent: 50, fee: "spread" },
  finalAfterHours: 48,
};

/** What the store receives at each step for an order. The delivery fee is always paid with the first
 *  payment. `problem` is set when a payment is too small to carry the fee. */
export function splitByPlan(goods: number, delivery: number, plan: PayoutPlan, rate = DEFAULT_PAYOUT_SETTINGS.feeRate) {
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
  // The fee each payment carries, for statements
  const firstFee = plan.fee === "first" ? fee : plan.fee === "last" ? 0 : Math.round(fee * p);
  return { fee, first: first + delivery, second, firstFee, secondFee: fee - firstFee, problem: first < 0 || second < 0 };
}

export type PayoutStage = "first" | "final" | "payback";
/** scheduled → sending → paid (or failed); held by an admin; cancelled with its order.
 *  Paybacks are owed by the store, then settled. */
export type PayoutStatus = "scheduled" | "sending" | "paid" | "failed" | "held" | "cancelled" | "owed" | "settled";

export interface PayoutRow {
  id: string;
  orderId: string;
  orderNumber: string;
  stage: PayoutStage;
  amount: number;
  fee: number;
  status: PayoutStatus;
  dueAt: string;
  sentAt: string | null;
  paidAt: string | null;
  failureReason: string | null;
  bankName: string | null;
  accountLast4: string | null;
  createdAt: string;
}

export interface AdminPayoutRow extends PayoutRow {
  merchantId: string;
  storeName: string;
  storeTicker: string;
  accountName: string | null;
  /** The store has a checked payout account */
  accountReady: boolean;
}

/** A bank Flutterwave can pay into */
export interface Bank {
  code: string;
  name: string;
}

/** The account a store's payouts go to, checked with the bank */
export interface PayoutAccount {
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  /** Whose name it's in: the business, the owner, or neither (payouts wait for Sotechy to check) */
  match: "business" | "owner" | null;
  verifiedAt: string;
}
