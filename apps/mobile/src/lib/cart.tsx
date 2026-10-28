import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { estimateSubtotal, type CartLine, type CartSeller } from "@sotechy/shared";

const CART_KEY = "sotechy_cart";

/** One store's items in the cart: each store is its own order and checkout */
export interface CartGroup {
  /** The store's slug, or "sotechy" for Sotechy's own stock */
  key: string;
  seller: CartSeller | null;
  lines: CartLine[];
  count: number;
  subtotal: number;
}

interface CartState {
  lines: CartLine[];
  count: number;
  subtotal: number; // display estimate — the API calculates the real total
  /** The cart by store, in the order they were added */
  groups: CartGroup[];
  /** One store's items (the first store's when the key isn't in the cart) */
  groupFor: (key?: string | null) => CartGroup;
  add: (line: Omit<CartLine, "quantity">, quantity?: number) => boolean;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  /** Removes one store's items, after its order is placed */
  clearStore: (key: string) => void;
  clear: () => void;
}

const SOTECHY_KEY = "sotechy";
const keyOf = (l: Pick<CartLine, "store">) => l.store?.slug ?? SOTECHY_KEY;

const CartContext = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CART_KEY)
      .then((raw) => raw && setLines(JSON.parse(raw)))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(CART_KEY, JSON.stringify(lines));
  }, [lines, loaded]);

  const groups: CartGroup[] = [...new Set(lines.map(keyOf))].map((key) => {
    const mine = lines.filter((l) => keyOf(l) === key);
    return { key, seller: mine[0]?.store ?? null, lines: mine, count: mine.reduce((n, l) => n + l.quantity, 0), subtotal: estimateSubtotal(mine) };
  });
  const empty: CartGroup = { key: SOTECHY_KEY, seller: null, lines: [], count: 0, subtotal: 0 };

  const value: CartState = {
    lines,
    count: lines.reduce((n, l) => n + l.quantity, 0),
    subtotal: estimateSubtotal(lines),
    groups,
    groupFor: (key) => groups.find((g) => g.key === key) ?? groups[0] ?? empty,
    add: (line, quantity = 1) => {
      setLines((prev) => {
        const existing = prev.find((l) => l.variantId === line.variantId);
        // An agreed price is for one item and replaces the item at the shop price
        if (line.offerId) return [...prev.filter((l) => l !== existing), { ...line, quantity: 1 }];
        if (existing?.offerId) return prev;
        if (existing) return prev.map((l) => (l === existing ? { ...l, quantity: l.quantity + quantity } : l));
        return [...prev, { ...line, quantity }];
      });
      return true;
    },
    setQuantity: (variantId, quantity) =>
      setLines((prev) =>
        quantity <= 0 ? prev.filter((l) => l.variantId !== variantId) : prev.map((l) => (l.variantId === variantId ? { ...l, quantity: l.offerId ? 1 : quantity } : l)),
      ),
    remove: (variantId) => setLines((prev) => prev.filter((l) => l.variantId !== variantId)),
    clearStore: (key) => setLines((prev) => prev.filter((l) => keyOf(l) !== key)),
    clear: () => setLines([]),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
