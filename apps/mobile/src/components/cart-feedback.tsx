// "Added to cart" confirmation: a small sheet with the product, quantity and quick actions.
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatNaira } from "@sotechy/shared";
import { useCart } from "@/lib/cart";
import { colors, radius, space } from "@/lib/theme";
import { ProductImage } from "./product-image";
import { Button, tap, Txt } from "./ui";

interface AddedItem {
  name: string;
  variant?: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
}

const CartFeedbackContext = createContext<(item: AddedItem) => void>(() => {});
export const useCartFeedback = () => useContext(CartFeedbackContext);

export function CartFeedbackProvider({ children }: { children: ReactNode }) {
  const [item, setItem] = useState<AddedItem | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setItem(null);
  }, []);

  const show = useCallback(
    (added: AddedItem) => {
      tap();
      if (timer.current) clearTimeout(timer.current);
      setItem(added);
      timer.current = setTimeout(close, 5000);
    },
    [close],
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <CartFeedbackContext.Provider value={show}>
      {children}
      <Modal visible={!!item} transparent animationType="fade" onRequestClose={close}>
        {item && <AddedSheet item={item} onClose={close} />}
      </Modal>
    </CartFeedbackContext.Provider>
  );
}

function AddedSheet({ item, onClose }: { item: AddedItem; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { count, subtotal } = useCart();
  return (
    <View style={{ flex: 1, justifyContent: "flex-end" }}>
      <Pressable style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.overlay }} onPress={onClose} accessibilityLabel="Close" />
      <View style={{ margin: space.md, marginBottom: insets.bottom + space.md, backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: space.lg, gap: space.lg }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: colors.success, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="checkmark" size={16} color={colors.white} />
          </View>
          <Txt variant="heading" style={{ flex: 1 }}>Added to your cart</Txt>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
            <Ionicons name="close" size={20} color={colors.muted} />
          </Pressable>
        </View>

        <View style={{ flexDirection: "row", gap: space.md, alignItems: "center" }}>
          <ProductImage uri={item.imageUrl} name={item.name} style={{ width: 72, height: 72 }} radius={radius.md} padding={6} iconSize={28} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="medium" numberOfLines={2}>{item.name}</Txt>
            {item.variant && item.variant !== "Standard" ? <Txt variant="caption">{item.variant}</Txt> : null}
            <Txt variant="small">
              Qty {item.quantity} × {formatNaira(item.unitPrice)}
            </Txt>
          </View>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: colors.surfaceAlt, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: space.sm }}>
          <Txt variant="small">Cart ({count} item{count === 1 ? "" : "s"})</Txt>
          <Txt variant="label">{formatNaira(subtotal)}</Txt>
        </View>

        <View style={{ flexDirection: "row", gap: space.sm }}>
          <Button title="Keep shopping" variant="outline" onPress={onClose} style={{ flex: 1 }} />
          <Button
            title="View cart"
            icon="bag-handle-outline"
            variant="dark"
            onPress={() => {
              onClose();
              router.push("/cart");
            }}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </View>
  );
}
