// Demo data for the merchant dashboard UI (before the backend exists). One store: Xena Gadgets ($XENA).
import { splitOrder, STORE_VALUE_PER_TOKEN, SOTECHY_CROSS_BONUS } from "./money";

const ago = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();
const ahead = (mins: number) => new Date(Date.now() + mins * 60_000).toISOString();

export const store = {
  name: "Xena Gadgets",
  slug: "xena",
  ticker: "XENA",
  tagline: "Phones, power and smart home, delivered across Benin City",
  status: "verified" as "verified" | "in_review" | "unverified",
  city: "Benin City",
  logo: "/demo/item-phone.png",
  cover: "/demo/store-inside.jpg",
  themeId: "sotechy",
  rating: 4.7,
  followers: 1284,
};

export const me = { name: "Ada Okafor", email: "ada@xenagadgets.ng", role: "Owner" };

export type OrderStatus = "new" | "accepted" | "shipped" | "delivered" | "completed" | "declined" | "payback";

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: "brand" | "good" | "warn" | "bad" | "neutral" | "info" }> = {
  new: { label: "Needs your answer", tone: "brand" },
  accepted: { label: "Accepted · preparing", tone: "info" },
  shipped: { label: "Shipped", tone: "info" },
  delivered: { label: "Delivered · awaiting customer", tone: "warn" },
  completed: { label: "Completed", tone: "good" },
  declined: { label: "Declined", tone: "neutral" },
  payback: { label: "Payback requested", tone: "bad" },
};

export interface OrderItem {
  name: string;
  image: string;
  qty: number;
  price: number;
  option?: string;
}

export interface Order {
  id: string;
  number: string;
  status: OrderStatus;
  customer: { name: string; username: string; phone: string; address: string };
  fulfilment: "delivery" | "pickup";
  items: OrderItem[];
  /** Part of the total the customer paid with $XENA (naira value) */
  paidWithTokens: number;
  createdAt: string;
  acceptBy?: string;
  history: { at: string; label: string; note?: string }[];
}

const customers = [
  { name: "Chidi Okeke", username: "chidi", phone: "0803 555 0142", address: "14 Airport Road, Benin City" },
  { name: "Amaka Nwosu", username: "amaka.n", phone: "0816 220 9031", address: "3 Ihama Road, GRA, Benin City" },
  { name: "Tunde Bakare", username: "tunde", phone: "0705 118 4420", address: "27 Sapele Road, Benin City" },
  { name: "Blessing Eze", username: "blessed", phone: "0902 774 1300", address: "9 Ugbowo Lagos Road, Benin City" },
  { name: "Ifeoma Obi", username: "ife", phone: "0811 640 2299", address: "52 Akpakpava Street, Benin City" },
];

