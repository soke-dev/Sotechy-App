// Sample marketplace data for the admin screens (merchants, delivery areas, order reviews, payouts, tokens).
// Matches the merchant dashboard's demo store so both apps tell the same story. Replaced by API calls
// once the marketplace backend and the Monad contracts are built.

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

const doc = (id: string, kind: DocKind, label: string, file: MerchantDoc["file"], status: DocStatus, mins: number, note?: string): MerchantDoc => ({ id, kind, label, file, status, uploadedAt: ago(mins), note });
const allAccepted = (mins: number, business: boolean): MerchantDoc[] =>
  business
    ? [doc("cac", "cac", "CAC certificate", "PDF", "accepted", mins), doc("addr", "address", "Proof of address", "PDF", "accepted", mins), doc("id", "id", "Director's ID", "JPG", "accepted", mins)]
    : [doc("id", "id", "Government ID", "JPG", "accepted", mins), doc("addr", "address", "Proof of address", "PDF", "accepted", mins), doc("photos", "photos", "Work or shop photos", "JPG", "accepted", mins)];

export const merchants: Merchant[] = [
  {
    id: "m1", name: "Sotechy", kind: "Registered business", owner: "Sotechy Tech", email: "hello@sotechy.shop", phone: "0803 000 1111", city: "Benin City", address: "No. 20 Etete Road, Benin City",
    ticker: "SOTECHY", regNumber: "RC 1874422", status: "verified", appliedAt: ago(60 * 24 * 120), products: 48, sales30d: 18_420_000, rating: 4.8,
    docs: allAccepted(60 * 24 * 120, true), idCheck: { ok: true, note: "Director's NIN matched" },
    payout: { bank: "Access Bank", accountName: "SOTECHY TECH LTD", last4: "2201", matches: "business" }, states: ["Edo", "Delta", "Lagos", "FCT Abuja"],
    history: [{ at: ago(60 * 24 * 119), text: "Approved and went live", tone: "good" }],
  },
  {
    id: "m2", name: "Xena Gadgets", kind: "Registered business", owner: "Ada Okafor", email: "ada@xenagadgets.ng", phone: "0803 000 0000", city: "Benin City", address: "14 Akpakpava Road, Benin City",
    ticker: "XENA", regNumber: "RC 2201941", status: "verified", appliedAt: ago(60 * 24 * 40), products: 11, sales30d: 2_740_000, rating: 4.7,
    docs: allAccepted(60 * 24 * 40, true), idCheck: { ok: true, note: "NIN and selfie matched" },
    payout: { bank: "GTBank", accountName: "XENA GADGETS LTD", last4: "6789", matches: "business" }, states: ["Edo", "Delta"],
    history: [
      { at: ago(60 * 24 * 39), text: "Approved and went live", tone: "good" },
      { at: ago(60 * 24 * 40), text: "Applied and sent 3 documents", tone: "neutral" },
    ],
  },
  {
    id: "m3", name: "Glow by Tee", kind: "Freelancer", owner: "Temitope Bello", email: "tee@glowbytee.com", phone: "0812 334 9081", city: "Lagos", address: "8 Adeola Odeku Street, Victoria Island, Lagos",
    ticker: "GLOW", regNumber: "BN 3390127", status: "review", appliedAt: ago(60 * 5), products: 0, sales30d: 0,
    docs: [
      doc("id", "id", "Government ID", "JPG", "accepted", 60 * 5, "Name on the ID matches the owner."),
      doc("addr", "address", "Proof of address", "PDF", "unchecked", 60 * 5, "Utility bill. Check the name and the address match."),
      doc("photos", "photos", "Work or shop photos", "JPG", "unchecked", 60 * 5, "Shows where the products are kept."),
    ],
    idCheck: { ok: true, note: "NIN and selfie matched" },
    payout: { bank: "Opay", accountName: "TEMITOPE BELLO", last4: "4471", matches: "owner" }, states: ["Lagos", "Ogun"],
    history: [
      { at: ago(60), text: "You accepted the Government ID", tone: "good" },
      { at: ago(60 * 5 - 2), text: "Identity and payout account matched", tone: "good" },
      { at: ago(60 * 5), text: "Applied and sent 3 documents", tone: "neutral" },
    ],
  },
  {
    id: "m4", name: "Kola Solar & Power", kind: "Registered business", owner: "Kolawole Adeyemi", email: "kola@kolasolar.ng", phone: "0703 221 7765", city: "Ibadan", address: "52 Ring Road, Ibadan",
    ticker: "KOLA", regNumber: "RC 1650302", status: "review", appliedAt: ago(60 * 26), products: 0, sales30d: 0,
    docs: [
      doc("cac", "cac", "CAC certificate", "PDF", "accepted", 60 * 26),
      doc("addr", "address", "Proof of address", "PDF", "rejected", 60 * 26, "Address on the bill doesn't match the CAC record."),
      doc("id", "id", "Director's ID", "JPG", "unchecked", 60 * 26),
    ],
    idCheck: { ok: true, note: "Director's NIN matched" },
    payout: { bank: "Zenith Bank", accountName: "KOLA SOLAR AND POWER LTD", last4: "0932", matches: "business" }, states: ["Oyo", "Ogun"],
    history: [
      { at: ago(60 * 3), text: "Proof of address marked not acceptable", tone: "bad" },
      { at: ago(60 * 25), text: "CAC certificate accepted", tone: "good" },
      { at: ago(60 * 26), text: "Applied and sent 3 documents", tone: "neutral" },
    ],
  },
  {
    id: "m5", name: "Hairven Wigs", kind: "Freelancer", owner: "Blessing Eze", email: "blessing@hairven.ng", phone: "0905 118 4420", city: "Port Harcourt", address: "17 Aba Road, Port Harcourt",
    ticker: "HAIRVEN", status: "info", appliedAt: ago(60 * 24 * 2), products: 0, sales30d: 0,
    docs: [
      doc("id", "id", "Government ID", "JPG", "accepted", 60 * 24 * 2),
      doc("addr", "address", "Proof of address", "PDF", "unchecked", 60 * 24 * 2),
      doc("photos", "photos", "Work or shop photos", "JPG", "unchecked", 60 * 24 * 2),
    ],
    idCheck: { ok: false, note: "Selfie was blurry, asked for a new one" },
    payout: { bank: "Moniepoint", accountName: "BLESSING EZE", last4: "5518", matches: "owner" }, states: ["Rivers"],
    history: [
      { at: ago(60 * 24 * 2 - 30), text: "Asked for a clearer selfie", tone: "warn" },
      { at: ago(60 * 24 * 2), text: "Applied and sent 3 documents", tone: "neutral" },
    ],
    note: "Asked for a clearer selfie 2 days ago",
  },
  {
    id: "m6", name: "BrightHome Appliances", kind: "Registered business", owner: "Chuka Obi", email: "sales@brighthome.ng", phone: "0806 441 2290", city: "Enugu", address: "3 Ogui Road, Enugu",
    ticker: "BRIGHT", regNumber: "RC 998120", status: "verified", appliedAt: ago(60 * 24 * 75), products: 34, sales30d: 6_910_000, rating: 4.5,
    docs: allAccepted(60 * 24 * 75, true), idCheck: { ok: true, note: "Director's NIN matched" },
    payout: { bank: "UBA", accountName: "BRIGHTHOME APPLIANCES LTD", last4: "4410", matches: "business" }, states: ["Enugu", "Anambra", "Imo"],
    history: [{ at: ago(60 * 24 * 74), text: "Approved and went live", tone: "good" }],
  },
  {
    id: "m7", name: "QuickFix Phones", kind: "Freelancer", owner: "Musa Ibrahim", email: "musa@quickfix.ng", phone: "0817 552 0091", city: "Kano", address: "Farm Centre, Kano",
    ticker: "QFIX", status: "suspended", appliedAt: ago(60 * 24 * 60), products: 9, sales30d: 120_000, rating: 3.1,
    docs: allAccepted(60 * 24 * 60, false), idCheck: { ok: true, note: "NIN matched" },
    payout: { bank: "Kuda", accountName: "MUSA IBRAHIM", last4: "7720", matches: "owner" }, states: ["Kano"],
    history: [
      { at: ago(60 * 24 * 2), text: "Suspended: 3 orders accepted but never shipped", tone: "bad" },
      { at: ago(60 * 24 * 59), text: "Approved and went live", tone: "good" },
    ],
    note: "Suspended: 3 orders accepted but never shipped. ₦86,400 to pay back.",
  },
];

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

