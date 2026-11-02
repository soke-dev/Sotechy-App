// Header cart button with the item count. Cart opens from here on Home, Shop and Stores.
import { useCart } from "@/lib/cart";
import { useOpenCart } from "./cart-drawer";
import { CartIcon } from "./tab-icons";
import { ArtButton } from "./ui";

export function CartButton() {
  const { count } = useCart();
  const openCart = useOpenCart();
  return (
    <ArtButton label="Cart" badge={count} onPress={openCart}>
      <CartIcon active size={30} />
    </ArtButton>
  );
}
