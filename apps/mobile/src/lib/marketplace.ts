// Marketplace stores for the customer app: Sotechy's own store and the stores Sotechy has approved,
// loaded from the API and drawn in each store's own theme (set in the merchant dashboard).
import { useCallback, useEffect, useState } from "react";
import type { CatalogProduct, MarketStore as ApiStore, MarketStoreDetail, StoreDeliveryArea } from "@sotechy/shared";
import { api } from "./api";

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
  midnight: { accent: "#FDB913", onAccent: "#17120E", bg: "#0F1420", surface: "#171E2E", text: "#F3F4F6", muted: "#9AA3B2", hero: "#1E2740", onHero: "#FFFFFF", dark: true },
  forest: { accent: "#1F7A4D", onAccent: "#FFFFFF", bg: "#F3F7F2", surface: "#FFFFFF", text: "#13241A", muted: "#5E7365", hero: "#1F3D2B", onHero: "#FFFFFF" },
  ocean: { accent: "#1D6FD6", onAccent: "#FFFFFF", bg: "#F2F6FB", surface: "#FFFFFF", text: "#0F1B2D", muted: "#5B6B80", hero: "#0E3A6E", onHero: "#FFFFFF" },
  blush: { accent: "#D94F7A", onAccent: "#FFFFFF", bg: "#FDF5F6", surface: "#FFFFFF", text: "#2A1418", muted: "#86656C", hero: "#F9D9E0", onHero: "#2A1418" },
  mono: { accent: "#111111", onAccent: "#FFFFFF", bg: "#F6F6F6", surface: "#FFFFFF", text: "#111111", muted: "#6B6B6B", hero: "#111111", onHero: "#FFFFFF" },
};

export interface StoreProduct {
  id: string;
  name: string;
  price: number;
  compareAt?: number;
  /** A photo; products without one show `icon` (an Ionicons name) on the store's colour */
  image?: Img;
  icon?: string;
  /** Opens the product page */
  slug: string;
  /** The store takes price offers on it */
  negotiable?: boolean;
}

export interface MarketStore {
  slug: string;
  name: string;
  ticker: string;
  tagline: string;
  about: string;
  /** Average review score; null until it has reviews */
  rating: number | null;
  /** How many reviews it's from */
  ratingCount: number;
  /** What the store sells (from its setup) */
  sells: string[];
  logo?: Img;
  cover?: Img;
  theme: StoreTheme;
  delivery: { states: string[]; homeFrom: number | null; pickup?: string };
  /** Its delivery areas with fees (on its own page; empty in lists) */
  areas: StoreDeliveryArea[];
  announcement?: string;
  /** Sotechy's own store: its products are the main catalogue */
  isSotechy?: boolean;
  /** Paid to be featured until this date: shown first on Home, in Shop and in Stores */
  featuredUntil?: string;
  productCount: number;
  /** The branch the store's orders ship from */
  branchId?: string | null;
  /** Filled on the store's own page; empty in lists */
  products: StoreProduct[];
}

/** Sotechy's own store, which sells from the main catalogue */
export const SOTECHY_STORE: MarketStore = {
  slug: "sotechy",
  name: "Sotechy",
  ticker: "SOTECHY",
  tagline: "Phones, power and home, from Benin City",
  about: "Sotechy's own store. Genuine products with warranty, pickup at Etete Road and delivery across Edo, Delta, Lagos and Abuja.",
  rating: null,
  ratingCount: 0,
  sells: [],
  logo: require("../../assets/brand/sotechy-icon-512.png"),
  theme: THEMES.sotechy,
  delivery: { states: ["Edo", "Delta", "Lagos", "FCT Abuja"], homeFrom: null, pickup: "No. 20 Etete Road, Benin City" },
  isSotechy: true,
  areas: [],
  productCount: 0,
  products: [],
};

/** Readable text colour on an accent */
function onColour(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? "#17120E" : "#FFFFFF";
}

export const toStoreProduct = (p: CatalogProduct): StoreProduct => ({
  id: p.id,
  name: p.name,
  price: p.minPrice,
  compareAt: p.compareAtPrice ?? undefined,
  image: p.imageUrl ? { uri: p.imageUrl } : undefined,
  slug: p.slug,
  negotiable: p.negotiable || undefined,
});

