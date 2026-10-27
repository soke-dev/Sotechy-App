import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { estimateSubtotal, type CartLine, type CartSeller } from "@sotechy/shared";

const CART_KEY = "sotechy_cart";

interface CartState {
  lines: CartLine[];
  count: number;
  subtotal: number; // display estimate — the API calculates the real total
  /** Who the cart is buying from: a marketplace store, or null for Sotechy (one seller per order) */
  seller: CartSeller | null;
  /** False (and nothing added) when the item is from a different seller than what's in the cart */
  add: (line: Omit<CartLine, "quantity">, quantity?: number) => boolean;
  /** Empties the cart and starts it with this item */
  startWith: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
}

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

  const value: CartState = {
    lines,
    count: lines.reduce((n, l) => n + l.quantity, 0),
    subtotal: estimateSubtotal(lines),
    seller: lines[0]?.store ?? null,
    add: (line, quantity = 1) => {
      if (lines.length && (lines[0].store?.slug ?? null) !== (line.store?.slug ?? null)) return false;
      setLines((prev) => {
        const existing = prev.find((l) => l.variantId === line.variantId);
        if (existing) return prev.map((l) => (l === existing ? { ...l, quantity: l.quantity + quantity } : l));
        return [...prev, { ...line, quantity }];
      });
      return true;
    },
    startWith: (line, quantity = 1) => setLines([{ ...line, quantity }]),
    setQuantity: (variantId, quantity) =>
      setLines((prev) => (quantity <= 0 ? prev.filter((l) => l.variantId !== variantId) : prev.map((l) => (l.variantId === variantId ? { ...l, quantity } : l)))),
    remove: (variantId) => setLines((prev) => prev.filter((l) => l.variantId !== variantId)),
    clear: () => setLines([]),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
