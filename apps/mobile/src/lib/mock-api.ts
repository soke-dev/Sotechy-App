// DEMO MODE: an in-memory stand-in for the Sotechy API so the UI can be built without a backend.
// Products, prices and stock here are dummy data, not real Sotechy inventory.
import { Asset } from "expo-asset";
import { DEMO_DETAILS, DEMO_REVIEWS } from "./mock-content";
import { DEFAULT_FEATURES } from "@sotechy/shared";
import type {
  Address,
  ProductReviews,
  Review,
  ApiClient,
  Branch,
  CatalogProduct,
  Category,
  Order,
  OrderDetail,
  OrderSummary,
  PlaceOrderInput,
  ProductDetail,
  StoreConfig,
  User,
} from "@sotechy/shared";

const uri = (mod: number) => Asset.fromModule(mod).uri;
const wait = <T>(value: T, ms = 300) => new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));
const now = () => new Date().toISOString();

const images = {
  phones: uri(require("../../assets/demo/cat-phones.jpg")),
  computers: uri(require("../../assets/demo/cat-computers.jpg")),
  home: uri(require("../../assets/demo/cat-home.jpg")),
  tv: uri(require("../../assets/demo/cat-tv.jpg")),
  power: uri(require("../../assets/demo/cat-power.jpg")),
  appliances: uri(require("../../assets/demo/banner-appliances.jpg")),
  storeInside: uri(require("../../assets/demo/store-inside.jpg")),
  fridge: uri(require("../../assets/demo/item-fridge.png")),
  microwave: uri(require("../../assets/demo/item-microwave.png")),
  ac: uri(require("../../assets/demo/item-ac.png")),
  phone: uri(require("../../assets/demo/item-phone.png")),
  charger: uri(require("../../assets/demo/item-charger.png")),
  powerbank: uri(require("../../assets/demo/item-powerbank.png")),
  laptop: uri(require("../../assets/demo/item-laptop.png")),
  mouse: uri(require("../../assets/demo/item-mouse.png")),
  speaker: uri(require("../../assets/demo/item-speaker.png")),
  soundbar: uri(require("../../assets/demo/item-soundbar.png")),
  tvItem: uri(require("../../assets/demo/item-tv.png")),
  kettle: uri(require("../../assets/demo/item-kettle.png")),
  dispenser: uri(require("../../assets/demo/item-dispenser.png")),
  fan: uri(require("../../assets/demo/item-fan.png")),
  generator: uri(require("../../assets/demo/item-generator.png")),
  cooker: uri(require("../../assets/demo/item-cooker.png")),
  airfryer: uri(require("../../assets/demo/item-airfryer.png")),
  heater: uri(require("../../assets/demo/item-heater.png")),
  blender: uri(require("../../assets/demo/item-blender.png")),
  hob: uri(require("../../assets/demo/item-hob.png")),
};

const branches: Branch[] = [
  { id: "b1", name: "Head Office — Etete Road", code: "BEN-01", address: "No. 20 Etete Road", city: "Benin City", state: "Edo", phone: "+234 000 000 0000", openingHours: "Mon–Sat 9am–6pm", isActive: true },
];

const top = (id: string, name: string, slug: string, imageUrl: string, sortOrder: number): Category => ({ id, name, slug, parentId: null, imageUrl, sortOrder, isActive: true });
const sub = (id: string, parentId: string, name: string, slug: string, sortOrder: number): Category => ({ id, name, slug, parentId, imageUrl: null, sortOrder, isActive: true });