export const orders: Order[] = [
  {
    id: "o-1042", number: "SOT-1042", status: "new", customer: customers[0], fulfilment: "delivery",
    items: [{ name: "Spark 20 Smartphone 128GB", image: "/demo/item-phone.png", qty: 1, price: 250_000, option: "Black" }, { name: "Fast Charger 25W", image: "/demo/item-charger.png", qty: 2, price: 12_000 }],
    paidWithTokens: 0, createdAt: ago(38), acceptBy: ahead(24 * 60 - 38),
    history: [{ at: ago(38), label: "Order placed", note: "Paid ₦274,000 via Money Moves" }],
  },
  {
    id: "o-1041", number: "SOT-1041", status: "new", customer: customers[1], fulfilment: "pickup",
    items: [{ name: "Power Bank 20,000mAh", image: "/demo/item-powerbank.png", qty: 1, price: 28_000 }],
    paidWithTokens: 5_000, createdAt: ago(190), acceptBy: ahead(24 * 60 - 190),
    history: [{ at: ago(190), label: "Order placed", note: "Paid ₦23,000 + 550,000 $XENA" }],
  },
  {
    id: "o-1038", number: "SOT-1038", status: "accepted", customer: customers[2], fulfilment: "delivery",
    items: [{ name: '43" Smart TV', image: "/demo/item-tv.png", qty: 1, price: 390_000 }],
    paidWithTokens: 0, createdAt: ago(60 * 20),
    history: [{ at: ago(60 * 20), label: "Order placed" }, { at: ago(60 * 19), label: "You accepted", note: "First 50% paid to your bank" }],
  },
  {
    id: "o-1035", number: "SOT-1035", status: "shipped", customer: customers[3], fulfilment: "delivery",
    items: [{ name: "Bluetooth Speaker", image: "/demo/item-speaker.png", qty: 1, price: 35_000 }, { name: "Sound Bar", image: "/demo/item-soundbar.png", qty: 1, price: 120_000 }],
    paidWithTokens: 0, createdAt: ago(60 * 40),
    history: [{ at: ago(60 * 40), label: "Order placed" }, { at: ago(60 * 39), label: "You accepted", note: "First 50% paid" }, { at: ago(60 * 12), label: "Shipped", note: "Rider: Kunle, 0806 000 1122" }],
  },
  {
    id: "o-1031", number: "SOT-1031", status: "delivered", customer: customers[4], fulfilment: "delivery",
    items: [{ name: "Split Air Conditioner 1.5HP", image: "/demo/item-ac.png", qty: 1, price: 410_000 }],
    paidWithTokens: 10_000, createdAt: ago(60 * 70),
    history: [{ at: ago(60 * 70), label: "Order placed" }, { at: ago(60 * 69), label: "You accepted" }, { at: ago(60 * 30), label: "Shipped" }, { at: ago(60 * 5), label: "Marked delivered", note: "Waiting for the customer to confirm" }],
  },
  {
    id: "o-1027", number: "SOT-1027", status: "completed", customer: customers[0], fulfilment: "pickup",
    items: [{ name: "Wireless Mouse", image: "/demo/item-mouse.png", qty: 2, price: 9_500 }],
    paidWithTokens: 0, createdAt: ago(60 * 24 * 4),
    history: [{ at: ago(60 * 24 * 4), label: "Order placed" }, { at: ago(60 * 24 * 4 - 30), label: "You accepted" }, { at: ago(60 * 24 * 3), label: "Collected", note: "Customer confirmed" }, { at: ago(60 * 24 * 3), label: "Completed", note: "Second 50% paid · tokens released" }],
  },
  {
    id: "o-1022", number: "SOT-1022", status: "completed", customer: customers[2], fulfilment: "delivery",
    items: [{ name: "14\" Laptop 8GB / 256GB", image: "/demo/item-laptop.png", qty: 1, price: 620_000 }],
    paidWithTokens: 0, createdAt: ago(60 * 24 * 6),
    history: [{ at: ago(60 * 24 * 6), label: "Order placed" }, { at: ago(60 * 24 * 5), label: "Completed" }],
  },
  {
    id: "o-1019", number: "SOT-1019", status: "payback", customer: customers[1], fulfilment: "delivery",
    items: [{ name: "Digital Air Fryer 4.5L", image: "/demo/item-airfryer.png", qty: 1, price: 95_000 }],
    paidWithTokens: 0, createdAt: ago(60 * 24 * 8),
    history: [{ at: ago(60 * 24 * 8), label: "Order placed" }, { at: ago(60 * 24 * 8 - 40), label: "You accepted", note: "First 50% paid" }, { at: ago(60 * 24 * 2), label: "Couldn't ship", note: "Sotechy asked you to pay back ₦46,550 so the customer can be refunded" }],
  },
  {
    id: "o-1016", number: "SOT-1016", status: "declined", customer: customers[3], fulfilment: "pickup",
    items: [{ name: "Water Dispenser", image: "/demo/item-dispenser.png", qty: 1, price: 135_000 }],
    paidWithTokens: 0, createdAt: ago(60 * 24 * 9),
    history: [{ at: ago(60 * 24 * 9), label: "Order placed" }, { at: ago(60 * 24 * 9 - 200), label: "You declined", note: "Out of stock · customer refunded" }],
  },
];

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

export interface Product {
  id: string;
  name: string;
  image: string;
  category: string;
  price: number;
  compareAt?: number;
  stock: number;
  status: "live" | "draft" | "hidden";
  sold: number;
  options?: string[];
}

