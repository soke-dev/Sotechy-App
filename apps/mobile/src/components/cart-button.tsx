// Header cart button with the item count. Cart opens from here on Home, Shop and Stores.
import { router } from "expo-router";
import { useCart } from "@/lib/cart";
import { CartIcon } from "./tab-icons";
import { ArtButton } from "./ui";

export function CartButton() {
  const { count } = useCart();
  return (
    <ArtButton label="Cart" badge={count} onPress={() => router.push("/cart")}>
      <CartIcon active size={30} />
    </ArtButton>
  );
}