const categories: Category[] = [
  top("c1", "Phones & Tablets", "phones-tablets", images.phones, 1),
  sub("c1a", "c1", "Smartphones", "smartphones", 1),
  sub("c1b", "c1", "Chargers & Power Banks", "chargers-power-banks", 2),
  sub("c1c", "c1", "Phone Accessories", "phone-accessories", 3),
  top("c2", "Computers", "computers", images.computers, 2),
  sub("c2a", "c2", "Laptops", "laptops", 1),
  sub("c2b", "c2", "Computer Accessories", "computer-accessories", 2),
  top("c4", "TVs & Audio", "tvs-audio", images.tv, 3),
  sub("c4a", "c4", "Smart TVs", "smart-tvs", 1),
  sub("c4b", "c4", "Sound Bars", "sound-bars", 2),
  sub("c4c", "c4", "Speakers", "speakers", 3),
  top("c3", "Home Appliances", "home-appliances", images.home, 4),
  sub("c3a", "c3", "Cookers & Microwaves", "cookers-microwaves", 1),
  sub("c3b", "c3", "Fans & Cooling", "fans-cooling", 2),
  sub("c3c", "c3", "Water Dispensers", "water-dispensers", 3),
  sub("c3d", "c3", "Small Appliances", "small-appliances", 4),
  sub("c3e", "c3", "Refrigerators & Freezers", "refrigerators-freezers", 5),
  top("c5", "Power Solutions", "power-solutions", images.power, 5),
  sub("c5a", "c5", "Generators", "generators", 1),
  sub("c5b", "c5", "Stabilizers & Inverters", "stabilizers-inverters", 2),
];

interface Seed {
  name: string;
  brand: string;
  cat: string;
  price: number;
  was?: number;
  stock: [number, number];
  featured?: boolean;
  variants?: string[];
  specs?: Record<string, string>;
  /** Demo photos (stand-ins until real product photos are uploaded) */
  imgs?: (keyof typeof images)[];
}

const seeds: Seed[] = [
  { name: "Spark 20 Smartphone 128GB", brand: "Tecno", cat: "c1a", imgs: ["phone"], price: 250000, was: 275000, stock: [6, 2], featured: true, variants: ["128GB · Black", "128GB · Blue"], specs: { Storage: "128GB", RAM: "6GB", Battery: "5000mAh" } },
  { name: "Fast Charger 25W", brand: "Oraimo", cat: "c1b", imgs: ["charger"], price: 12000, stock: [40, 15] },
  { name: "Power Bank 20,000mAh", brand: "Oraimo", cat: "c1b", imgs: ["powerbank"], price: 28000, stock: [12, 8], featured: true },
  { name: "14\" Laptop 8GB / 256GB", brand: "HP", cat: "c2a", imgs: ["laptop"], price: 620000, stock: [3, 1], featured: true, specs: { RAM: "8GB", Storage: "256GB SSD", Screen: "14-inch" } },
  { name: "Wireless Mouse", brand: "Logitech", cat: "c2b", imgs: ["mouse"], price: 9500, stock: [25, 0] },
  { name: "4-Burner Gas Cooker", brand: "Maxi", cat: "c3a", imgs: ["cooker", "hob", "storeInside"], price: 285000, was: 310000, stock: [4, 2], featured: true },
  { name: "Double Door Refrigerator 350L", brand: "Hisense", cat: "c3e", imgs: ["fridge", "home", "storeInside"], price: 545000, was: 599000, stock: [3, 2], featured: true, specs: { Capacity: "350 litres", Type: "Double door", Energy: "A+" } },
  { name: "Microwave Oven 20L", brand: "Polystar", cat: "c3a", imgs: ["microwave"], price: 78000, was: 89000, stock: [7, 4], featured: true },
  { name: "Split Air Conditioner 1.5HP", brand: "Hisense", cat: "c3b", imgs: ["ac"], price: 410000, stock: [5, 1], specs: { Capacity: "1.5HP", Type: "Split", Inverter: "Yes" } },
  { name: "Standing Fan 18\"", brand: "Maxi", cat: "c3b", imgs: ["fan"], price: 48000, stock: [10, 6] },
  { name: "Water Dispenser", brand: "Maxi", cat: "c3c", imgs: ["dispenser"], price: 135000, stock: [2, 0] },
  { name: "3.5kVA Generator", brand: "Firman", cat: "c5a", imgs: ["generator", "power"], price: 480000, stock: [0, 0] },
  { name: "Electric Kettle 1.7L", brand: "Polystar", cat: "c3d", imgs: ["kettle"], price: 21000, stock: [10, 4] },
  { name: "43\" Smart TV", brand: "Hisense", cat: "c4a", imgs: ["tvItem", "tv", "storeInside"], price: 390000, was: 420000, stock: [2, 1], featured: true, specs: { Screen: "43-inch", Resolution: "Full HD", Smart: "Yes" } },
  { name: "Sound Bar", brand: "Hisense", cat: "c4b", imgs: ["soundbar"], price: 120000, stock: [5, 3] },
  { name: "Bluetooth Speaker", brand: "Oraimo", cat: "c4c", imgs: ["speaker"], price: 35000, stock: [9, 5] },
  { name: "Digital Air Fryer 4.5L", brand: "Maxi", cat: "c3d", imgs: ["airfryer"], price: 95000, was: 110000, stock: [6, 3], featured: true },
  { name: "Instant Water Heater 15L", brand: "Maxi", cat: "c3d", imgs: ["heater"], price: 72000, stock: [4, 2] },
  { name: "Table Blender 1.5L", brand: "Maxi", cat: "c3d", imgs: ["blender"], price: 38000, stock: [9, 5] },
  { name: "Built-in Gas Hob, 4 Burners", brand: "Maxi", cat: "c3a", imgs: ["hob"], price: 165000, stock: [2, 1] },
];

