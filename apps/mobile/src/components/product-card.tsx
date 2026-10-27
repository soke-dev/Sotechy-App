import Ionicons from "@expo/vector-icons/Ionicons";
import { Link, router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { formatNaira, type CatalogProduct } from "@sotechy/shared";
import { api } from "@/lib/api";
import { useFeatures } from "@/lib/store-config";
import { colors, radius, space } from "@/lib/theme";
import { sellerOf, useAddToCart } from "./add-to-cart";
import { useCartFeedback } from "./cart-feedback";
import { useToast } from "./toast";
import { discountPercent, Pill, Txt } from "./ui";
import { ProductImage } from "./product-image";

/** Floating "+" button: adds single-option products straight to the cart, otherwise opens the product. */
function QuickAdd({ product }: { product: CatalogProduct }) {
  const addToCart = useAddToCart();
  const toast = useToast();
  const showAdded = useCartFeedback();
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    try {
      const detail = await api.product(product.slug);
      if (detail.variants.length !== 1) {
        router.push({ pathname: "/product/[id]", params: { id: product.slug } });
        return;
      }
      const v = detail.variants[0];
      const line = { variantId: v.id, productId: detail.id, productName: detail.name, variantName: v.name, unitPrice: v.price, imageUrl: detail.images[0] ?? null, store: sellerOf(detail.store) };
      if (!(await addToCart(line))) return;
      showAdded({ name: detail.name, imageUrl: detail.images[0] ?? null, quantity: 1, unitPrice: v.price });
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not add", { icon: "alert-circle" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Pressable
      onPress={add}
      hitSlop={6}
      accessibilityLabel={`Add ${product.name} to cart`}
      style={({ pressed }) => ({ position: "absolute", top: 8, right: 8, width: 34, height: 34, borderRadius: 17, backgroundColor: pressed ? colors.inversePressed : colors.inverse, alignItems: "center", justifyContent: "center" })}
    >
      {busy ? <ActivityIndicator size="small" color={colors.white} /> : <Ionicons name="add" size={20} color={colors.onInverse} />}
    </Pressable>
  );
}

export function ProductCard({ product, width, quickAdd = true }: { product: CatalogProduct; width?: number; quickAdd?: boolean }) {
  const off = discountPercent(product.minPrice, product.compareAtPrice);
  const soldOut = product.totalAvailable <= 0;
  const features = useFeatures();
  const rated = features.reviews && !!product.ratingCount;
  // The fixed width lives on a wrapper View: Link's asChild doesn't keep function styles on web.
  return (
    <View style={{ width }}>
      <Link href={{ pathname: "/product/[id]", params: { id: product.slug } }} asChild>
        <Pressable style={styles.card}>
          <View style={{ width: "100%", aspectRatio: 1 }}>
            <ProductImage uri={product.imageUrl} name={product.name} style={{ flex: 1 }} padding={14} mark dimmed={soldOut} />
            {soldOut && (
              <View style={{ position: "absolute", top: 8, left: 8 }}>
                <Pill label="Sold out" tone="dark" />
              </View>
            )}
          </View>
          <View style={{ padding: 10, gap: 3 }}>
            {product.brand || rated ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Txt variant="overline" numberOfLines={1} style={{ flex: 1 }}>{product.brand ?? ""}</Txt>
                {rated ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                    <Ionicons name="star" size={11} color={colors.brandYellow} />
                    <Txt variant="caption" style={{ fontSize: 11 }} color={colors.ink2}>
                      {(product.ratingAverage ?? 0).toFixed(1)} ({product.ratingCount})
                    </Txt>
                  </View>
                ) : null}
              </View>
            ) : null}
            <Txt variant="medium" numberOfLines={2} style={{ fontSize: 13.5, lineHeight: 18, minHeight: 36 }}>
              {product.name}
            </Txt>
            <Txt variant="price" style={{ marginTop: 2 }}>{formatNaira(product.minPrice)}</Txt>
            {product.storeName ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="storefront-outline" size={11} color={colors.muted} />
                <Txt variant="caption" numberOfLines={1} style={{ flexShrink: 1, fontSize: 11.5 }}>{product.storeName}</Txt>
              </View>
            ) : null}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 20 }}>
              {off > 0 ? (
                <>
                  <Txt variant="caption" style={{ textDecorationLine: "line-through", color: colors.faint }}>{formatNaira(product.compareAtPrice)}</Txt>
                  <Pill label={`-${off}%`} tone="success" />
                </>
              ) : features.lowStockBadges && !soldOut && product.totalAvailable <= 3 ? (
                <Txt variant="caption" color={colors.warning}>Only {product.totalAvailable} left</Txt>
              ) : null}
            </View>
          </View>
        </Pressable>
      </Link>
      {quickAdd && !soldOut && <QuickAdd product={product} />}
    </View>
  );
}

const styles = {
  get card(): ViewStyle {
    return { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, overflow: "hidden" };
  },
  get media(): ViewStyle {
    return { width: "100%", aspectRatio: 1, backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line };
  },
};

export const PRODUCT_CARD_GAP = space.md;
