import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { estimateSubtotal, type CartLine } from "@sotechy/shared";

const CART_KEY = "sotechy_cart";

interface CartState {
  lines: CartLine[];
  count: number;
  subtotal: number; // display estimate — the API calculates the real total
  add: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
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
    add: (line, quantity = 1) =>
      setLines((prev) => {
        const existing = prev.find((l) => l.variantId === line.variantId);
        if (existing) return prev.map((l) => (l === existing ? { ...l, quantity: l.quantity + quantity } : l));
        return [...prev, { ...line, quantity }];
      }),
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
