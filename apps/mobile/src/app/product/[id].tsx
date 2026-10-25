import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, Share, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatNaira } from "@sotechy/shared";
import { useToast } from "@/components/toast";
import {
  BottomBar,
  Button,
  Chip,
  discountPercent,
  Divider,
  ErrorView,
  IconButton,
  ImagePlaceholder,
  Loading,
  Pill,
  Price,
  productIcon,
  QtyStepper,
  tap,
  Txt,
  ui,
  type IconName,
} from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { colors, gutter, radius, space } from "@/lib/theme";
import { useAsync } from "@/lib/use-async";

function InfoRow({ icon, title, subtitle }: { icon: IconName; title: string; subtitle?: string }) {
  return (
    <View style={{ flexDirection: "row", gap: space.md, alignItems: "flex-start", paddingVertical: space.sm }}>
      <Ionicons name={icon} size={20} color={colors.ink2} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Txt variant="label">{title}</Txt>
        {subtitle ? <Txt variant="small">{subtitle}</Txt> : null}
      </View>
    </View>
  );
}

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { data: product, error, loading, reload } = useAsync(() => api.product(id), [id]);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [saved, setSaved] = useState(false);
  const cart = useCart();
  const { user } = useAuth();
  const toast = useToast();

  if (loading && !product) return <Loading />;
  if (error || !product) return <ErrorView message={error ?? "Product not found"} onRetry={reload} />;

  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0];
  const stock = product.stock.filter((s) => s.variantId === variant?.id);
  const available = stock.reduce((n, s) => n + s.quantity - s.reserved, 0);
  const storesWithStock = stock.filter((s) => s.quantity - s.reserved > 0);
  const off = variant ? discountPercent(variant.price, variant.compareAtPrice) : 0;
  const specs = Object.entries(product.specifications);

  function addToCart() {
    if (!variant || !product) return;
    tap();
    cart.add(
      {
        variantId: variant.id,
        productId: product.id,
        productName: product.name,
        variantName: variant.name,
        unitPrice: variant.price,
        imageUrl: product.images[0] ?? null,
      },
      qty,
    );
    toast("Added to cart", { action: { label: "View", onPress: () => router.push("/cart") } });
  }

  async function toggleSaved() {
    if (!user) return router.push("/sign-in");
    tap();
    const res = await api.toggleWishlist(product!.id);
    setSaved(res.saved);
    toast(res.saved ? "Saved for later" : "Removed from saved", { icon: res.saved ? "heart" : "heart-dislike" });
  }

  return (
    <View style={ui.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space.xxl }}>
        {/* Hero image */}
        <View style={{ height: Math.min(width, 720) * 0.95, backgroundColor: colors.surfaceAlt }}>
          {product.images[0] ? <Image source={{ uri: product.images[0] }} style={{ flex: 1 }} contentFit="cover" /> : <ImagePlaceholder style={{ flex: 1 }} icon={productIcon(product.name)} size={72} />}
          <View style={[ui.between, { position: "absolute", top: insets.top + space.sm, left: gutter, right: gutter }]}>
            <IconButton icon="chevron-back" tone="glass" onPress={() => router.back()} />
            <View style={ui.row}>
              <IconButton icon="share-outline" tone="glass" onPress={() => Share.share({ message: `${product.name} — ${formatNaira(variant?.price)} at Sotechy Shop` })} />
              <IconButton icon={saved ? "heart" : "heart-outline"} color={saved ? colors.danger : colors.ink} tone="glass" onPress={toggleSaved} />
            </View>
          </View>
        </View>

        {/* Details sheet */}
        <View style={{ marginTop: -radius.xl, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, backgroundColor: colors.bg, paddingHorizontal: gutter, paddingTop: space.xl, gap: space.lg }}>
          <View style={{ gap: 6 }}>
            {product.brand ? <Txt variant="overline">{product.brand}{product.model ? ` · ${product.model}` : ""}</Txt> : null}
            <Txt variant="title">{product.name}</Txt>
            <View style={[ui.row, { marginTop: 4 }]}>
              <Price amount={variant?.price ?? 0} compareAt={variant?.compareAtPrice} size="lg" />
              {off > 0 && <Pill label={`Save ${off}%`} tone="brand" />}
            </View>
            {available > 0 ? (
              <Pill
                icon="checkmark-circle"
                tone={available <= product.lowStockThreshold ? "warning" : "success"}
                label={available <= product.lowStockThreshold ? `Only ${available} left` : `In stock at ${storesWithStock.length} store${storesWithStock.length === 1 ? "" : "s"}`}
              />
            ) : (
              <Pill icon="close-circle" tone="danger" label="Out of stock" />
            )}
          </View>

          {product.variants.length > 1 && (
            <View style={{ gap: space.sm }}>
              <Txt variant="label">Option</Txt>
              <View style={[ui.row, { flexWrap: "wrap" }]}>
                {product.variants.map((v) => (
                  <Chip key={v.id} label={v.name} active={v.id === variant?.id} onPress={() => setVariantId(v.id)} />
                ))}
              </View>
            </View>
          )}

          <View style={[ui.card, { paddingVertical: space.sm }]}>
            {product.allowPickup && (
              <InfoRow
                icon="storefront-outline"
                title={storesWithStock[0] ? `Pick up at ${storesWithStock[0].branchName}` : "Store pickup"}
                subtitle={storesWithStock[0] ? "Usually ready the same day" : "Currently unavailable"}
              />
            )}
            {product.allowDelivery && <InfoRow icon="bicycle-outline" title="Delivery in Benin City" subtitle="Fee and timing shown at checkout" />}
            <InfoRow icon="shield-checkmark-outline" title={product.warrantyMonths ? `${product.warrantyMonths}-month warranty` : "Warranty details on request"} subtitle={product.returnPolicy ?? undefined} />
            <InfoRow icon="wallet-outline" title="Pay your way" subtitle="Bank transfer, online payment or $MOVE" />
          </View>

          {stock.length > 0 && (
            <View style={{ gap: space.sm }}>
              <Txt variant="heading">Availability</Txt>
              <View style={ui.card}>
                {stock.map((s, i) => {
                  const left = s.quantity - s.reserved;
                  return (
                    <View key={s.branchId}>
                      {i > 0 && <Divider style={{ marginVertical: space.md }} />}
                      <View style={ui.between}>
                        <View style={[ui.row, { flex: 1 }]}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: left > 0 ? colors.success : colors.faint }} />
                          <Txt variant="medium" numberOfLines={1} style={{ flex: 1 }}>{s.branchName}</Txt>
                        </View>
                        <Txt variant="small" color={left > 0 ? colors.success : colors.muted}>{left > 0 ? `${left} available` : "Out of stock"}</Txt>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {product.description ? (
            <View style={{ gap: space.sm }}>
              <Txt variant="heading">About this item</Txt>
              <Txt variant="body" color={colors.ink2}>{product.description}</Txt>
            </View>
          ) : null}

          {specs.length > 0 && (
            <View style={{ gap: space.sm }}>
              <Txt variant="heading">Specifications</Txt>
              <View style={[ui.card, { paddingVertical: 0 }]}>
                {specs.map(([k, v], i) => (
                  <View key={k} style={[ui.between, { paddingVertical: space.md, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderTopColor: colors.line }]}>
                    <Txt variant="small">{k}</Txt>
                    <Txt variant="medium">{v}</Txt>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <BottomBar>
        <QtyStepper value={qty} onChange={setQty} max={Math.max(1, available)} />
        <Button title={available > 0 ? `Add · ${formatNaira((variant?.price ?? 0) * qty)}` : "Out of stock"} icon="bag-add-outline" onPress={addToCart} disabled={available <= 0} style={{ flex: 1 }} />
      </BottomBar>
    </View>
  );
}
