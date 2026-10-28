import type { CartLine, CartSeller, ProductDetail } from "@sotechy/shared";
import { useCart } from "@/lib/cart";

/** The store a product ships from, for the cart; null for Sotechy's own stock */
export const sellerOf = (store: ProductDetail["store"]): CartSeller | null =>
  store?.branchId ? { slug: store.slug, name: store.name, branchId: store.branchId } : null;

/** Adds to the cart. Items from different stores sit side by side and check out separately. */
export function useAddToCart() {
  const cart = useCart();
  return async (line: Omit<CartLine, "quantity">, quantity = 1) => cart.add(line, quantity);
}