export const products: Product[] = [
  { id: "p1", name: "Spark 20 Smartphone 128GB", image: "/demo/item-phone.png", category: "Phones", price: 250_000, compareAt: 275_000, stock: 8, status: "live", sold: 42, options: ["Black", "Blue"] },
  { id: "p2", name: "Fast Charger 25W", image: "/demo/item-charger.png", category: "Accessories", price: 12_000, stock: 55, status: "live", sold: 130 },
  { id: "p3", name: "Power Bank 20,000mAh", image: "/demo/item-powerbank.png", category: "Accessories", price: 28_000, stock: 2, status: "live", sold: 64 },
  { id: "p4", name: '43" Smart TV', image: "/demo/item-tv.png", category: "TV & Audio", price: 390_000, compareAt: 420_000, stock: 3, status: "live", sold: 11 },
  { id: "p5", name: "Bluetooth Speaker", image: "/demo/item-speaker.png", category: "TV & Audio", price: 35_000, stock: 14, status: "live", sold: 27 },
  { id: "p6", name: "Sound Bar", image: "/demo/item-soundbar.png", category: "TV & Audio", price: 120_000, stock: 0, status: "live", sold: 9 },
  { id: "p7", name: "Split Air Conditioner 1.5HP", image: "/demo/item-ac.png", category: "Cooling", price: 410_000, stock: 5, status: "live", sold: 6 },
  { id: "p8", name: "Wireless Mouse", image: "/demo/item-mouse.png", category: "Accessories", price: 9_500, stock: 25, status: "draft", sold: 0 },
  { id: "p9", name: "14\" Laptop 8GB / 256GB", image: "/demo/item-laptop.png", category: "Computers", price: 620_000, stock: 4, status: "live", sold: 5 },
  { id: "p10", name: "Digital Air Fryer 4.5L", image: "/demo/item-airfryer.png", category: "Kitchen", price: 95_000, compareAt: 110_000, stock: 7, status: "hidden", sold: 18 },
];

/** Sales per day for the last 14 days (₦) */
export const salesByDay = [182_000, 96_000, 240_000, 410_000, 120_000, 88_000, 305_000, 512_000, 274_000, 199_000, 630_000, 145_000, 390_000, 455_000].map((amount, i, all) => ({
  day: new Date(Date.now() - (all.length - 1 - i) * 86_400_000).toLocaleDateString("en-NG", { weekday: "short", day: "numeric" }),
  amount,
}));

export const payouts = [
  { id: "po-9", orderNumber: "SOT-1038", half: "First 50%" as const, amount: 191_100, status: "paid" as const, at: ago(60 * 19) },
  { id: "po-8", orderNumber: "SOT-1035", half: "First 50%" as const, amount: 75_950, status: "paid" as const, at: ago(60 * 39) },
  { id: "po-7", orderNumber: "SOT-1031", half: "First 50%" as const, amount: 200_900, status: "paid" as const, at: ago(60 * 69) },
  { id: "po-6", orderNumber: "SOT-1027", half: "Second 50%" as const, amount: 9_310, status: "paid" as const, at: ago(60 * 24 * 3) },
  { id: "po-5", orderNumber: "SOT-1027", half: "First 50%" as const, amount: 9_310, status: "paid" as const, at: ago(60 * 24 * 4) },
  { id: "po-4", orderNumber: "SOT-1022", half: "Second 50%" as const, amount: 303_800, status: "paid" as const, at: ago(60 * 24 * 5) },
  { id: "po-3", orderNumber: "SOT-1022", half: "First 50%" as const, amount: 303_800, status: "paid" as const, at: ago(60 * 24 * 6) },
];

export const bank = { bankName: "GTBank", accountName: "XENA GADGETS LTD", accountNumber: "0123456789" };

