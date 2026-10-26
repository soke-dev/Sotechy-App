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
  image: Img;
  /** Products from Sotechy's own catalogue open the real product page */
  slug?: string;
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
  kind: "Phones & gadgets" | "Home appliances" | "Power & solar" | "Everything";
  logo: Img;
  cover: Img;
  theme: StoreTheme;
  delivery: { states: string[]; homeFrom: number; pickup?: string };
  announcement?: string;
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

export const storeBySlug = (slug: string) => stores.find((s) => s.slug === slug);
export const storeByTicker = (ticker: string) => stores.find((s) => s.ticker === ticker);

export const STORE_KINDS = ["Phones & gadgets", "Home appliances", "Power & solar"] as const;

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
