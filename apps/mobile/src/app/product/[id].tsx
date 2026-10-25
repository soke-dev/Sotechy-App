import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState, type ComponentRef } from "react";
import { Linking, Pressable, ScrollView, Share, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatNaira, type CatalogProduct } from "@sotechy/shared";
import { ProductCard } from "@/components/product-card";
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
  SectionHeader,
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
import { openWhatsApp } from "@/lib/whatsapp";

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
  const [imageIndex, setImageIndex] = useState(0);
  const galleryRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const cart = useCart();
  const { user } = useAuth();
  const toast = useToast();
  const config = useAsync(() => api.storeConfig());
  const heroHeight = Math.round(Math.min(width, 720) * 0.95);

  // Related = other products in the same top-level category.
  const related = useAsync(async () => {
    if (!product) return { slug: null as string | null, items: [] as CatalogProduct[] };
    const cats = await api.categories();
    const own = cats.find((c) => c.id === product.categoryId);
    const group = own?.parentId ? cats.find((c) => c.id === own.parentId) : own;
    if (!group) return { slug: null, items: [] };
    const items = await api.products({ category: group.slug });
    return { slug: group.slug, items: items.filter((p) => p.id !== product.id).slice(0, 10) };
  }, [product?.id]);

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
        {/* Photo gallery: swipe, or tap a thumbnail below */}
        <View style={{ height: heroHeight, backgroundColor: colors.surface }}>
          {product.images.length > 0 ? (
            <ScrollView
              ref={galleryRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => setImageIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
            >
              {product.images.map((src, i) => (
                <Image key={i} source={{ uri: src }} style={{ width, height: heroHeight - radius.xl }} contentFit="contain" transition={150} />
              ))}
            </ScrollView>
          ) : (
            <ImagePlaceholder style={{ flex: 1 }} icon={productIcon(product.name)} size={72} />
          )}
          {product.images.length > 1 && (
            <View style={{ position: "absolute", right: gutter, bottom: radius.xl + space.md, backgroundColor: "rgba(23,18,14,0.7)", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Txt variant="caption" color={colors.white}>{imageIndex + 1} / {product.images.length}</Txt>
            </View>
          )}
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
          {product.images.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
              {product.images.map((src, i) => (
                <Pressable
                  key={i}
                  onPress={() => {
                    setImageIndex(i);
                    galleryRef.current?.scrollTo({ x: i * width, animated: true });
                  }}
                  style={{ width: 64, height: 64, borderRadius: radius.md, overflow: "hidden", borderWidth: 2, borderColor: i === imageIndex ? colors.ink : "transparent", padding: 2 }}
                >
                  <Image source={{ uri: src }} style={{ flex: 1, borderRadius: radius.sm, backgroundColor: colors.surface }} contentFit="contain" />
                </Pressable>
              ))}
            </ScrollView>
          )}

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

          <Pressable
            onPress={() =>
              openWhatsApp(
                config.data?.support.whatsapp,
                `Hello Sotechy, I'd like to order: ${product.name}${product.variants.length > 1 && variant ? ` (${variant.name})` : ""} – ${formatNaira(variant?.price)}`,
              )
            }
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 48, borderRadius: radius.pill, backgroundColor: pressed ? colors.surfaceAlt : colors.surface, borderWidth: 1, borderColor: colors.line })}
          >
            <Ionicons name="logo-whatsapp" size={20} color={colors.brandPressed} />
            <Txt variant="label">Order this on WhatsApp</Txt>
          </Pressable>

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

          <View style={[ui.card, { gap: space.md }]}>
            <View style={[ui.row, { gap: space.md }]}>
              <Image source={require("../../../assets/brand/sotechylogo.png")} style={{ width: 40, height: 40 }} contentFit="contain" />
              <View style={{ flex: 1 }}>
                <Txt variant="overline">Sold by</Txt>
                <Txt variant="label">Sotechy Shop · Benin City</Txt>
              </View>
              <Pill label="Official store" tone="brand" icon="checkmark-circle" />
            </View>
            <Divider />
            {[
              ["shield-checkmark-outline", "Genuine products with warranty"],
              ["storefront-outline", "Inspect and pick up in store"],
              ["chatbubbles-outline", "Real people on call and WhatsApp"],
            ].map(([icon, text]) => (
              <View key={text} style={[ui.row, { gap: space.sm }]}>
                <Ionicons name={icon as IconName} size={16} color={colors.success} />
                <Txt variant="small" color={colors.ink2}>{text}</Txt>
              </View>
            ))}
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

        {related.data && related.data.items.length > 0 && (
          <View style={{ marginTop: space.xxl }}>
            <View style={{ paddingHorizontal: gutter }}>
              <SectionHeader title="Related products" action="See all" onAction={() => router.push({ pathname: "/shop", params: { category: related.data?.slug ?? "" } })} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: gutter, gap: space.md }}>
              {related.data.items.map((p) => (
                <ProductCard key={p.id} product={p} width={150} />
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      <BottomBar>
        <IconButton
          icon="call-outline"
          size={48}
          onPress={() => config.data?.support.phone && Linking.openURL(`tel:${config.data.support.phone.replace(/[^\d+]/g, "")}`)}
        />
        <QtyStepper value={qty} onChange={setQty} max={Math.max(1, available)} />
        <Button title={available > 0 ? `Add · ${formatNaira((variant?.price ?? 0) * qty)}` : "Out of stock"} icon="bag-add-outline" onPress={addToCart} disabled={available <= 0} style={{ flex: 1 }} />
      </BottomBar>
    </View>
  );
}
