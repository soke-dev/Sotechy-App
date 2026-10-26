// Sample marketplace data for the customer app: stores with their own themes, their products, and the
// customer's token wallet. Same stores and tickers as the admin and merchant dashboards. Replaced by
// API calls (and Monad reads for balances) once the marketplace backend is built.
/** A bundled image (require) or one from the API */
export type Img = number | { uri: string };

/** Store value of one token: the reserve half of the 2% fee, spread over the token and its maximum review bonus */
export const TOKEN_VALUE = (0.02 * 0.5) / 1.1;
export const CROSS_BONUS = 0.1;

export interface StoreTheme {
  accent: string;
  onAccent: string;
  bg: string;
  surface: string;
  text: string;
  muted: string;
  hero: string;
  onHero: string;
  dark?: boolean;
}

// Same presets as the merchant dashboard's storefront editor
export const THEMES: Record<string, StoreTheme> = {
  sotechy: { accent: "#F7931E", onAccent: "#FFFFFF", bg: "#FAF7F3", surface: "#FFFFFF", text: "#17120E", muted: "#7F756C", hero: "#17120E", onHero: "#FFFFFF" },
  midnight: { accent: "#FDB913", onAccent: "#17120E", bg: "#121620", surface: "#1E2433", text: "#F3F5FA", muted: "#9AA3B5", hero: "#0B0E15", onHero: "#FFFFFF", dark: true },
  forest: { accent: "#1F7A4D", onAccent: "#FFFFFF", bg: "#F3F7F2", surface: "#FFFFFF", text: "#14261C", muted: "#5E7466", hero: "#173B2A", onHero: "#FFFFFF" },
  ocean: { accent: "#1E6FD9", onAccent: "#FFFFFF", bg: "#F2F6FC", surface: "#FFFFFF", text: "#0F1E33", muted: "#5B6B82", hero: "#0E2F5C", onHero: "#FFFFFF" },
};

export interface StoreProduct {
  id: string;
  name: string;
  price: number;
  compareAt?: number;
  /** A photo; products without one show `icon` (an Ionicons name) on the store's colour */
  image?: Img;
  icon?: string;
  about?: string;
  /** Products from Sotechy's own catalogue open the real product page */
  slug?: string;
  /** The store takes offers; an agreed price is held this many hours (never more than 24) */
  negotiable?: { hours: 6 | 12 | 24 };
}

export interface MarketStore {
  slug: string;
  name: string;
  ticker: string;
  tagline: string;
  about: string;
  city: string;
  rating: number;
  reviews: number;
  followers: number;
  kind: string;
  /** Uploaded logo and cover photo; stores without them get a drawn mark and cover */
  logo?: Img;
  cover?: Img;
  /** Three things the store wants buyers to know, shown on its product pages */
  highlights?: string[];
  theme: StoreTheme;
  delivery: { states: string[]; homeFrom: number; pickup?: string };
  announcement?: string;
  /** The store's slide in the Home banner carousel */
  promo?: { overline: string; title: string; subtitle: string; productId: string };
  sinceMonths: number;
  /** Sotechy's own store: its products come from the live catalogue */
  isSotechy?: boolean;
  products: StoreProduct[];
}

const img = {
  phone: require("../../assets/demo/item-phone.png"),
  charger: require("../../assets/demo/item-charger.png"),
  powerbank: require("../../assets/demo/item-powerbank.png"),
  speaker: require("../../assets/demo/item-speaker.png"),
  soundbar: require("../../assets/demo/item-soundbar.png"),
  mouse: require("../../assets/demo/item-mouse.png"),
  laptop: require("../../assets/demo/item-laptop.png"),
  tv: require("../../assets/demo/item-tv.png"),
  fridge: require("../../assets/demo/item-fridge.png"),
  ac: require("../../assets/demo/item-ac.png"),
  microwave: require("../../assets/demo/item-microwave.png"),
  blender: require("../../assets/demo/item-blender.png"),
  airfryer: require("../../assets/demo/item-airfryer.png"),
  kettle: require("../../assets/demo/item-kettle.png"),
  cooker: require("../../assets/demo/item-cooker.png"),
  dispenser: require("../../assets/demo/item-dispenser.png"),
  fan: require("../../assets/demo/item-fan.png"),
  generator: require("../../assets/demo/item-generator.png"),
  heater: require("../../assets/demo/item-heater.png"),
  hob: require("../../assets/demo/item-hob.png"),
};

