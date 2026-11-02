import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Stack } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { formatNaira } from "@sotechy/shared";
import { BottomBar, Button, Divider, EmptyState, QtyStepper, SummaryRow, Txt, ui } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { colors, gutter, radius, space } from "@/lib/theme";
import { ProductImage } from "@/components/product-image";

export default function CartScreen() {
  return <CartView />;
}

/** The cart; `inDrawer` when it's in the desktop side panel (no screen title, shorter empty state) */
export function CartView({ inDrawer = false }: { inDrawer?: boolean }) {
  const cart = useCart();
  const { user } = useAuth();

  if (cart.lines.length === 0) {
    return (
      <View style={ui.screen}>
        <EmptyState
          illo="cart"
          title="Your cart is empty"
          message="Phones, laptops, TVs and home appliances: find something you like and it will show up here."
          action={<Button title="Start shopping" onPress={() => router.push("/shop")} />}
        />
      </View>
    );
  }

  const several = cart.groups.length > 1;
  const checkout = (key: string) => router.push(user ? { pathname: "/checkout", params: { store: key } } : "/sign-in");

  return (
    <View style={ui.screen}>
      {/* Cart opens from the header buttons now that Stores has its tab */}
      {!inDrawer && <Stack.Screen options={{ title: `Cart (${cart.count})` }} />}
      <ScrollView contentContainerStyle={{ paddingHorizontal: gutter, paddingTop: space.sm, paddingBottom: several ? space.xxl : 120, gap: space.lg }}>
        {several && (
          <View style={{ flexDirection: "row", gap: space.sm, alignItems: "center", padding: space.md, borderRadius: radius.lg, backgroundColor: colors.brandSoft }}>
            <Ionicons name="storefront-outline" size={18} color={colors.brandPressed} />
            <Txt variant="small" color={colors.ink2} style={{ flex: 1 }}>
              Items from {cart.groups.length} stores. Each store sends its own order, so you check out each one separately.
            </Txt>
          </View>
        )}

        {cart.groups.map((g) => (
          <View key={g.key} style={{ gap: space.sm }}>
            {several && (
              <View style={[ui.row, { gap: space.sm, paddingHorizontal: 4 }]}>
                <Ionicons name="storefront" size={15} color={colors.brandPressed} />
                <Txt variant="label" style={{ flex: 1 }} numberOfLines={1}>{g.seller?.name ?? "Sotechy"}</Txt>
                <Txt variant="caption">{g.count} item{g.count === 1 ? "" : "s"}</Txt>
              </View>
            )}
            <View style={[ui.card, { paddingVertical: space.sm }]}>
              {g.lines.map((line, i) => (
                <View key={line.variantId}>
                  {i > 0 && <Divider />}
                  <View style={{ flexDirection: "row", gap: space.md, paddingVertical: space.md }}>
                    <Pressable onPress={() => router.push({ pathname: "/product/[id]", params: { id: line.productId } })}>
                      <ProductImage uri={line.imageUrl} name={line.productName} style={{ width: 76, height: 76 }} radius={radius.md} padding={6} iconSize={26} />
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
              {/* Several stores: each has its own total and checkout */}
              {several && (
                <>
                  <Divider />
                  <View style={[ui.between, { paddingTop: space.md, paddingBottom: space.sm, gap: space.md }]}>
                    <View>
                      <Txt variant="caption">Subtotal</Txt>
                      <Txt variant="price">{formatNaira(g.subtotal)}</Txt>
                    </View>
                    <Button title={user ? `Checkout ${g.seller?.name ?? "Sotechy"}` : "Sign in to checkout"} variant="dark" size="sm" icon={user ? "arrow-forward" : undefined} onPress={() => checkout(g.key)} style={{ flexShrink: 1 }} />
                  </View>
                </>
              )}
            </View>
          </View>
        ))}

        {!several && (
          <View style={ui.card}>
            <SummaryRow label="Subtotal" value={formatNaira(cart.subtotal)} />
            <SummaryRow label="Delivery" value="At checkout" />
            <SummaryRow label="Discounts" value="At checkout" />
            <Divider style={{ marginVertical: space.sm }} />
            <SummaryRow label="Estimated total" value={formatNaira(cart.subtotal)} strong />
          </View>
        )}

        <View style={[ui.row, { justifyContent: "center" }]}>
          <Ionicons name="lock-closed-outline" size={14} color={colors.muted} />
          <Txt variant="caption">Prices and stock are confirmed when you place the order</Txt>
        </View>
      </ScrollView>
      {!several && (
        <BottomBar>
          <View style={{ flex: 1 }}>
            <Txt variant="caption">Total</Txt>
            <Txt variant="price" style={{ fontSize: 19 }}>{formatNaira(cart.subtotal)}</Txt>
          </View>
          <Button title={user ? "Checkout" : "Sign in to checkout"} variant="dark" icon={user ? "arrow-forward" : undefined} onPress={() => checkout(cart.groups[0].key)} style={{ flex: 1.4 }} />
        </BottomBar>
      )}
    </View>
  );
}