/** An API store in the app's shape */
export function toMarketStore(s: ApiStore & Partial<Pick<MarketStoreDetail, "branchId" | "products" | "pickupPoints" | "deliveryAreas">>): MarketStore {
  const look = s.storefront;
  const base = THEMES[look?.themeId ?? ""] ?? THEMES.sotechy;
  const withAccent = look?.accent ? { ...base, accent: look.accent, onAccent: onColour(look.accent) } : base;
  const theme = look?.hero ? { ...withAccent, hero: look.hero, onHero: onColour(look.hero) } : withAccent;
  return {
    slug: s.slug,
    name: s.name,
    ticker: s.ticker,
    tagline: s.tagline ?? s.sells.slice(0, 2).join(" · "),
    about: s.tagline ?? `${s.name} sells ${s.sells.slice(0, 3).join(", ").toLowerCase() || "on Sotechy"}.`,
    rating: s.ratingAverage ?? null,
    ratingCount: s.ratingCount ?? 0,
    sells: s.sells,
    logo: s.logoUrl ? { uri: s.logoUrl } : undefined,
    cover: s.coverUrl ? { uri: s.coverUrl } : undefined,
    theme,
    delivery: { states: s.deliveryStates ?? [], homeFrom: s.deliveryFrom ?? null, pickup: s.pickupPoints?.length ? s.pickupPoints.join(" · ") : undefined },
    areas: s.deliveryAreas ?? [],
    announcement: look?.announcement ?? undefined,
    featuredUntil: s.featuredUntil ?? undefined,
    productCount: s.productCount ?? s.products?.length ?? 0,
    branchId: s.branchId,
    products: (s.products ?? []).map(toStoreProduct),
  };
}

// Stores seen so far, so screens that only have a slug or ticker (offers, wallet) can show them
const known = new Map<string, MarketStore>([[SOTECHY_STORE.slug, SOTECHY_STORE]]);
const remember = (list: MarketStore[]) => list.forEach((s) => known.set(s.slug, { ...known.get(s.slug), ...s }));

let listCache: { at: number; promise: Promise<MarketStore[]> } | null = null;
/** Approved stores (Sotechy's own not included), shared by every screen for a minute */
export function loadStores(fresh = false): Promise<MarketStore[]> {
  if (!fresh && listCache && Date.now() - listCache.at < 60_000) return listCache.promise;
  const promise = api.stores().then((rows) => {
    const list = rows.map(toMarketStore);
    remember(list);
    return list;
  });
  listCache = { at: Date.now(), promise };
  promise.catch(() => (listCache = null));
  return promise;
}

/** The marketplace's stores, with loading state */
export function useStores() {
  const [stores, setStores] = useState<MarketStore[] | undefined>();
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback((fresh = true) => {
    setError(null);
    loadStores(fresh).then(setStores, (e: unknown) => setError(e instanceof Error ? e.message : "Could not load stores"));
  }, []);
  useEffect(() => reload(false), [reload]);
  return { stores, error, loading: !stores && !error, reload };
}

/** One store with its products; null when there's no such store */
export async function loadStore(slug: string): Promise<MarketStore | null> {
  if (slug === SOTECHY_STORE.slug) {
    const items = await api.products({ store: "sotechy", sort: "newest" });
    return { ...SOTECHY_STORE, productCount: items.length, products: items.map(toStoreProduct) };
  }
  try {
    const store = toMarketStore(await api.store(slug));
    remember([store]);
    return store;
  } catch (e) {
    if (e instanceof Error && /not found/i.test(e.message)) return null;
    throw e;
  }
}

export const storeBySlug = (slug: string) => known.get(slug);
export const storeByTicker = (ticker: string) => [...known.values()].find((s) => s.ticker === ticker);
export const findProduct = (storeSlug: string, productId: string) => storeBySlug(storeSlug)?.products.find((x) => x.id === productId);

/** Whether a store's paid feature is running */
export const isFeatured = (s: MarketStore) => !!s.featuredUntil && new Date(s.featuredUntil).getTime() > Date.now();
/** Featured stores first, keeping the order otherwise */
export const byFeatured = <T extends MarketStore>(list: T[]) => [...list.filter(isFeatured), ...list.filter((s) => !isFeatured(s))];

/** "11h 40m left" */
export const timeLeft = (iso: string) => {
  const mins = Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60_000));
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m left` : `${mins}m left`;
};

/** The signed-in customer's token wallet: empty until the Monad contracts are live */
export const wallet: { address: string | null; balances: { ticker: string; amount: number; pending: number }[] } = {
  address: null,
  balances: [],
};

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

