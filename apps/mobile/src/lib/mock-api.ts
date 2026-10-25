// DEMO MODE: an in-memory stand-in for the Sotechy API so the UI can be built without a backend.
// Products, prices and stock here are dummy data, not real Sotechy inventory.
import { Asset } from "expo-asset";
import type {
  ApiClient,
  Branch,
  CatalogProduct,
  Category,
  Order,
  OrderDetail,
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
};

const branches: Branch[] = [
  { id: "b1", name: "Head Office — Etete Road", code: "BEN-01", address: "No. 20 Etete Road", city: "Benin City", state: "Edo", phone: "+234 000 000 0000", openingHours: "Mon–Sat 9am–6pm", isActive: true },
  { id: "b2", name: "Branch 2", code: "BR-02", address: "Address to be added", city: "Benin City", state: "Edo", phone: null, openingHours: "Mon–Sat 9am–6pm", isActive: true },
];

const categories: Category[] = [
  { id: "c1", name: "Phones & Accessories", slug: "phones-accessories", parentId: null, imageUrl: images.phones, sortOrder: 1, isActive: true },
  { id: "c2", name: "Computers & Gadgets", slug: "computers-gadgets", parentId: null, imageUrl: images.computers, sortOrder: 2, isActive: true },
  { id: "c3", name: "Home Appliances", slug: "home-appliances", parentId: null, imageUrl: images.home, sortOrder: 3, isActive: true },
  { id: "c4", name: "TV & Audio", slug: "tv-audio", parentId: null, imageUrl: images.tv, sortOrder: 4, isActive: true },
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
}

const seeds: Seed[] = [
  { name: "Spark 20 Smartphone 128GB", brand: "Tecno", cat: "c1", price: 250000, was: 275000, stock: [6, 2], featured: true, variants: ["128GB · Black", "128GB · Blue"], specs: { Storage: "128GB", RAM: "6GB", Battery: "5000mAh" } },
  { name: "Fast Charger 25W", brand: "Oraimo", cat: "c1", price: 12000, stock: [40, 15] },
  { name: "Power Bank 20,000mAh", brand: "Oraimo", cat: "c1", price: 28000, stock: [12, 8], featured: true },
  { name: "14\" Laptop 8GB / 256GB", brand: "HP", cat: "c2", price: 620000, stock: [3, 1], featured: true, specs: { RAM: "8GB", Storage: "256GB SSD", Screen: "14-inch" } },
  { name: "Wireless Mouse", brand: "Logitech", cat: "c2", price: 9500, stock: [25, 0] },
  { name: "4-Burner Gas Cooker", brand: "Maxi", cat: "c3", price: 285000, was: 310000, stock: [4, 2], featured: true },
  { name: "Standing Fan 18\"", brand: "Maxi", cat: "c3", price: 48000, stock: [10, 6] },
  { name: "Water Dispenser", brand: "Maxi", cat: "c3", price: 135000, stock: [2, 0] },
  { name: "3.5kVA Generator", brand: "Firman", cat: "c3", price: 480000, stock: [0, 0] },
  { name: "Electric Kettle 1.7L", brand: "Polystar", cat: "c3", price: 21000, stock: [10, 4] },
  { name: "43\" Smart TV", brand: "Hisense", cat: "c4", price: 390000, was: 420000, stock: [2, 1], featured: true, specs: { Screen: "43-inch", Resolution: "Full HD", Smart: "Yes" } },
  { name: "Sound Bar", brand: "Hisense", cat: "c4", price: 120000, stock: [5, 3] },
  { name: "Bluetooth Speaker", brand: "Oraimo", cat: "c4", price: 35000, stock: [9, 5] },
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
    description: "Demo product used while the design is being built. Real products, prices and photos will come from the admin dashboard.",
    specifications: s.specs ?? {},
    images: [],
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
});

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
};

const demoUser: User = { id: "u1", email: "demo@sotechy.shop", fullName: "Demo Customer", phone: null, role: "customer", branchId: null, createdAt: now() };
let signedIn = false;
const wishlist = new Set<string>(["p4"]);
const orders: OrderDetail[] = [];
const ordersByKey = new Map<string, OrderDetail>();

