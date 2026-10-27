import type { CartLine, CartSeller, ProductDetail } from "@sotechy/shared";
import { useCart } from "@/lib/cart";
import { useDialog } from "./dialog";

/** The store a product ships from, for the cart; null for Sotechy's own stock */
export const sellerOf = (store: ProductDetail["store"]): CartSeller | null =>
  store?.branchId ? { slug: store.slug, name: store.name, branchId: store.branchId } : null;

/** Adds to the cart. Each order comes from one seller, so when the cart holds another seller's items
 *  it asks before starting a new cart. Resolves false when the customer keeps their cart. */
export function useAddToCart() {
  const cart = useCart();
  const dialog = useDialog();
  return async (line: Omit<CartLine, "quantity">, quantity = 1) => {
    if (cart.add(line, quantity)) return true;
    const ok = await dialog.confirm({
      title: "Start a new cart?",
      message: `Your cart has items from ${cart.seller?.name ?? "Sotechy"}. Each order comes from one store, so adding this clears them.`,
      confirmLabel: "Start new cart",
      cancelLabel: "Keep my cart",
    });
    if (!ok) return false;
    cart.startWith(line, quantity);
    return true;
  };
}