export const zoneRequests: ZoneRequest[] = [
  { id: "z4", merchant: "Xena Gadgets", ticker: "XENA", state: "Lagos", areas: [], homeFee: 7_500, pickup: { fee: 5_000, point: "GIG Logistics, Ikeja" }, days: "3–5 days", review: "pending", requestedAt: ago(60 * 3), evidence: "GIG Logistics account, 4 Lagos waybills last month" },
  { id: "z9", merchant: "BrightHome Appliances", ticker: "BRIGHT", state: "FCT Abuja", areas: ["Wuse", "Garki", "Gwarinpa"], homeFee: 9_000, days: "2–3 days", review: "pending", requestedAt: ago(60 * 9), change: "New area", evidence: "Partner warehouse in Kubwa" },
  { id: "z11", merchant: "Kola Solar & Power", ticker: "KOLA", state: "Oyo", areas: ["Ibadan"], homeFee: 3_000, pickup: { fee: 0, point: "Our shop, Ring Road" }, days: "Same day – 1 day", review: "pending", requestedAt: ago(60 * 26), evidence: "Own van, shop in Ibadan" },
  { id: "z12", merchant: "Xena Gadgets", ticker: "XENA", state: "Edo", areas: ["Ekpoma", "Auchi", "Uromi"], homeFee: 4_000, pickup: { fee: 2_500, point: "GIG Logistics hub, Ekpoma" }, days: "1–2 days", review: "pending", requestedAt: ago(40), change: "Added Uromi", evidence: "Same courier as Ekpoma" },
  { id: "z5", merchant: "Xena Gadgets", ticker: "XENA", state: "Rivers", areas: ["Port Harcourt"], homeFee: 6_000, days: "3–5 days", review: "declined", requestedAt: ago(60 * 24 * 3), evidence: "None given", note: "We couldn't confirm a courier for Port Harcourt. Send us a waybill receipt and we'll look again." },
  { id: "z3", merchant: "Xena Gadgets", ticker: "XENA", state: "Delta", areas: ["Asaba", "Warri"], homeFee: 5_500, pickup: { fee: 3_500, point: "GUO Motors park, Asaba" }, days: "2–3 days", review: "approved", requestedAt: ago(60 * 24 * 30), evidence: "GUO waybills" },
];

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