function makeOrder(input: PlaceOrderInput, status: Order["status"] = "pending_payment"): OrderDetail {
  const id = `o${orders.length + 1}`;
  const items = input.items.map((line, i) => {
    const product = products.find((p) => p.variants.some((v) => v.id === line.variantId))!;
    const variant = product.variants.find((v) => v.id === line.variantId)!;
    return { id: `${id}-i${i}`, orderId: id, variantId: variant.id, productName: product.name, variantName: variant.name, sku: variant.sku, unitPrice: variant.price, quantity: line.quantity, lineTotal: variant.price * line.quantity };
  });
  const subtotal = items.reduce((n, i) => n + i.lineTotal, 0);
  const deliveryFee = input.fulfilmentType === "delivery" && subtotal < (config.delivery.freeOver ?? Infinity) ? config.delivery.flatFee : 0;
  const discount = input.paymentMethod === "crypto" && input.cryptoAsset === "MOVE" ? Math.round(subtotal * 0.1) : 0;
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
    reservationExpiresAt: status === "pending_payment" ? new Date(Date.now() + 30 * 60_000).toISOString() : null,
    createdAt: now(),
    items,
    payments: [],
    history: [{ id: `${id}-h1`, fromStatus: null, toStatus: status, note: "Order placed", createdAt: now() }],
    branch,
    paymentInstructions:
      status !== "pending_payment"
        ? null
        : input.paymentMethod === "bank_transfer"
          ? { method: "bank_transfer", text: config.paymentMethods[0].instructions, bankName: "Demo Bank", accountName: "Sotechy Shop Ltd", accountNumber: "0000000000" }
          : input.paymentMethod === "crypto"
            ? { method: "crypto", text: config.paymentMethods[2].instructions, cryptoAsset: asset.symbol, cryptoNetwork: asset.network, receivingAddress: asset.receivingAddress }
            : { method: input.paymentMethod, text: "Online payment page opens here once Money Moves is connected." },
  };
}

// A couple of sample orders so the Orders tab has something to show.
orders.push(
  { ...makeOrder({ items: [{ variantId: "p11-v1", quantity: 1 }], fulfilmentType: "pickup", branchId: "b1", paymentMethod: "bank_transfer", idempotencyKey: "seed1" }, "delivered"), createdAt: new Date(2026, 9, 18).toISOString() },
);
orders.push(makeOrder({ items: [{ variantId: "p2-v1", quantity: 2 }], fulfilmentType: "delivery", branchId: "b1", paymentMethod: "bank_transfer", idempotencyKey: "seed2", deliveryAddress: { recipientName: "Demo Customer", phone: "0800 000 0000", line1: "1 Demo Street", city: "Benin City", state: "Edo" } }));

const unsupported = () => Promise.reject(new Error("Not available in demo mode"));
const summary = (o: OrderDetail): Order => {
  const { items: _i, payments: _p, history: _h, branch: _b, paymentInstructions: _pi, ...rest } = o;
  return rest;
};

export const mockApi: ApiClient = {
  request: unsupported,
  get: unsupported,
  post: unsupported,
  patch: unsupported,
  put: unsupported,
  delete: unsupported,

  register: async (input) => {
    signedIn = true;
    Object.assign(demoUser, { email: input.email, fullName: input.fullName ?? demoUser.fullName, phone: input.phone ?? null });
    return wait({ token: "demo-token", user: demoUser });
  },
  login: async (input) => {
    signedIn = true;
    demoUser.email = input.email || demoUser.email;
    return wait({ token: "demo-token", user: demoUser });
  },
  me: async () => {
    signedIn = true; // a stored demo token means the user signed in earlier
    return wait(demoUser);
  },

  storeConfig: async () => wait(config),
  categories: async () => wait(categories),
  products: async ({ q, category, sort, featured } = {}) => {
    let list = products.map(toCatalog);
    if (q) list = list.filter((p) => `${p.name} ${p.brand} ${p.model}`.toLowerCase().includes(q.toLowerCase()));
    if (category) list = list.filter((p) => categories.find((c) => c.id === p.categoryId)?.slug === category);
    if (featured) list = list.filter((p) => p.isFeatured);
    if (sort === "price_asc") list.sort((a, b) => a.minPrice - b.minPrice);
    else if (sort === "price_desc") list.sort((a, b) => b.minPrice - a.minPrice);
    else list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return wait(list);
  },
  product: async (idOrSlug) => {
    const p = products.find((x) => x.id === idOrSlug || x.slug === idOrSlug);
    return p ? wait(p) : Promise.reject(new Error("Product not found"));
  },

  placeOrder: async (input) => {
    const existing = ordersByKey.get(input.idempotencyKey);
    if (existing) return wait(summary(existing));
    const order = makeOrder(input);
    ordersByKey.set(input.idempotencyKey, order);
    orders.unshift(order);
    return wait(summary(order), 600);
  },
  myOrders: async () => wait(signedIn ? orders.map(summary) : []),
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
  startOnlinePayment: async () => Promise.reject(new Error("Online payment (Money Moves) isn't connected yet — this is demo mode.")),
  wishlist: async () => wait(products.filter((p) => wishlist.has(p.id)).map(toCatalog)),
  toggleWishlist: async (productId) => {
    const saved = !wishlist.delete(productId);
    if (saved) wishlist.add(productId);
    return wait({ saved });
  },
  createSupportTicket: async () => wait({ id: `t${Date.now()}` }),
};

export const demoMedia = {
  flyerWalkIn: require("../../assets/demo/banner-walkin.jpg"),
  flyerMaxi: require("../../assets/demo/banner-maxi.jpg"),
  appliances: require("../../assets/demo/banner-appliances.jpg"),
  storeFront: require("../../assets/demo/store-front.jpg"),
  storeInside: require("../../assets/demo/store-inside.jpg"),
  brands: [require("../../assets/demo/brand-hisense.png"), require("../../assets/demo/brand-firman.jpg")],
};