const products: ProductDetail[] = seeds.map((s, i) => {
  const id = `p${i + 1}`;
  const variants = (s.variants ?? ["Standard"]).map((name, vi) => ({
    id: `${id}-v${vi + 1}`,
    productId: id,
    sku: `DEMO-${i + 1}-${vi + 1}`,
    name,
    attributes: {},
    price: s.price,
    compareAtPrice: s.was ?? null,
    isActive: true,
  }));
  return {
    id,
    categoryId: s.cat,
    name: s.name,
    slug: `demo-${i + 1}`,
    brand: s.brand,
    model: `DM-${100 + i}`,
    description: DEMO_DETAILS[s.name]?.about ?? "Demo product used while the design is being built. Real products, prices and photos will come from the admin dashboard.",
    specifications: DEMO_DETAILS[s.name]?.specs ?? s.specs ?? {},
    highlights: DEMO_DETAILS[s.name]?.highlights ?? [],
    inTheBox: DEMO_DETAILS[s.name]?.box ?? [],
    images: (s.imgs ?? []).map((k) => images[k]),
    condition: "new",
    warrantyMonths: 12,
    returnPolicy: "7-day return for unused items in original packaging (placeholder).",
    lowStockThreshold: 3,
    allowDelivery: true,
    allowPickup: true,
    isPublished: true,
    isFeatured: !!s.featured,
    isDemo: true,
    createdAt: new Date(2026, 9, 25 - i).toISOString(),
    variants,
    stock: variants.flatMap((v) =>
      branches.map((b, bi) => ({ variantId: v.id, branchId: b.id, branchName: b.name, quantity: s.stock[bi], reserved: 0 })),
    ),
  };
});

// Demo reviews keyed by product id
const reviewsByProduct = new Map<string, Review[]>();
for (const p of products) {
  const list = (DEMO_REVIEWS[p.name] ?? []).map((r, i) => ({
    id: `${p.id}-r${i + 1}`,
    productId: p.id,
    userId: `demo-reviewer-${i}`,
    authorName: r.author,
    avatarStyle: r.avatar,
    rating: r.rating,
    title: r.title,
    body: r.body,
    verified: r.verified,
    createdAt: new Date(Date.now() - r.daysAgo * 86_400_000).toISOString(),
  }));
  reviewsByProduct.set(p.id, list);
}

function reviewSummary(productId: string): ProductReviews["summary"] {
  const list = reviewsByProduct.get(productId) ?? [];
  const distribution = [0, 0, 0, 0, 0];
  for (const r of list) distribution[r.rating - 1]++;
  const average = list.length ? Math.round((list.reduce((n, r) => n + r.rating, 0) / list.length) * 10) / 10 : 0;
  return { average, count: list.length, distribution };
}