export const token = {
  ticker: store.ticker,
  name: "Xena Gadgets Token",
  storeValue: STORE_VALUE_PER_TOKEN,
  issued: 48_620_000,
  circulating: 31_480_000,
  pending: 1_884_000,
  holders: 612,
  redeemed: 14_320_000,
  recyclingPool: 4_110_000,
  sotechyReserveWallet: 7_160_000,
  reserveNaira: 442_000,
  outstandingValueNaira: 286_000,
  contract: "0x7a3E…c19B",
  explorer: "https://monadscan.com/token/0x7a3e000000000000000000000000000000c19b",
  posMintedThisMonth: 2_150_000,
};

export const tokenActivity = [
  { kind: "mint" as const, label: "Released for SOT-1027", who: "@chidi", amount: 19_000, at: ago(60 * 24 * 3) },
  { kind: "bonus" as const, label: "Review bonus (with photo)", who: "@chidi", amount: 1_900, at: ago(60 * 24 * 2) },
  { kind: "redeem" as const, label: "Spent at checkout · SOT-1041", who: "@amaka.n", amount: 550_000, at: ago(190) },
  { kind: "pos" as const, label: "Walk-in sale · ₦45,000", who: "@tunde", amount: 45_000, at: ago(60 * 26) },
  { kind: "transfer" as const, label: "Sent between customers", who: "@ife → @blessed", amount: 20_000, at: ago(60 * 30) },
];

export const topHolders = [
  { username: "tunde", amount: 1_420_000 },
  { username: "chidi", amount: 988_500 },
  { username: "ife", amount: 640_000 },
  { username: "amaka.n", amount: 512_300 },
  { username: "blessed", amount: 301_900 },
];

export const reviews = [
  { id: "r1", product: "Wireless Mouse", customer: "@chidi", rating: 5, text: "Works perfectly, battery lasts long. Picked it up the same day.", photo: "/demo/item-mouse.png", bonus: 1_900, at: ago(60 * 24 * 2), reply: null as string | null },
  { id: "r2", product: "14\" Laptop 8GB / 256GB", customer: "@tunde", rating: 4, text: "Fast delivery and the laptop is solid. Charger is a bit short.", photo: null as string | null, bonus: 31_000, at: ago(60 * 24 * 4), reply: "Thanks Tunde! We'll add a longer cable option soon." },
  { id: "r3", product: "Spark 20 Smartphone 128GB", customer: "@amaka.n", rating: 5, text: "Genuine phone with warranty card. Very happy.", photo: "/demo/item-phone.png", bonus: 25_000, at: ago(60 * 24 * 9), reply: null },
];

export const team = [
  { name: "Ada Okafor", email: "ada@xenagadgets.ng", role: "Owner", status: "active" as const },
  { name: "Kunle Adebayo", email: "kunle@xenagadgets.ng", role: "Orders", status: "active" as const },
  { name: "Grace Idowu", email: "grace@xenagadgets.ng", role: "Catalogue", status: "active" as const },
  { name: "sam@xenagadgets.ng", email: "sam@xenagadgets.ng", role: "Finance", status: "invited" as const },
];

export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu",
  "FCT Abuja", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo",
  "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
];

/** A saved delivery area: set up once, then ticked on any product. */
export interface DeliveryZone {
  id: string;
  state: string;
  /** Empty = the whole state */
  areas: string[];
  fee: number;
  days: string;
  freeOver?: number;
  active: boolean;
}

export const deliveryZones: DeliveryZone[] = [
  { id: "z1", state: "Edo", areas: ["Benin City"], fee: 2_000, days: "Same day – 1 day", freeOver: 100_000, active: true },
  { id: "z2", state: "Edo", areas: ["Ekpoma", "Auchi"], fee: 4_000, days: "1–2 days", active: true },
  { id: "z3", state: "Delta", areas: ["Asaba", "Warri"], fee: 5_500, days: "2–3 days", active: true },
  { id: "z4", state: "Lagos", areas: [], fee: 7_500, days: "3–5 days", active: false },
];

export const pickup = { enabled: true, address: "No. 20 Etete Road, Benin City", hours: "Mon–Sat, 9am – 6pm" };

export const zoneLabel = (z: Pick<DeliveryZone, "state" | "areas">) => (z.areas.length ? `${z.areas.join(", ")} (${z.state})` : `All of ${z.state}`);