const p = (id: string, name: string, price: number, image: Img, compareAt?: number): StoreProduct => ({ id, name, price, image, compareAt });
// Products whose price can be negotiated, with how long an agreed price is held
const NEGOTIABLE: Record<string, 6 | 12 | 24> = { x1: 12, x4: 6, x6: 12, x8: 24, b1: 24, b2: 12, k1: 24, ad1: 12, ad3: 12, hv1: 24, hv2: 24, ok1: 24, ok3: 24, fm1: 6, fz2: 12, kk1: 12 };

export const stores: MarketStore[] = [
  {
    slug: "sotechy",
    name: "Sotechy",
    ticker: "SOTECHY",
    tagline: "Phones, power and home, from Benin City",
    about: "Sotechy's own store. Genuine products with warranty, pickup at Etete Road and delivery across Edo, Delta, Lagos and Abuja.",
    city: "Benin City",
    rating: 4.8,
    reviews: 1240,
    followers: 12_400,
    kind: "Everything",
    logo: require("../../assets/brand/sotechy-icon-512.png"),
    cover: require("../../assets/demo/store-front.jpg"),
    theme: THEMES.sotechy,
    delivery: { states: ["Edo", "Delta", "Lagos", "FCT Abuja"], homeFrom: 2_000, pickup: "No. 20 Etete Road, Benin City" },
    sinceMonths: 24,
    isSotechy: true,
    products: [],
  },
  {
    slug: "xena",
    name: "Xena Gadgets",
    ticker: "XENA",
    tagline: "Phones and gadgets at fair prices",
    about: "Smartphones, chargers, power banks and audio. Every phone is tested before it leaves the shop.",
    city: "Benin City",
    rating: 4.7,
    reviews: 312,
    followers: 1_284,
    kind: "Phones & gadgets",
    logo: img.phone,
    cover: require("../../assets/demo/store-inside.jpg"),
    theme: THEMES.midnight,
    delivery: { states: ["Edo", "Delta"], homeFrom: 2_000, pickup: "14 Akpakpava Road, Benin City" },
    announcement: "Free delivery in Benin City on orders over ₦100,000",
    promo: { overline: "Xena Gadgets · weekend sale", title: "10% off\nevery phone", subtitle: "And earn $XENA on the full price", productId: "x1" },
    sinceMonths: 2,
    products: [
      p("x1", "Spark 20 Smartphone 128GB", 250_000, img.phone, 275_000),
      p("x2", "Fast Charger 25W", 12_000, img.charger),
      p("x3", "Power Bank 20,000mAh", 28_000, img.powerbank),
      p("x4", "Bluetooth Speaker", 35_000, img.speaker),
      p("x5", "Sound Bar", 120_000, img.soundbar),
      p("x6", 'Laptop 14" 8GB / 256GB', 620_000, img.laptop),
      p("x7", "Wireless Mouse", 9_500, img.mouse),
      p("x8", '43" Smart TV', 390_000, img.tv, 420_000),
    ],
  },
  {
    slug: "brighthome",
    name: "BrightHome Appliances",
    ticker: "BRIGHT",
    tagline: "Kitchen and home appliances, delivered",
    about: "Fridges, air conditioners and kitchen appliances with installation in Enugu, Anambra and Imo.",
    city: "Enugu",
    rating: 4.5,
    reviews: 486,
    followers: 3_910,
    kind: "Home appliances",
    logo: img.fridge,
    cover: require("../../assets/demo/banner-appliances.jpg"),
    theme: THEMES.ocean,
    delivery: { states: ["Enugu", "Anambra", "Imo"], homeFrom: 3_500 },
    announcement: "Free installation on every air conditioner this month",
    promo: { overline: "BrightHome · this month", title: "Free AC\ninstallation", subtitle: "Enugu, Anambra and Imo", productId: "b2" },
    sinceMonths: 3,
    products: [
      p("b1", "Double Door Fridge 200L", 385_000, img.fridge, 410_000),
      p("b2", "Split Air Conditioner 1.5HP", 410_000, img.ac),
      p("b3", "Microwave 20L", 78_000, img.microwave),
      p("b4", "Blender 1.5L", 32_000, img.blender),
      p("b5", "Digital Air Fryer 4.5L", 95_000, img.airfryer, 110_000),
      p("b6", "Electric Kettle 1.7L", 21_000, img.kettle),
      p("b7", "Gas Cooker 4 Burners", 260_000, img.cooker),
      p("b8", "Water Dispenser", 140_000, img.dispenser),
    ],
  },
  {
    slug: "kola",
    name: "Kola Solar & Power",
    ticker: "KOLA",
    tagline: "Generators, inverters and steady light",
    about: "Generators and power for homes and shops in Ibadan and Abeokuta. Free first service on every generator.",
    city: "Ibadan",
    rating: 4.6,
    reviews: 128,
    followers: 840,
    kind: "Power & solar",
    logo: img.generator,
    cover: require("../../assets/demo/cat-power.jpg"),
    theme: THEMES.forest,
    delivery: { states: ["Oyo", "Ogun"], homeFrom: 3_000, pickup: "52 Ring Road, Ibadan" },
    promo: { overline: "Kola Solar & Power", title: "Steady light,\nless fuel", subtitle: "3.5kVA generators from ₦485,000", productId: "k1" },
    sinceMonths: 1,
    products: [
      p("k1", "Petrol Generator 3.5kVA", 485_000, img.generator, 520_000),
      p("k2", "Rechargeable Standing Fan", 68_000, img.fan),
      p("k3", "Power Bank 20,000mAh", 27_000, img.powerbank),
      p("k4", "Electric Heater", 45_000, img.heater),
      p("k5", "Induction Hob", 72_000, img.hob),
    ],
  },
];