const toCatalog = (p: ProductDetail): CatalogProduct => ({
  id: p.id,
  name: p.name,
  slug: p.slug,
  brand: p.brand,
  model: p.model,
  categoryId: p.categoryId,
  categoryName: categories.find((c) => c.id === p.categoryId)?.name ?? null,
  imageUrl: p.images[0] ?? null,
  minPrice: Math.min(...p.variants.map((v) => v.price)),
  compareAtPrice: p.variants[0]?.compareAtPrice ?? null,
  totalAvailable: p.stock.reduce((n, s) => n + s.quantity - s.reserved, 0),
  isFeatured: p.isFeatured,
  isPublished: true,
  isDemo: true,
  createdAt: p.createdAt,
  ratingAverage: reviewSummary(p.id).count ? reviewSummary(p.id).average : null,
  ratingCount: reviewSummary(p.id).count,
});

/** Catalogue matching the search text and category (a parent category includes its sub-categories). */
function baseList(q?: string, category?: string) {
  let list = products.map(toCatalog);
  if (q) list = list.filter((p) => `${p.name} ${p.brand} ${p.model}`.toLowerCase().includes(q.toLowerCase()));
  if (category) {
    const match = categories.find((c) => c.slug === category);
    const ids = new Set(categories.filter((c) => c.id === match?.id || c.parentId === match?.id).map((c) => c.id));
    list = list.filter((p) => p.categoryId && ids.has(p.categoryId));
  }
  return list;
}

const config: StoreConfig = {
  branches,
  paymentMethods: [
    { code: "bank_transfer", label: "Bank transfer", isEnabled: true, online: true, inStore: true, instructions: "Transfer the exact amount and use your order number as the narration." },
    { code: "online", label: "Pay online (Money Moves)", isEnabled: true, online: true, inStore: false, instructions: null },
    { code: "crypto", label: "Crypto", isEnabled: true, online: true, inStore: true, instructions: "Send the exact amount on the network shown." },
  ],
  cryptoAssets: [{ id: "a1", symbol: "MOVE", name: "Movement", network: "Movement", receivingAddress: "0xDEMO000000000000000000000000000000000000", isEnabled: true }],
  promotions: [
    { id: "pr1", name: "Pay with $MOVE — up to 10% off", code: null, discountType: "percentage", value: 10, maxDiscountAmount: null, minOrderAmount: null, paymentMethod: "crypto", cryptoAsset: "MOVE", startsAt: null, endsAt: null, usageLimit: null, usageCount: 0, isActive: true },
  ],
  delivery: { flatFee: 3000, freeOver: 500000, note: "Delivery within Benin City in 1–2 days (demo text)." },
  support: { phone: "+234 000 000 0000", email: "hello@sotechy.shop", whatsapp: "+234 000 000 0000" },
  features: DEFAULT_FEATURES,
  // Empty = the app's built-in banners
  banners: [],
};

const demoUser: User = { id: "u1", email: "demo@sotechy.shop", fullName: "Demo Customer", username: null, phone: null, whatsappPhone: null, role: "customer", branchId: null, createdAt: now() };
let signedIn = false;
const wishlist = new Set<string>(["p4"]);
// Promo codes customers can type at checkout (codeless offers live in config.promotions)
const promoCodes = [{ code: "WELCOME5", name: "Welcome: 5% off", percent: 5, max: 20_000, minOrder: 10_000 }];

function promoDiscount(code: string | undefined, subtotal: number) {
  if (!code) return null;
  const promo = promoCodes.find((p) => p.code === code.trim().toUpperCase());
  if (!promo || subtotal < promo.minOrder) return null;
  return { promo, discount: Math.min(promo.max, Math.round((subtotal * promo.percent) / 100)) };
}

const orders: OrderDetail[] = [];
/** Demo mode has no Money Moves page; checkout links starting with this open a stand-in window in the app. */
export const DEMO_CHECKOUT_URL = "demo://moneymoves/checkout";
const ordersByKey = new Map<string, OrderDetail>();
const addresses: Address[] = [
  { id: "a1", label: "Home", recipientName: "Demo Customer", phone: "0800 000 0000", line1: "12 Airport Road", line2: "Opposite the filling station", city: "Benin City", state: "Edo", isDefault: true },
  { id: "a2", label: "Office", recipientName: "Demo Customer", phone: "0800 000 0000", line1: "45 Sapele Road", line2: null, city: "Benin City", state: "Edo", isDefault: false },
];
const sortedAddresses = () => [...addresses].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));

