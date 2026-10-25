import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { Link, router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { formatNaira, type CatalogProduct } from "@sotechy/shared";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { colors, radius, space } from "@/lib/theme";
import { useToast } from "./toast";
import { discountPercent, ImagePlaceholder, Pill, productIcon, tap, Txt } from "./ui";

/** Floating "+" button: adds single-option products straight to the cart, otherwise opens the product. */
function QuickAdd({ product }: { product: CatalogProduct }) {
  const cart = useCart();
  const toast = useToast();
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
      tap();
      cart.add({ variantId: v.id, productId: detail.id, productName: detail.name, variantName: v.name, unitPrice: v.price, imageUrl: detail.images[0] ?? null });
      toast("Added to cart", { action: { label: "View", onPress: () => router.push("/cart") } });
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
      style={({ pressed }) => ({ position: "absolute", top: 8, right: 8, width: 34, height: 34, borderRadius: 17, backgroundColor: pressed ? colors.ink2 : colors.ink, alignItems: "center", justifyContent: "center" })}
    >
      {busy ? <ActivityIndicator size="small" color={colors.white} /> : <Ionicons name="add" size={20} color={colors.white} />}
    </Pressable>
  );
}

export function ProductCard({ product, width, quickAdd = true }: { product: CatalogProduct; width?: number; quickAdd?: boolean }) {
  const off = discountPercent(product.minPrice, product.compareAtPrice);
  const soldOut = product.totalAvailable <= 0;
  // The fixed width lives on a wrapper View: Link's asChild doesn't keep function styles on web.
  return (
    <View style={{ width }}>
      <Link href={{ pathname: "/product/[id]", params: { id: product.slug } }} asChild>
        <Pressable style={styles.card}>
          <View style={styles.media}>
            {product.imageUrl ? (
              <Image source={{ uri: product.imageUrl }} style={{ flex: 1, margin: 10, opacity: soldOut ? 0.45 : 1 }} contentFit="contain" transition={150} />
            ) : (
              <ImagePlaceholder style={{ flex: 1 }} icon={productIcon(product.name)} size={40} />
            )}
            {soldOut && (
              <View style={{ position: "absolute", top: 8, left: 8 }}>
                <Pill label="Sold out" tone="dark" />
              </View>
            )}
          </View>
          <View style={{ padding: 10, gap: 3 }}>
            {product.brand ? <Txt variant="overline">{product.brand}</Txt> : null}
            <Txt variant="medium" numberOfLines={2} style={{ fontSize: 13.5, lineHeight: 18, minHeight: 36 }}>
              {product.name}
            </Txt>
            <Txt variant="price" style={{ marginTop: 2 }}>{formatNaira(product.minPrice)}</Txt>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 20 }}>
              {off > 0 ? (
                <>
                  <Txt variant="caption" style={{ textDecorationLine: "line-through", color: colors.faint }}>{formatNaira(product.compareAtPrice)}</Txt>
                  <Pill label={`-${off}%`} tone="success" />
                </>
              ) : !soldOut && product.totalAvailable <= 3 ? (
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

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, overflow: "hidden" },
  media: { width: "100%", aspectRatio: 1, backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
});

export const PRODUCT_CARD_GAP = space.md;