// More sample stores outside electronics. Their products use drawn icons until stores upload photos.
const t = (accent: string, hero: string, onAccent = "#FFFFFF"): StoreTheme => ({ accent, onAccent, bg: "#FAF7F3", surface: "#FFFFFF", text: "#17120E", muted: "#7F756C", hero, onHero: "#FFFFFF" });
const q = (id: string, name: string, price: number, icon: string, compareAt?: number, about?: string): StoreProduct => ({ id, name, price, icon, compareAt, about });

const moreStores: MarketStore[] = [
  {
    slug: "adaeze", name: "Adaeze Fashion House", ticker: "ADAEZE", tagline: "Ankara, ready-to-wear and tailoring", city: "Lagos", rating: 4.8, reviews: 642, followers: 5_210, kind: "Fashion",
    about: "Ankara dresses, shirts and two-pieces, made in our Yaba workshop. Custom sizes in 5 days.", theme: t("#B4235A", "#3B0A1F"),
    delivery: { states: ["Lagos", "Ogun", "FCT Abuja"], homeFrom: 2_500, pickup: "12 Herbert Macaulay Way, Yaba" }, sinceMonths: 6,
    highlights: ["Made to your size in 5 days", "Free alterations within 14 days", "Fabric chosen by hand"],
    announcement: "New Ankara collection: 15% off this week",
    promo: { overline: "Adaeze Fashion House", title: "New Ankara\ncollection", subtitle: "15% off this week, made in Lagos", productId: "ad1" },
    products: [q("ad1", "Ankara Wrap Dress", 28_000, "shirt", 33_000, "A flowing wrap dress in bold Ankara print, lined and fully adjustable."), q("ad2", "Men's Ankara Shirt", 18_500, "shirt-outline"), q("ad3", "Ankara Two-Piece Set", 34_000, "shirt"), q("ad4", "Aso-Oke Gele", 12_000, "ribbon"), q("ad5", "Beaded Handbag", 15_500, "bag-handle"), q("ad6", "Leather Sandals", 21_000, "footsteps")],
  },
  {
    slug: "glow", name: "Glow by Tee", ticker: "GLOW", tagline: "Makeup and skincare for every skin tone", city: "Lagos", rating: 4.9, reviews: 1_120, followers: 9_840, kind: "Beauty & hair",
    about: "Foundations, lip colours and skincare picked for deep and medium skin tones. Every product is original.", theme: t("#C2185B", "#4A0D26"),
    delivery: { states: ["Lagos", "Ogun", "Oyo"], homeFrom: 2_000 }, sinceMonths: 4,
    highlights: ["Original products only", "Shades for deep and medium skin", "Free samples on orders over ₦30,000"],
    products: [q("gl1", "Matte Foundation 30ml", 14_500, "color-palette", undefined, "Long-wear matte foundation in 24 shades, made for warm and deep skin."), q("gl2", "Lipstick Trio", 9_800, "brush"), q("gl3", "Eyeshadow Palette", 16_000, "color-palette", 19_000), q("gl4", "Vitamin C Serum", 12_500, "water"), q("gl5", "Makeup Brush Set", 11_000, "brush"), q("gl6", "Setting Powder", 8_500, "sparkles")],
  },
  {
    slug: "hairven", name: "Hairven Wigs", ticker: "HAIRVEN", tagline: "Human hair wigs, bundles and frontals", city: "Port Harcourt", rating: 4.7, reviews: 388, followers: 3_400, kind: "Beauty & hair",
    about: "Bone straight, body wave and curly human hair. Every wig is installed on a cap and ready to wear.", theme: t("#6D3B8F", "#26113A"),
    delivery: { states: ["Rivers", "Bayelsa", "Lagos"], homeFrom: 3_000 }, sinceMonths: 3,
    highlights: ["100% human hair", "Ready to wear, cap included", "Free styling on wigs over ₦150,000"],
    products: [q("hv1", "Bone Straight Wig 20\"", 185_000, "woman", 210_000), q("hv2", "Body Wave Frontal Wig", 160_000, "woman"), q("hv3", "Curly Bob Wig", 95_000, "woman"), q("hv4", "Hair Bundles (3)", 120_000, "cut"), q("hv5", "Edge Control Gel", 4_500, "water")],
  },
  {
    slug: "freshmart", name: "FreshMart Groceries", ticker: "FRESH", tagline: "Groceries delivered the same day", city: "Abuja", rating: 4.6, reviews: 2_310, followers: 11_200, kind: "Food & groceries",
    about: "Rice, oil, provisions and fresh food from the market, delivered across Abuja the same day.", theme: t("#2E7D32", "#123B16"),
    delivery: { states: ["FCT Abuja", "Nasarawa"], homeFrom: 1_500 }, sinceMonths: 8,
    highlights: ["Same-day delivery in Abuja", "Fresh food checked before packing", "Bulk prices for big orders"],
    announcement: "Free delivery on orders over ₦50,000 in Abuja",
    products: [q("fm1", "Rice 50kg Bag", 78_000, "cart", 82_000), q("fm2", "Vegetable Oil 5L", 14_500, "water"), q("fm3", "Fresh Tomatoes Basket", 18_000, "nutrition"), q("fm4", "Eggs (Crate of 30)", 6_800, "egg"), q("fm5", "Frozen Chicken 2kg", 11_500, "restaurant"), q("fm6", "Bottled Water (12)", 3_600, "water")],
  },
  {
    slug: "oakrattan", name: "Oak & Rattan", ticker: "OAK", tagline: "Furniture made in Nigeria", city: "Ibadan", rating: 4.7, reviews: 214, followers: 1_980, kind: "Home & living",
    about: "Sofas, beds and dining sets from our Ibadan workshop, delivered and set up for you.", theme: t("#8D5A2B", "#3A2412"),
    delivery: { states: ["Oyo", "Lagos", "Ogun", "Osun"], homeFrom: 8_000 }, sinceMonths: 5,
    highlights: ["Made in our Ibadan workshop", "Delivered and set up", "2-year frame warranty"],
    promo: { overline: "Oak & Rattan", title: "Furniture made\nin Nigeria", subtitle: "Delivered and set up for you", productId: "ok1" },
    products: [q("ok1", "3-Seater Fabric Sofa", 420_000, "bed", 465_000), q("ok2", "Rattan Accent Chair", 95_000, "home"), q("ok3", "6-Seater Dining Set", 380_000, "restaurant"), q("ok4", "Queen Bed Frame", 260_000, "bed"), q("ok5", "Bookshelf", 68_000, "library")],
  },
  {
    slug: "bookworm", name: "Bookworm Hub", ticker: "BOOKS", tagline: "Books for school, work and fun", city: "Enugu", rating: 4.8, reviews: 530, followers: 2_760, kind: "Books & kids",
    about: "Nigerian and international titles, school texts and children's books. We ship nationwide.", theme: t("#1F5F8B", "#0E2C42"),
    delivery: { states: ["Enugu", "Anambra", "Lagos", "FCT Abuja"], homeFrom: 1_800 }, sinceMonths: 9,
    highlights: ["New and classic Nigerian titles", "School book lists filled", "Gift wrapping on request"],
    products: [q("bk1", "Things Fall Apart", 6_500, "book"), q("bk2", "Half of a Yellow Sun", 9_000, "book"), q("bk3", "JSS1 Textbook Pack", 42_000, "library", 48_000), q("bk4", "Children's Story Bundle", 15_000, "happy"), q("bk5", "Notebooks (10)", 5_500, "pencil")],
  },
  {
    slug: "littlesteps", name: "Little Steps", ticker: "STEPS", tagline: "Everything for babies and toddlers", city: "Benin City", rating: 4.7, reviews: 290, followers: 2_150, kind: "Books & kids",
    about: "Clothes, feeding, diapers and toys for babies and toddlers, picked by mums.", theme: t("#E07A5F", "#4A2218"),
    delivery: { states: ["Edo", "Delta"], homeFrom: 1_500, pickup: "8 Ugbowo Road, Benin City" }, sinceMonths: 2,
    highlights: ["Picked by mums", "Soft, safe materials", "Free gift wrap for baby showers"],
    products: [q("ls1", "Baby Diapers (Jumbo)", 16_500, "happy"), q("ls2", "Baby Romper Set (3)", 12_000, "shirt"), q("ls3", "Feeding Bottle Set", 9_500, "water"), q("ls4", "Baby Walker", 38_000, "walk", 42_000), q("ls5", "Soft Toy Bundle", 8_000, "balloon")],
  },
  {
    slug: "fitzone", name: "FitZone Sports", ticker: "FITZ", tagline: "Gym, football and fitness gear", city: "Lagos", rating: 4.6, reviews: 410, followers: 3_050, kind: "Sports",
    about: "Jerseys, boots, dumbbells and home gym equipment. Original brands and local sizes.", theme: t("#D84315", "#3A1408"),
    delivery: { states: ["Lagos", "Ogun", "Oyo", "Rivers"], homeFrom: 2_500 }, sinceMonths: 7,
    highlights: ["Original jerseys and boots", "Home gym set-up advice", "Exchange sizes within 7 days"],
    products: [q("fz1", "Super Eagles Jersey", 25_000, "shirt"), q("fz2", "Football Boots", 45_000, "football", 52_000), q("fz3", "Dumbbell Set 20kg", 38_000, "barbell"), q("fz4", "Yoga Mat", 9_000, "body"), q("fz5", "Size 5 Football", 12_500, "football")],
  },
  {
    slug: "spiceroute", name: "Spice Route Foods", ticker: "SPICE", tagline: "Spices, palm oil and soup mixes", city: "Onitsha", rating: 4.8, reviews: 760, followers: 4_420, kind: "Food & groceries",
    about: "Ground pepper, crayfish, ogbono, egusi and red oil from Onitsha main market, cleaned and sealed.", theme: t("#C62828", "#3B0B0B"),
    delivery: { states: ["Anambra", "Enugu", "Lagos", "FCT Abuja"], homeFrom: 2_000 }, sinceMonths: 10,
    highlights: ["Cleaned and sealed", "Straight from Onitsha market", "Ships nationwide in 2–3 days"],
    products: [q("sp1", "Ground Crayfish 1kg", 12_000, "fish"), q("sp2", "Egusi 2kg", 9_500, "nutrition"), q("sp3", "Red Palm Oil 4L", 11_000, "water", 12_500), q("sp4", "Ogbono 1kg", 8_000, "nutrition"), q("sp5", "Pepper Soup Spice", 3_500, "flame")],
  },
  {
    slug: "kicks", name: "Kicks & Soles", ticker: "KICKS", tagline: "Sneakers, loafers and slides", city: "Abuja", rating: 4.5, reviews: 330, followers: 2_640, kind: "Fashion",
    about: "Sneakers and shoes for men and women. Every pair is checked before it's sent.", theme: t("#37474F", "#121A1E"),
    delivery: { states: ["FCT Abuja", "Kaduna", "Kano", "Lagos"], homeFrom: 2_500 }, sinceMonths: 4,
    highlights: ["Every pair checked", "Swap sizes within 7 days", "Free shoe bag"],
    products: [q("kk1", "White Sneakers", 32_000, "footsteps", 38_000), q("kk2", "Leather Loafers", 40_000, "footsteps"), q("kk3", "Slides", 9_500, "footsteps"), q("kk4", "Running Shoes", 36_000, "walk"), q("kk5", "Shoe Care Kit", 6_500, "brush")],
  },
];
stores.push(...moreStores);