const STEP_NOTES: Partial<Record<Order["status"], string>> = {
  pending_payment: "Order placed",
  paid: "Payment confirmed",
  processing: "We're preparing your order",
  ready_for_pickup: "Ready for collection at the store",
  dispatched: "Out for delivery with our rider",
  delivered: "Order completed",
  cancelled: "Order cancelled",
};

/** Builds a believable status history up to `status`, spaced out after `placedAt`. */
function buildHistory(id: string, status: Order["status"], fulfilment: PlaceOrderInput["fulfilmentType"], placedAt: Date) {
  const flow: Order["status"][] =
    fulfilment === "pickup" ? ["pending_payment", "paid", "processing", "ready_for_pickup", "delivered"] : ["pending_payment", "paid", "processing", "dispatched", "delivered"];
  const steps = status === "cancelled" ? (["pending_payment", "cancelled"] as Order["status"][]) : flow.slice(0, flow.indexOf(status) + 1);
  const gaps = [0, 25, 120, 1440, 2880]; // minutes after placing
  return steps.map((to, i) => ({
    id: `${id}-h${i + 1}`,
    fromStatus: i === 0 ? null : steps[i - 1],
    toStatus: to,
    note: to === "delivered" && fulfilment === "pickup" ? "Collected from the store" : (STEP_NOTES[to] ?? null),
    createdAt: new Date(placedAt.getTime() + (gaps[i] ?? i * 60) * 60_000).toISOString(),
  }));
}

function makeOrder(input: PlaceOrderInput, status: Order["status"] = "pending_payment", placedAt = new Date()): OrderDetail {
  const id = `o${orders.length + 1}`;
  const items = input.items.map((line, i) => {
    const product = products.find((p) => p.variants.some((v) => v.id === line.variantId))!;
    const variant = product.variants.find((v) => v.id === line.variantId)!;
    return { id: `${id}-i${i}`, orderId: id, variantId: variant.id, productName: product.name, variantName: variant.name, sku: variant.sku, unitPrice: variant.price, quantity: line.quantity, lineTotal: variant.price * line.quantity, imageUrl: product.images[0] ?? null, productId: product.id };
  });
  const subtotal = items.reduce((n, i) => n + i.lineTotal, 0);
  const deliveryFee = input.fulfilmentType === "delivery" && subtotal < (config.delivery.freeOver ?? Infinity) ? config.delivery.flatFee : 0;
  const discount = input.paymentMethod === "crypto" && input.cryptoAsset === "MOVE" ? Math.round(subtotal * 0.1) : (promoDiscount(input.promoCode, subtotal)?.discount ?? 0);
  const branch = branches.find((b) => b.id === input.branchId) ?? null;
  const asset = config.cryptoAssets[0];
  return {
    id,
    orderNumber: `SOT-${1001 + orders.length}`,
    customerId: demoUser.id,
    channel: "online",
    branchId: input.branchId,
    fulfilmentType: input.fulfilmentType,
    deliveryAddress: input.deliveryAddress ?? null,
    status,
    subtotal,
    discountTotal: discount,
    deliveryFee,
    total: subtotal - discount + deliveryFee,
    currency: "NGN",
    paymentMethod: input.paymentMethod,
    cryptoAsset: input.paymentMethod === "crypto" ? (input.cryptoAsset ?? "MOVE") : null,
    reservationExpiresAt: status === "pending_payment" ? new Date(placedAt.getTime() + 30 * 60_000).toISOString() : null,
    createdAt: placedAt.toISOString(),
    items,
    payments: [],
    history: buildHistory(id, status, input.fulfilmentType, placedAt),
    branch,
    paymentInstructions:
      status !== "pending_payment"
        ? null
        : input.paymentMethod === "bank_transfer"
          ? { method: "bank_transfer", text: config.paymentMethods[0].instructions, bankName: "Demo Bank", accountName: "Sotechy Shop Ltd", accountNumber: "0000000000" }
          : input.paymentMethod === "crypto"
            ? { method: "crypto", text: config.paymentMethods[2].instructions, cryptoAsset: asset.symbol, cryptoNetwork: asset.network, receivingAddress: asset.receivingAddress }
            : { method: input.paymentMethod, text: "Pay securely with Money Moves: bank transfer, crypto or the Money Moves app." },
  };
}