export const orderCases: OrderCase[] = [
  { id: "c1", kind: "not_accepted", order: "SOT-1039", merchant: "BrightHome Appliances", customer: "@ifeoma", total: 410_000, openedAt: ago(60 * 2), detail: "Placed 26 hours ago. Merchant hasn't answered email, SMS or WhatsApp.", money: "Nothing paid to the merchant yet. Customer sees \"Processing\"." },
  { id: "c2", kind: "not_confirmed", order: "SOT-1027", merchant: "Xena Gadgets", customer: "@tunde", total: 95_000, openedAt: ago(60 * 30), detail: "Marked delivered 3 days ago with a photo of the handover. Customer hasn't confirmed.", money: "Confirming releases the last payment (₦46,550) and the customer's tokens." },
  { id: "c3", kind: "payback", order: "SOT-1016", merchant: "QuickFix Phones", customer: "@musa.k", total: 86_400, openedAt: ago(60 * 24 * 2), detail: "Merchant accepted, then said the item was out of stock.", money: "The first payment (₦42,336) was made. Merchant owes it back before the customer is refunded." },
  { id: "c4", kind: "dispute", order: "SOT-1031", merchant: "Xena Gadgets", customer: "@amaka.n", total: 205_000, openedAt: ago(60 * 5), detail: "\"The TV came with a cracked corner.\" Photo attached. No returns after confirmation, but this is before.", money: "The last payment is on hold until this is settled." },
  { id: "c5", kind: "not_confirmed", order: "SOT-1012", merchant: "BrightHome Appliances", customer: "@kelechi", total: 120_000, openedAt: ago(60 * 50), detail: "Marked delivered 2 days ago. Courier tracking shows delivered.", money: "Confirming releases the last payment (₦58,800)." },
];

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

