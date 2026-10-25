import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { formatNaira } from "@sotechy/shared";
import { BottomBar, Button, Divider, EmptyState, ImagePlaceholder, productIcon, QtyStepper, ScreenHeader, SummaryRow, Txt, ui } from "@/components/ui";
import { useTabBarInset } from "@/components/tab-bar";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { colors, gutter, radius, space } from "@/lib/theme";

export default function CartScreen() {
  const cart = useCart();
  const { user } = useAuth();
  const tabInset = useTabBarInset();

  if (cart.lines.length === 0) {
    return (
      <View style={ui.screen}>
        <ScreenHeader title="Cart" />
        <EmptyState
          illo="cart"
          title="Your cart is empty"
          message="Phones, laptops, TVs and home appliances: find something you like and it will show up here."
          action={<Button title="Start shopping" onPress={() => router.push("/shop")} />}
        />
      </View>
    );
  }

  return (
    <View style={ui.screen}>
      <ScreenHeader title="Cart" subtitle={`${cart.count} item${cart.count === 1 ? "" : "s"}`} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: tabInset + 96, gap: space.lg }}>
        <View style={[ui.card, { paddingVertical: space.sm }]}>
          {cart.lines.map((line, i) => (
            <View key={line.variantId}>
              {i > 0 && <Divider />}
              <View style={{ flexDirection: "row", gap: space.md, paddingVertical: space.md }}>
                <Pressable onPress={() => router.push({ pathname: "/product/[id]", params: { id: line.productId } })}>
                  {line.imageUrl ? (
                    <Image source={{ uri: line.imageUrl }} style={{ width: 76, height: 76, borderRadius: radius.md, backgroundColor: colors.surfaceAlt }} contentFit="cover" />
                  ) : (
                    <ImagePlaceholder style={{ width: 76, height: 76, borderRadius: radius.md }} icon={productIcon(line.productName)} />
                  )}
                </Pressable>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={[ui.between, { alignItems: "flex-start", gap: space.sm }]}>
                    <Txt variant="medium" numberOfLines={2} style={{ flex: 1 }}>{line.productName}</Txt>
                    <Pressable onPress={() => cart.remove(line.variantId)} hitSlop={10}>
                      <Ionicons name="trash-outline" size={18} color={colors.muted} />
                    </Pressable>
                  </View>
                  <Txt variant="small">{line.variantName}</Txt>
                  <View style={[ui.between, { marginTop: space.sm }]}>
                    <Txt variant="price">{formatNaira(line.unitPrice * line.quantity)}</Txt>
                    <QtyStepper value={line.quantity} min={0} onChange={(n) => cart.setQuantity(line.variantId, n)} />
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={ui.card}>
          <SummaryRow label="Subtotal" value={formatNaira(cart.subtotal)} />
          <SummaryRow label="Delivery" value="At checkout" />
          <SummaryRow label="Discounts" value="At checkout" />
          <Divider style={{ marginVertical: space.sm }} />
          <SummaryRow label="Estimated total" value={formatNaira(cart.subtotal)} strong />
        </View>

        <View style={[ui.row, { justifyContent: "center" }]}>
          <Ionicons name="lock-closed-outline" size={14} color={colors.muted} />
          <Txt variant="caption">Prices and stock are confirmed when you place the order</Txt>
        </View>
      </ScrollView>
      <BottomBar aboveTabBar={tabInset}>
        <View style={{ flex: 1 }}>
          <Txt variant="caption">Total</Txt>
          <Txt variant="price" style={{ fontSize: 19 }}>{formatNaira(cart.subtotal)}</Txt>
        </View>
        <Button title={user ? "Checkout" : "Sign in to checkout"} variant="dark" icon={user ? "arrow-forward" : undefined} onPress={() => router.push(user ? "/checkout" : "/sign-in")} style={{ flex: 1.4 }} />
      </BottomBar>
    </View>
  );
}