// Sample orders covering each status so the Orders screens have something to show.
const daysAgo = (d: number, h = 10) => {
  const t = new Date();
  t.setDate(t.getDate() - d);
  t.setHours(h, 15, 0, 0);
  return t;
};
const demoAddress = { recipientName: "Demo Customer", phone: "0800 000 0000", line1: "12 Airport Road", city: "Benin City", state: "Edo" };
orders.push(makeOrder({ items: [{ variantId: "p2-v1", quantity: 2 }, { variantId: "p3-v1", quantity: 1 }], fulfilmentType: "delivery", branchId: "b1", paymentMethod: "online", idempotencyKey: "seed1", deliveryAddress: demoAddress }, "pending_payment", new Date(Date.now() - 6 * 60_000)));
orders.push(makeOrder({ items: [{ variantId: "p8-v1", quantity: 1 }, { variantId: "p13-v1", quantity: 1 }], fulfilmentType: "pickup", branchId: "b1", paymentMethod: "bank_transfer", idempotencyKey: "seed2" }, "ready_for_pickup", daysAgo(1, 11)));
orders.push(makeOrder({ items: [{ variantId: "p7-v1", quantity: 1 }], fulfilmentType: "delivery", branchId: "b1", paymentMethod: "crypto", cryptoAsset: "MOVE", idempotencyKey: "seed3", deliveryAddress: demoAddress }, "dispatched", daysAgo(2, 9)));
orders.push(makeOrder({ items: [{ variantId: "p14-v1", quantity: 1 }], fulfilmentType: "pickup", branchId: "b1", paymentMethod: "bank_transfer", idempotencyKey: "seed4" }, "delivered", daysAgo(7, 14)));
orders.push(makeOrder({ items: [{ variantId: "p16-v1", quantity: 1 }], fulfilmentType: "pickup", branchId: "b1", paymentMethod: "bank_transfer", idempotencyKey: "seed5" }, "cancelled", daysAgo(12, 16)));

const unsupported = () => Promise.reject(new Error("Not available in demo mode"));
const summary = (o: OrderDetail): Order => {
  const { items: _i, payments: _p, history: _h, branch: _b, paymentInstructions: _pi, ...rest } = o;
  return rest;
};
const listItem = (o: OrderDetail): OrderSummary => ({ ...summary(o), items: o.items });