export const merchantPayouts: MerchantPayout[] = [
  { id: "p1", merchant: "Xena Gadgets", order: "SOT-1042", half: "First payment", amount: 134_260, status: "paid", at: ago(30), bank: "GTBank ••6789" },
  { id: "p2", merchant: "BrightHome Appliances", order: "SOT-1040", half: "First payment", amount: 203_350, status: "paid", at: ago(60 * 3), bank: "UBA ••4410" },
  { id: "p3", merchant: "Xena Gadgets", order: "SOT-1031", half: "Last payment", amount: 100_450, status: "held", at: ago(60 * 5), bank: "GTBank ••6789" },
  { id: "p4", merchant: "Sotechy", order: "SOT-1036", half: "Last payment", amount: 61_250, status: "scheduled", at: ago(10), bank: "Access ••2201" },
  { id: "p5", merchant: "BrightHome Appliances", order: "SOT-1028", half: "Last payment", amount: 44_100, status: "failed", at: ago(60 * 20), bank: "UBA ••4410" },
  { id: "p6", merchant: "Xena Gadgets", order: "SOT-1027", half: "First payment", amount: 46_550, status: "paid", at: ago(60 * 24 * 4), bank: "GTBank ••6789" },
  { id: "p7", merchant: "Sotechy", order: "SOT-1030", half: "First payment", amount: 88_200, status: "paid", at: ago(60 * 24), bank: "Access ••2201" },
];

export const PAYOUT_STATUS = {
  paid: { label: "Paid", tone: "good" },
  scheduled: { label: "Sending", tone: "info" },
  held: { label: "On hold", tone: "warn" },
  failed: { label: "Failed", tone: "bad" },
} as const;

export const paybacks = [{ merchant: "QuickFix Phones", order: "SOT-1016", amount: 42_336, since: ago(60 * 24 * 2) }];

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

export const tokens: TokenRow[] = [
  { ticker: "SOTECHY", merchant: "Sotechy", issued: 92_400_000, circulating: 61_800_000, pending: 4_200_000, holders: 3_912, redeemed: 30_600_000, contract: "0x5a7e…c19d" },
  { ticker: "XENA", merchant: "Xena Gadgets", issued: 12_480_000, circulating: 9_310_000, pending: 1_120_000, holders: 412, redeemed: 3_170_000, contract: "0x9b21…4e07" },
  { ticker: "BRIGHT", merchant: "BrightHome Appliances", issued: 30_120_000, circulating: 24_050_000, pending: 2_600_000, holders: 1_085, redeemed: 6_070_000, contract: "0x13cc…a0f2" },
  { ticker: "QFIX", merchant: "QuickFix Phones", issued: 640_000, circulating: 610_000, pending: 0, holders: 38, redeemed: 30_000, contract: "0x77d0…19b5" },
];

export const reserve = {
  walletNaira: 1_210_400,
  recyclingPool: 18_940_000,
  feesThisMonth: { total: 562_800, reserve: 281_400, revenue: 281_400 },
  posMintsThisMonth: 1_340_000,
  wallet: "0x2f0a…71be",
};

export interface TokenEvent {
  id: string;
  kind: "release" | "pending" | "spend" | "bonus" | "pos";
  ticker: string;
  amount: number;
  who: string;
  at: string;
}