for (const store of stores) for (const item of store.products) if (NEGOTIABLE[item.id]) item.negotiable = { hours: NEGOTIABLE[item.id] };

export const storeBySlug = (slug: string) => stores.find((s) => s.slug === slug);

/** Products from every marketplace store, taking turns so no one store fills the row */
export function marketProducts(onlyDeals = false): { store: MarketStore; product: StoreProduct }[] {
  const lists = stores
    .filter((st) => !st.isSotechy)
    .map((st) => st.products.filter((pr) => !onlyDeals || (pr.compareAt ?? 0) > pr.price).map((product) => ({ store: st, product })));
  const out: { store: MarketStore; product: StoreProduct }[] = [];
  for (let i = 0; lists.some((l) => i < l.length); i++) for (const l of lists) if (l[i]) out.push(l[i]);
  return out;
}
export const findProduct = (storeSlug: string, productId: string) => storeBySlug(storeSlug)?.products.find((x) => x.id === productId);

/** "11h 40m left" */
export const timeLeft = (iso: string) => {
  const mins = Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60_000));
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m left` : `${mins}m left`;
};
export const storeByTicker = (ticker: string) => stores.find((s) => s.ticker === ticker);

export const STORE_KINDS = ["Phones & gadgets", "Home appliances", "Power & solar", "Fashion", "Beauty & hair", "Food & groceries", "Home & living", "Books & kids", "Sports"] as const;

/** The signed-in customer's Sotechy wallet (sample) */
export const wallet = {
  username: "chidi",
  address: "0x8f3a5be0c1d24e7a9b1f0c6d2e44a9f3c0d21c7",
  balances: [
    { ticker: "SOTECHY", amount: 125_400, pending: 25_000 },
    { ticker: "XENA", amount: 95_000, pending: 274_000 },
    { ticker: "BRIGHT", amount: 41_500, pending: 0 },
  ],
};

export type WalletEventKind = "earned" | "pending" | "spent" | "sent" | "received" | "bonus";

export interface WalletEvent {
  id: string;
  kind: WalletEventKind;
  ticker: string;
  amount: number;
  title: string;
  minsAgo: number;
}

export const walletActivity: WalletEvent[] = [
  { id: "a1", kind: "pending", ticker: "XENA", amount: 274_000, title: "Order SOT-1042 · released when delivered", minsAgo: 38 },
  { id: "a2", kind: "earned", ticker: "XENA", amount: 95_000, title: "Order SOT-1027 delivered", minsAgo: 60 * 26 },
  { id: "a3", kind: "bonus", ticker: "XENA", amount: 9_500, title: "Review with a photo (+10%)", minsAgo: 60 * 25 },
  { id: "a4", kind: "earned", ticker: "SOTECHY", amount: 9_500, title: "10% $SOTECHY bonus from Xena Gadgets", minsAgo: 60 * 26 },
  { id: "a5", kind: "received", ticker: "SOTECHY", amount: 20_000, title: "From @amaka.n", minsAgo: 60 * 48 },
  { id: "a6", kind: "spent", ticker: "SOTECHY", amount: 40_000, title: "Paid towards order SOT-1007", minsAgo: 60 * 72 },
  { id: "a7", kind: "sent", ticker: "BRIGHT", amount: 5_000, title: "To @tunde", minsAgo: 60 * 96 },
];

export const tokenNaira = (tokens: number) => tokens * TOKEN_VALUE;
export const shortAddress = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
export const formatTokens = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2)}M` : n.toLocaleString("en-NG"));
export const ago = (mins: number) => (mins < 60 ? `${mins} min ago` : mins < 60 * 24 ? `${Math.round(mins / 60)}h ago` : `${Math.round(mins / 60 / 24)}d ago`);

/** Mixes a colour with white (amount 0–1 of the colour), for soft backgrounds */
export function tint(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(255 - (255 - c) * amount);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(mix);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** The soft tile colour behind a store's product photos */
export const tileColor = (theme: StoreTheme, onDarkPage = false) => (theme.dark && onDarkPage ? "#2A3142" : tint(theme.accent, 0.16));