export const mockApi: ApiClient = {
  request: unsupported,
  get: unsupported,
  post: unsupported,
  patch: unsupported,
  put: unsupported,
  delete: unsupported,

  register: async (input) => {
    signedIn = true;
    Object.assign(demoUser, { email: input.email, fullName: input.fullName ?? demoUser.fullName, username: input.username ?? null, phone: input.phone ?? null });
    return wait({ token: "demo-token", user: demoUser });
  },
  googleSignIn: async () => {
    signedIn = true;
    Object.assign(demoUser, { email: "demo.google@sotechy.shop", fullName: "Demo Google User" });
    return wait({ token: "demo-token", user: demoUser });
  },
  login: async (input) => {
    signedIn = true;
    demoUser.email = input.email || demoUser.email;
    return wait({ token: "demo-token", user: demoUser });
  },
  updateProfile: async (input) => {
    Object.assign(demoUser, input);
    return wait({ ...demoUser });
  },
  checkUsername: async (name) => {
    const n = name.toLowerCase().replace(/^@/, "");
    const taken = ["sotechy", "admin", "support", "chidi"].includes(n);
    return wait({ username: n, available: !taken, reason: taken ? `@${n} is taken` : null });
  },
  addresses: async () => wait(sortedAddresses()),
  addAddress: async (input) => {
    const makeDefault = !!input.isDefault || addresses.length === 0;
    if (makeDefault) addresses.forEach((a) => (a.isDefault = false));
    const address: Address = { ...input, id: `a${Date.now()}`, label: input.label ?? null, line2: input.line2 ?? null, isDefault: makeDefault };
    addresses.push(address);
    return wait(address);
  },
  updateAddress: async (id, input) => {
    const address = addresses.find((a) => a.id === id);
    if (!address) return Promise.reject(new Error("Address not found"));
    if (input.isDefault) addresses.forEach((a) => (a.isDefault = false));
    Object.assign(address, input);
    return wait({ ...address });
  },
  deleteAddress: async (id) => {
    const i = addresses.findIndex((a) => a.id === id);
    if (i >= 0) addresses.splice(i, 1);
    return wait(null);
  },
  me: async () => {
    signedIn = true; // a stored demo token means the user signed in earlier
    return wait(demoUser);
  },

  storeConfig: async () => wait(config),
  // Placeholder until the Money Moves rate is connected (same value as the API)
  exchangeRate: async () => wait({ base: "USD" as const, quote: "NGN" as const, rate: 1550, source: "placeholder" as const, updatedAt: now() }),
  categories: async () => wait(categories),
  products: async ({ q, category, sort, featured, deals, brands, minPrice, maxPrice, minRating, inStock } = {}) => {
    // Same rules as the API: every filter combines, several brands match any of them.
    let list = baseList(q, category);
    if (featured) list = list.filter((p) => p.isFeatured);
    if (deals) list = list.filter((p) => p.isFeatured || (p.compareAtPrice ?? 0) > p.minPrice);
    if (brands?.length) list = list.filter((p) => !!p.brand && brands.includes(p.brand));
    if (minPrice !== undefined) list = list.filter((p) => p.minPrice >= minPrice);
    if (maxPrice !== undefined) list = list.filter((p) => p.minPrice <= maxPrice);
    if (minRating) list = list.filter((p) => (p.ratingAverage ?? 0) >= minRating);
    if (inStock) list = list.filter((p) => p.totalAvailable > 0);
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (sort === "price_asc") list.sort((a, b) => a.minPrice - b.minPrice);
    else if (sort === "price_desc") list.sort((a, b) => b.minPrice - a.minPrice);
    else if (sort === "rating") list.sort((a, b) => (b.ratingAverage ?? 0) - (a.ratingAverage ?? 0) || (b.ratingCount ?? 0) - (a.ratingCount ?? 0));
    return wait(list);
  },
  productFacets: async ({ q, category } = {}) => {
    const list = baseList(q, category);
    const brands = new Map<string, number>();
    for (const p of list) if (p.brand) brands.set(p.brand, (brands.get(p.brand) ?? 0) + 1);
    const prices = list.map((p) => p.minPrice).filter((p) => p > 0);
    return wait({
      total: list.length,
      brands: [...brands].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
      price: { min: prices.length ? Math.min(...prices) : 0, max: prices.length ? Math.max(...prices) : 0 },
    });
  },
  product: async (idOrSlug) => {
    const p = products.find((x) => x.id === idOrSlug || x.slug === idOrSlug);
    if (!p) return Promise.reject(new Error("Product not found"));
    const summary = reviewSummary(p.id);
    return wait({ ...p, ratingAverage: summary.count ? summary.average : null, ratingCount: summary.count });
  },
  productReviews: async (idOrSlug) => {
    const p = products.find((x) => x.id === idOrSlug || x.slug === idOrSlug);
    if (!p) return Promise.reject(new Error("Product not found"));
    const reviews = [...(reviewsByProduct.get(p.id) ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return wait({ summary: reviewSummary(p.id), reviews });
  },
  submitReview: async (input) => {
    const list = reviewsByProduct.get(input.productId) ?? [];
    const verified = orders.some((o) => o.status === "delivered" && o.items.some((i) => i.productId === input.productId));
    const review: Review = {
      id: `mine-${input.productId}`,
      productId: input.productId,
      userId: demoUser.id,
      authorName: demoUser.fullName?.split(" ")[0] ?? "You",
      avatarStyle: demoUser.avatarStyle ?? null,
      rating: input.rating,
      title: input.title ?? null,
      body: input.body,
      verified,
      createdAt: now(),
    };
    reviewsByProduct.set(input.productId, [review, ...list.filter((r) => r.userId !== demoUser.id)]);
    return wait({ id: review.id });
  },

  checkPromo: async ({ code, subtotal }) => {
    const found = promoDiscount(code, subtotal);
    if (!found) return Promise.reject(new Error("Promo code is not valid for this order"));
    return wait({ code: found.promo.code, name: found.promo.name, discount: found.discount });
  },
  placeOrder: async (input) => {
    if (input.promoCode && !promoDiscount(input.promoCode, 1e12)) return Promise.reject(new Error("Promo code is not valid for this order"));
    const existing = ordersByKey.get(input.idempotencyKey);
    if (existing) return wait(summary(existing));
    const order = makeOrder(input);
    ordersByKey.set(input.idempotencyKey, order);
    orders.unshift(order);
    return wait(summary(order), 600);
  },
  myOrders: async () => wait(signedIn ? orders.map(listItem) : []),
  order: async (id) => {
    const o = orders.find((x) => x.id === id);
    return o ? wait(o) : Promise.reject(new Error("Order not found"));
  },
  cancelOrder: async (id) => {
    const o = orders.find((x) => x.id === id);
    if (!o) return Promise.reject(new Error("Order not found"));
    o.history.push({ id: `${id}-h${o.history.length + 1}`, fromStatus: o.status, toStatus: "cancelled", note: "Cancelled by customer", createdAt: now() });
    o.status = "cancelled";
    o.paymentInstructions = null;
    return wait(summary(o));
  },
  startOnlinePayment: async (orderId) => {
    const o = orders.find((x) => x.id === orderId);
    if (!o || o.status !== "pending_payment") return Promise.reject(new Error("This order is not awaiting payment"));
    return wait({ checkoutUrl: `${DEMO_CHECKOUT_URL}?order=${orderId}` });
  },
  wishlist: async () => wait(products.filter((p) => wishlist.has(p.id)).map(toCatalog)),
  toggleWishlist: async (productId) => {
    const saved = !wishlist.delete(productId);
    if (saved) wishlist.add(productId);
    return wait({ saved });
  },
  createSupportTicket: async () => wait({ id: `t${Date.now()}` }),
  forgotPassword: async () => wait({ ok: true as const }),
  resetPassword: async () => wait({ token: "demo-token", user: { ...demoUser } }),
  // The merchant dashboard is web-only
  merchantMe: unsupported,
  openStore: unsupported,
  updateStore: unsupported,
};

/** Demo only: does what the Money Moves webhook does when a payment succeeds. */
export async function completeDemoPayment(orderId: string, via: string) {
  const o = orders.find((x) => x.id === orderId);
  if (!o || o.status !== "pending_payment") return;
  o.history.push({ id: `${orderId}-h${o.history.length + 1}`, fromStatus: o.status, toStatus: "paid", note: `Paid with Money Moves (${via})`, createdAt: now() });
  o.status = "paid";
  o.paymentInstructions = null;
  o.reservationExpiresAt = null;
  await wait(null, 900);
}

export const demoMedia = {
  cutoutHome: require("../../assets/demo/cutout-home.png"),
  fridge: require("../../assets/demo/item-fridge.png"),
  microwave: require("../../assets/demo/item-microwave.png"),
  ac: require("../../assets/demo/item-ac.png"),
  power: require("../../assets/demo/cat-power.jpg"),
  storeFront: require("../../assets/demo/store-front.jpg"),
  storeInside: require("../../assets/demo/store-inside.jpg"),
  brands: [require("../../assets/demo/brand-hisense.png"), require("../../assets/demo/brand-firman.jpg")],
};