export const tokenEvents: TokenEvent[] = [
  { id: "t1", kind: "release", ticker: "XENA", amount: 95_000, who: "@tunde", at: ago(25) },
  { id: "t2", kind: "spend", ticker: "SOTECHY", amount: 40_000, who: "@ifeoma", at: ago(60) },
  { id: "t3", kind: "bonus", ticker: "XENA", amount: 1_900, who: "@chidi", at: ago(60 * 2) },
  { id: "t4", kind: "pos", ticker: "BRIGHT", amount: 120_000, who: "Walk-in sale, Enugu", at: ago(60 * 4) },
  { id: "t5", kind: "pending", ticker: "XENA", amount: 274_000, who: "@chidi", at: ago(60 * 6) },
];

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

export const merchantOrders: MerchantOrder[] = [
  { id: "mo1", number: "SOT-1042", merchantId: "m2", customer: "Chidi Okeke", status: "new", fulfilment: "delivery", total: 274_000, createdAt: ago(38), payout: "Nothing paid yet" },
  { id: "mo2", number: "SOT-1041", merchantId: "m2", customer: "Amaka Nwosu", status: "new", fulfilment: "pickup", total: 28_000, createdAt: ago(60 * 3), payout: "Nothing paid yet" },
  { id: "mo3", number: "SOT-1040", merchantId: "m6", customer: "Ifeoma Eze", status: "accepted", fulfilment: "delivery", total: 415_000, createdAt: ago(60 * 4), payout: "First payment sent" },
  { id: "mo4", number: "SOT-1039", merchantId: "m6", customer: "Ifeoma Eze", status: "new", fulfilment: "delivery", total: 410_000, createdAt: ago(60 * 26), payout: "Nothing paid yet" },
  { id: "mo5", number: "SOT-1036", merchantId: "m2", customer: "Kelechi Obi", status: "shipped", fulfilment: "delivery", total: 125_000, createdAt: ago(60 * 20), payout: "First payment sent" },
  { id: "mo6", number: "SOT-1031", merchantId: "m2", customer: "Amaka Nwosu", status: "delivered", fulfilment: "delivery", total: 205_000, createdAt: ago(60 * 24 * 3), payout: "Last payment on hold" },
  { id: "mo7", number: "SOT-1027", merchantId: "m2", customer: "Tunde Bakare", status: "delivered", fulfilment: "delivery", total: 95_000, createdAt: ago(60 * 24 * 4), payout: "First payment sent" },
  { id: "mo8", number: "SOT-1016", merchantId: "m7", customer: "Musa Kabir", status: "declined", fulfilment: "delivery", total: 86_400, createdAt: ago(60 * 24 * 5), payout: "₦42,336 to pay back" },
];

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
  merchants: {
    m1: { firstPercent: 90, fee: "last" },
    m7: { firstPercent: 10, fee: "first" },
  },
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
  return { outstanding, cover: reserve.walletNaira / outstanding };
}

export const formatTokens = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2)}M` : n.toLocaleString("en-NG"));

/** "₦28.1m", "₦940k": for big numbers in small cards */
export const nairaShort = (n: number) => (n >= 1_000_000 ? `₦${(n / 1_000_000).toFixed(1)}m` : n >= 10_000 ? `₦${Math.round(n / 1_000)}k` : `₦${n.toLocaleString("en-NG")}`);

/** Paid featured placement: the monthly price and stores currently featured (sample) */
const DAY_MS = 86_400_000;
export const featuring = {
  pricePerMonth: 1_000,
  /** Most stores featured at once; a full slot list keeps it meaningful */
  maxStores: 8,
  stores: [
    { merchantId: "m2", since: ago(60 * 24 * 4), until: new Date(Date.now() + 26 * DAY_MS).toISOString(), paid: 1_000 },
    { merchantId: "m6", since: ago(60 * 24 * 10), until: new Date(Date.now() + 50 * DAY_MS).toISOString(), paid: 3_000 },
    { merchantId: "m3", since: ago(60 * 24 * 9), until: new Date(Date.now() + 21 * DAY_MS).toISOString(), paid: 1_000 },
  ],
  revenueThisMonth: 5_000,
};

