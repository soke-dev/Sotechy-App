import type { CartLine, CartSeller, OrderItem, ProductDetail } from "@sotechy/shared";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart";

/** The store a product ships from, for the cart; null for Sotechy's own stock */
export const sellerOf = (store: ProductDetail["store"]): CartSeller | null =>
  store?.branchId ? { slug: store.slug, name: store.name, branchId: store.branchId } : null;

/** Adds to the cart. Items from different stores sit side by side and check out separately. */
export function useAddToCart() {
  const cart = useCart();
  return async (line: Omit<CartLine, "quantity">, quantity = 1) => cart.add(line, quantity);
}

/**
 * "Buy again": puts an earlier order's items back in the cart, as they are on sale today.
 * Items whose product was deleted or hidden, whose option was switched off, or that are sold out are left out;
 * the rest get today's price and store, and no more than what's in stock.
 */
export function useBuyAgain() {
  const cart = useCart();
  return async (items: OrderItem[]) => {
    const details = new Map<string, ProductDetail | null>();
    await Promise.all(
      [...new Set(items.map((i) => i.productId).filter((id): id is string => !!id))].map(async (id) => {
        details.set(id, await api.product(id).catch(() => null));
      }),
    );
    let added = 0;
    let missing = 0;
    for (const i of items) {
      const detail = i.productId ? details.get(i.productId) : null;
      const variant = detail?.variants.find((v) => v.id === i.variantId && v.isActive);
      const inStock = detail?.stock.filter((s) => s.variantId === i.variantId).reduce((n, s) => n + Math.max(0, s.quantity - s.reserved), 0) ?? 0;
      if (!detail || !variant || inStock <= 0) {
        missing += 1;
        continue;
      }
      cart.add(
        {
          variantId: variant.id,
          productId: detail.id,
          productName: detail.name,
          variantName: variant.name,
          unitPrice: variant.price,
          imageUrl: i.imageUrl ?? null,
          store: sellerOf(detail.store),
        },
        Math.min(i.quantity, inStock),
      );
      added += 1;
    }
    return { added, missing };
  };
}

/** What to tell the customer after "Buy again" */
export function buyAgainMessage({ added, missing }: { added: number; missing: number }) {
  if (!added) return missing === 1 ? "This item is no longer available" : "These items are no longer available";
  if (!missing) return "Added to cart again";
  return `Added to cart. ${missing} item${missing === 1 ? " is" : "s are"} no longer available`;
}
