// The merchant dashboard's data. Orders, products, payouts and the rest come with the marketplace backend;
// until then every store starts empty (no sample data), with the shared types and labels kept here.
import type { DeliveryZone, MerchantOrder, MerchantOrderStatus, MerchantProduct, OfferHours } from "@sotechy/shared";
import { splitOrder, SOTECHY_CROSS_BONUS, STORE_VALUE_PER_TOKEN } from "./money";

export type OrderStatus = MerchantOrderStatus;

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: "brand" | "good" | "warn" | "bad" | "neutral" | "info" }> = {
  new: { label: "Needs your answer", tone: "brand" },
  accepted: { label: "Accepted · preparing", tone: "info" },
  shipped: { label: "Shipped", tone: "info" },
  delivered: { label: "Delivered · awaiting customer", tone: "warn" },
  completed: { label: "Completed", tone: "good" },
  declined: { label: "Declined", tone: "neutral" },
  payback: { label: "Payback requested", tone: "bad" },
};

export type Order = MerchantOrder;
export type OrderItem = MerchantOrder["items"][number];

export const orders: Order[] = [];

export const orderTotal = (o: Order) => o.items.reduce((n, i) => n + i.qty * i.price, 0);

/** Where the money for an order is, given its status. */
export function orderMoney(o: Order) {
  const total = orderTotal(o);
  const split = splitOrder(total);
  const firstPaid = ["accepted", "shipped", "delivered", "completed", "payback"].includes(o.status);
  const secondPaid = o.status === "completed";
  const tokens = total; // 1 token per ₦1
  return { total, ...split, firstPaid, secondPaid, tokens, sotechyBonus: Math.round(total * SOTECHY_CROSS_BONUS), tokensReleased: o.status === "completed" };
}

export type Product = MerchantProduct;

/** How long an agreed price lasts: never more than 24 hours */
export type { OfferHours };
export const OFFER_HOURS: OfferHours[] = [6, 12, 24];

export const products: Product[] = [];

/** Sales per day for the last 14 days (₦) */
export const salesByDay = Array.from({ length: 14 }, (_, i) => ({
  day: new Date(Date.now() - (13 - i) * 86_400_000).toLocaleDateString("en-NG", { weekday: "short", day: "numeric" }),
  amount: 0,
}));

/** The store's payout account; null until one is added */
export const bank: { bankName: string; accountName: string; accountNumber: string } | null = null;

/** A payout account can be in the business's name or the owner's own name. */
export function payoutNameMatch(accountName: string, businessName: string, ownerName: string): "business" | "owner" | null {
  const clean = (s: string) => s.toUpperCase().replace(/\b(LTD|LIMITED|ENTERPRISES?|VENTURES?|NIG|NIGERIA)\b|[^A-Z ]/g, "").replace(/\s+/g, " ").trim();
  const name = clean(accountName);
  if (name && name === clean(businessName)) return "business";
  const owner = clean(ownerName).split(" ").filter(Boolean);
  if (owner.length && owner.every((part) => name.split(" ").includes(part))) return "owner";
  return null;
}
export const PAYOUT_MATCH_LABEL = { business: "Matches your business name", owner: "Matches your own name" } as const;

export const reviews: { id: string; product: string; customer: string; rating: number; text: string; photo: string | null; bonus: number; at: string; reply: string | null }[] = [];


export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu",
  "FCT Abuja", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo",
  "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
];

/** Sotechy checks every new area (and any change to its state or cities) before customers see it. */
type ZoneReview = DeliveryZone["review"];

/** A saved delivery area: set up once, then ticked on any product. */
export type { DeliveryZone, ZoneReview };
export const deliveryZones: DeliveryZone[] = [];

/** Customers only see areas that are approved and switched on. */
export const zoneLive = (z: DeliveryZone) => z.review === "approved" && z.active;

export const pickup = { enabled: false, address: "", hours: "" };

export const zoneLabel = (z: Pick<DeliveryZone, "state" | "areas">) => (z.areas.length ? `${z.areas.join(", ")} (${z.state})` : `All of ${z.state}`);

/** What we know about each customer beyond their orders */
export const customerExtras: Record<string, { tokens: number; subscribed: boolean; reviews: number; since: string }> = {};

/** Messages this store has sent to its subscribers */
export const sentNotices: { id: string; title: string; body: string; at: string; sentTo: number; opened: number; link: string }[] = [];


/** Featured placement: the price Sotechy charges (set in admin) and this store's feature, if any */


