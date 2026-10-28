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
  ready_for_pickup: "Available for pickup",
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

// Words that say what kind of business it is, not which one, so they don't make a ticker on their own
const GENERIC_NAME_WORDS = new Set(["SHOP", "SHOPS", "STORE", "STORES", "LTD", "LIMITED", "ENTERPRISE", "ENTERPRISES", "VENTURES", "VENTURE", "GLOBAL", "INTL", "INTERNATIONAL", "COMPANY", "CO", "AND", "THE", "OF", "NIG", "NIGERIA", "SERVICES", "CONCEPTS", "HUB", "MART", "PLC", "NG"]);

/** Tickers people would recognise from a store name: its name, initials, and the two together (never chopped words) */
export function tickerIdeas(storeName: string): string[] {
  const words = storeName.toUpperCase().replace(/&/g, " ").replace(/[^A-Z0-9 ]/g, "").split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const key = words.filter((w) => !GENERIC_NAME_WORDS.has(w));
  const main = key.length ? key : words;
  const initialsOf = (ws: string[]) => ws.map((w) => w[0]).join("");
  // The store's own name: its first word that fits, e.g. XENA from Xena Gadgets, OKORO from JJ Okoro & Sons
  const name = main.find((w) => w.length >= 3 && w.length <= 8);
  const lead = name ?? main[0];
  const ideas = [
    name,
    initialsOf(main).length >= 3 ? initialsOf(main) : initialsOf(words),
    main.length > 1 && (main[0] + main[1]).length <= 8 ? main[0] + main[1] : "",
    main.length > 1 ? lead + initialsOf(main.filter((w) => w !== lead)) : "",
    // A long name without its vowels, e.g. ELCTRN from Electronics World
    main[0].length > 5 ? (main[0][0] + main[0].slice(1).replace(/[AEIOU]/g, "")).slice(0, 6) : "",
  ];
  return [...new Set(ideas.filter((t): t is string => !!t && !tickerProblem(t)))].slice(0, 6);
}

/**
 * Store tokens. Every sale pays Sotechy a 2% fee; half of it goes to the reserve that pays stores when
 * customers spend tokens. A token's value spreads that 1% over the token and the most a review can add.
 */
export const TOKEN_RULES = {
  feeRate: 0.02,
  reserveShare: 0.5,
  /** $SOTECHY on top, for orders at other stores */
  crossBonus: 0.1,
  /** Reviewing a delivered item: this much of its price, or the photo rate with a photo */
  reviewBonus: 0.05,
  photoReviewBonus: 0.1,
  /** Tokens can't pay for all of an order: at least this much is paid in money */
  minCashPerOrder: 100,
  /** A store's own (walk-in) sale: the store pays this, and all of it backs the tokens (Sotechy keeps none) */
  walkInFeeRate: 0.01,
} as const;

/** A Google Maps link (place, share or short link) */
export const isMapLink = (url: string) => /^https:\/\/((www\.)?google\.(com|co\.[a-z]{2}|com\.[a-z]{2}|[a-z]{2})\/maps|maps\.google\.(com|co\.[a-z]{2}|com\.[a-z]{2}|[a-z]{2})[/?]|maps\.app\.goo\.gl\/|goo\.gl\/maps)/i.test(url.trim());

/** Where "Directions" goes: the place's own Google Maps link, or a search for its address */
export const directionsUrl = (address: string, mapUrl?: string | null) => mapUrl?.trim() || `https://maps.google.com/?q=${encodeURIComponent(address)}`;

/** Naira value of one token at the store that issued it (₦0.00909) */
export const TOKEN_VALUE = (TOKEN_RULES.feeRate * TOKEN_RULES.reserveShare) / (1 + TOKEN_RULES.photoReviewBonus);

/** What a number of tokens is worth, rounded down to the kobo */
export const tokensToNaira = (tokens: number) => Math.floor(tokens * TOKEN_VALUE * 100) / 100;

/** Most tokens that can be used for an amount of naira */
export const nairaToTokens = (naira: number) => Math.floor(naira / TOKEN_VALUE);
