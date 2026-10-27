import type { OrderStatus, PaymentMethodCode, Role } from "./types";

export const BUSINESS = {
  name: "Sotechy Shop",
  tagline: "Electronics, gadgets and home appliances",
  website: "https://www.sotechy.shop",
  headOffice: "No. 20 Etete Road, Benin City, Nigeria",
  founded: "August 2022",
  currency: "NGN",
} as const;

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Pending payment",
  paid: "Paid",
  processing: "Processing",
  ready_for_pickup: "Ready for pickup",
  dispatched: "Dispatched",
  delivered: "Delivered",
  cancelled: "Cancelled",
  payment_failed: "Payment failed",
  refunded: "Refunded",
};

/** Happy-path order of statuses, used for progress timelines. */
export const ORDER_FLOW: OrderStatus[] = [
  "pending_payment",
  "paid",
  "processing",
  "ready_for_pickup",
  "dispatched",
  "delivered",
];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodCode, string> = {
  bank_transfer: "Bank transfer",
  online: "Money Moves",
  crypto: "Crypto",
  cash: "Cash (in store)",
  pos_terminal: "POS terminal (in store)",
};

export const ROLE_LABELS: Record<Role, string> = {
  customer: "Customer",
  staff: "Store staff",
  manager: "Manager",
  admin: "Administrator",
};

export const STAFF_ROLES: Role[] = ["staff", "manager", "admin"];

/** How a registered business is set up with CAC, and the documents each one sends for review */
export type BusinessStructure = "BN" | "LTD" | "PLC" | "IT";
export const BUSINESS_DOCUMENTS: Record<BusinessStructure, { name: string; optional?: boolean }[]> = {
  BN: [{ name: "CAC certificate" }, { name: "Proof of address", optional: true }],
  LTD: [{ name: "CAC certificate" }, { name: "MEMART" }, { name: "Status report" }, { name: "Proof of address", optional: true }],
  PLC: [{ name: "CAC certificate" }, { name: "MEMART" }, { name: "Status report" }, { name: "Proof of address", optional: true }],
  IT: [{ name: "CAC certificate" }, { name: "Constitution" }, { name: "Proof of address", optional: true }],
};

/** Shortest description a store can submit about its business */
export const MIN_BUSINESS_DESCRIPTION = 80;

/** A store token's ticker: 3 to 8 letters or numbers, starting with a letter. Returns why it isn't allowed. */
export function tickerProblem(raw: string): string | null {
  const t = raw.trim().toUpperCase().replace(/^\$/, "");
  if (t.length < 3 || t.length > 8) return "Use 3 to 8 letters or numbers";
  if (!/^[A-Z][A-Z0-9]*$/.test(t)) return "Start with a letter, then letters or numbers only";
  if (/SOTECHY|S0TECHY|SOTECHI|^MON$|^ETH$|^BTC$|^USD|^NGN$/.test(t)) return "That ticker is kept for Sotechy or a currency";
  return null;
}
