// A marketplace store's product, laid out like Sotechy's own product page: photo, price and tokens,
// who sells it, delivery, negotiation, and Overview / About & specs / Reviews.
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatNaira } from "@sotechy/shared";
import { MarketProductCard, openStore, StoreLogo } from "@/components/store-bits";
import { ProductArt } from "@/components/store-brand";
import { Stars } from "@/components/stars";
import { useToast } from "@/components/toast";
import { BottomBar, Button, Divider, EmptyState, IconButton, Pill, Price, QtyStepper, SectionHeader, tap, Txt, ui } from "@/components/ui";
import { detailsFor, REVIEWS } from "@/lib/market-details";
import { CROSS_BONUS, findProduct, formatTokens, storeBySlug, tileColor } from "@/lib/marketplace";
import { useOffers } from "@/lib/offers";
import { useCart } from "@/lib/cart";
import { colors, fonts, gutter, radius, space } from "@/lib/theme";

type Tab = "overview" | "about" | "reviews";

function Tabs({ tab, onChange, rating }: { tab: Tab; onChange: (t: Tab) => void; rating: number }) {
  const items: { key: Tab; label: string; sub: string }[] = [
    { key: "overview", label: "Overview", sub: "Seller & delivery" },
    { key: "about", label: "About & specs", sub: "Full details" },
    { key: "reviews", label: "Reviews", sub: `${rating.toFixed(1)} (${REVIEWS.length})` },
  ];
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: 4, padding: 4, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt }}>
      {items.map((t) => {
        const active = t.key === tab;
        return (
          <Pressable
            key={t.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              tap();
              onChange(t.key);
            }}
            style={{
              flex: 1,
              minHeight: 54,
              borderRadius: radius.md,
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              backgroundColor: active ? colors.surface : "transparent",
              borderWidth: active ? StyleSheet.hairlineWidth : 0,
              borderColor: colors.line,
            }}
          >
            <Txt variant="label" color={active ? colors.ink : colors.muted} style={{ fontSize: 13 }}>
              {t.label}
            </Txt>
            <Txt variant="caption" style={{ fontSize: 11 }}>
              {t.sub}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

function Row({ icon, title, text }: { icon: "bicycle" | "storefront" | "shield-checkmark" | "refresh" | "sparkles"; title: string; text: string }) {
  return (
    <View style={{ flexDirection: "row", gap: space.md, paddingVertical: space.md }}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={17} color={colors.brandPressed} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="label">{title}</Txt>
        <Txt variant="small">{text}</Txt>
      </View>
    </View>
  );
}

export default function StoreItemScreen() {
  const { store: slug, id } = useLocalSearchParams<{ store: string; id: string }>();
  const store = storeBySlug(slug ?? "");
  const product = findProduct(slug ?? "", id ?? "");
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const toast = useToast();
  const offers = useOffers();
  const cart = useCart();
  const [tab, setTab] = useState<Tab>("overview");
  const [qty, setQty] = useState(1);

  if (!store || !product) return <EmptyState illo="bag" title="Product not found" message="It may have been taken off sale." />;

  const d = detailsFor(store, product);
  const off = product.compareAt && product.compareAt > product.price ? Math.round(((product.compareAt - product.price) / product.compareAt) * 100) : 0;
  const open = product.negotiable ? offers.forProduct(store.slug, product.id) : undefined;
  const heroHeight = Math.round(Math.min(width, 720) * 0.86);
  const more = store.products.filter((x) => x.id !== product.id);

  return (
    <View style={ui.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: space.xxl * 3 }} showsVerticalScrollIndicator={false}>
        {/* Photo, in the store's colour */}
        <View style={{ height: heroHeight, backgroundColor: tileColor(store.theme), alignItems: "center", justifyContent: "center" }}>
          <View style={{ position: "absolute", width: heroHeight * 0.66, height: heroHeight * 0.66, borderRadius: heroHeight, backgroundColor: "rgba(255,255,255,0.55)" }} />
          <ProductArt product={product} store={store} scale={0.7} />
          <View style={[ui.between, { position: "absolute", top: insets.top + space.sm, left: gutter, right: gutter }]}>
            <IconButton icon="chevron-back" tone="glass" onPress={() => (router.canGoBack() ? router.back() : openStore(store.slug))} />
            <IconButton icon="bag-handle-outline" tone="glass" badge={cart.count} onPress={() => router.push("/cart")} />
          </View>
        </View>

        {/* Details */}
        <View
          style={{ marginTop: -radius.xl, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, backgroundColor: colors.bg, paddingHorizontal: gutter, paddingTop: space.xl, gap: space.lg }}
        >
          <View style={{ gap: 6 }}>
            <Txt variant="overline">{d.brand}</Txt>
            <Txt variant="title">{product.name}</Txt>
            <View style={[ui.row, { marginTop: 4, flexWrap: "wrap" }]}>
              <Price amount={product.price} compareAt={product.compareAt} size="lg" />
              {off > 0 && <Pill label={`Save ${off}%`} tone="brand" />}
            </View>
            <View style={[ui.row, { flexWrap: "wrap" }]}>
              <Pill icon="checkmark-circle" tone="success" label="In stock" />
              {product.negotiable && <Pill icon="pricetag" tone="dark" label="Price negotiable" />}
            </View>
            <Txt variant="label" color={colors.brandPressed} style={{ marginTop: 2 }}>
              Earn {formatTokens(product.price)} ${store.ticker}
              {store.isSotechy ? "" : ` + ${formatTokens(Math.round(product.price * CROSS_BONUS))} $SOTECHY`}
            </Txt>
          </View>

          {/* Negotiation: one compact row */}
          {product.negotiable ? (
            <Pressable
              onPress={() => router.push(open ? { pathname: "/offer/[id]", params: { id: open.id } } : { pathname: "/offer/[id]", params: { id: "new", store: store.slug, product: product.id } })}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: space.md,
                paddingVertical: space.md,
                paddingHorizontal: space.md,
                borderRadius: radius.lg,
                backgroundColor: pressed ? colors.surfaceAlt : colors.brandSoft,
              })}
            >
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="pricetag" size={16} color={colors.brandPressed} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="label">{open ? "You're negotiating this" : "Make an offer"}</Txt>
                <Txt variant="caption">{open ? "See your conversation with the store" : `Agreed prices are held for you up to ${product.negotiable.hours}h`}</Txt>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.ink2} />
            </Pressable>
          ) : null}

          <Tabs tab={tab} onChange={setTab} rating={store.rating} />

          {tab === "overview" && (
            <View style={{ gap: space.md }}>
              {/* Who sells it */}
              <Pressable onPress={() => openStore(store.slug)} style={({ pressed }) => [ui.card, { flexDirection: "row", alignItems: "center", gap: space.md, opacity: pressed ? 0.85 : 1 }]}>
                <StoreLogo store={store} size={46} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt variant="caption">Sold by</Txt>
                  <View style={ui.row}>
                    <Txt variant="label" style={{ fontSize: 15 }}>
                      {store.name}
                    </Txt>
                    <Ionicons name="checkmark-circle" size={15} color={store.isSotechy ? colors.brand : "#2F6FB3"} />
                  </View>
                  <View style={ui.row}>
                    <Stars value={store.rating} size={11} emptyColor={colors.faint} />
                    <Txt variant="caption">
                      {store.rating} · {store.city}
                    </Txt>
                  </View>
                </View>
                <Txt variant="label" color={colors.brandPressed}>
                  Visit store
                </Txt>
                <Ionicons name="chevron-forward" size={16} color={colors.brandPressed} />
              </Pressable>
              <View style={[ui.card, { paddingVertical: space.xs }]}>
                <Row
                  icon="bicycle"
                  title={`Delivers to ${store.delivery.states.join(", ")}`}
                  text={`Home delivery from ${formatNaira(store.delivery.homeFrom)}. Choose home delivery or pickup at checkout.`}
                />
                <Divider />
                {store.delivery.pickup ? (
                  <>
                    <Row icon="storefront" title="Pickup available" text={store.delivery.pickup} />
                    <Divider />
                  </>
                ) : null}
                <Row icon="shield-checkmark" title={`Warranty: ${d.warranty}`} text="Your money is held by Sotechy until the store accepts and ships your order." />
                <Divider />
                <Row icon="sparkles" title={`Earn $${store.ticker} on this order`} text={`Tokens are released when your order is delivered. Review it with a photo for 10% more.`} />
              </View>
            </View>
          )}

          {tab === "about" && (
            <View style={{ gap: space.lg }}>
              <Txt variant="body" color={colors.ink2}>
                {d.about}
              </Txt>
              {d.features.length > 0 && (
                <View style={{ gap: space.sm }}>
                  <Txt variant="heading">Key features</Txt>
                  {d.features.map((f) => (
                    <View key={f} style={[ui.row, { alignItems: "flex-start" }]}>
                      <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                      <Txt variant="body" style={{ flex: 1 }}>
                        {f}
                      </Txt>
                    </View>
                  ))}
                </View>
              )}
              {d.specs.length > 0 && (
                <View style={{ gap: space.sm }}>
                  <Txt variant="heading">Specifications</Txt>
                  <View style={[ui.card, { paddingVertical: space.xs }]}>
                    {d.specs.map(([k, v], i) => (
                      <View key={k}>
                        {i > 0 && <Divider />}
                        <View style={[ui.between, { paddingVertical: space.md, gap: space.md }]}>
                          <Txt variant="small">{k}</Txt>
                          <Txt variant="label" style={{ flexShrink: 1, textAlign: "right" }}>
                            {v}
                          </Txt>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              <View style={{ gap: space.sm }}>
                <Txt variant="heading">In the box</Txt>
                <Txt variant="body" color={colors.ink2}>
                  {d.inBox.join(" · ")}
                </Txt>
              </View>
            </View>
          )}

          {tab === "reviews" && (
            <View style={{ gap: space.md }}>
              {REVIEWS.map((r) => (
                <View key={r.name} style={[ui.card, { gap: 6 }]}>
                  <View style={ui.row}>
                    <Stars value={r.stars} size={13} emptyColor={colors.faint} />
                    <Txt variant="caption">
                      {r.name} · {r.ago}
                    </Txt>
                  </View>
                  <Txt variant="body">{r.text}</Txt>
                  {r.photo && (
                    <Txt variant="caption" color={colors.brandPressed} style={{ fontFamily: fonts.semibold }}>
                      Photo review · earned a 10% ${store.ticker} bonus
                    </Txt>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {more.length > 0 && (
          <View style={{ marginTop: space.xxl }}>
            <View style={{ paddingHorizontal: gutter }}>
              <SectionHeader title={`More from ${store.name}`} action="Visit store" onAction={() => openStore(store.slug)} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: gutter, gap: space.md }}>
              {more.map((x) => (
                <MarketProductCard key={x.id} store={store} product={x} />
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      <BottomBar>
        <QtyStepper value={qty} onChange={setQty} max={10} />
        <Button title={`Add · ${formatNaira(product.price * qty)}`} icon="bag-add-outline" onPress={() => toast("Sample store: buying opens when the marketplace goes live")} style={{ flex: 1 }} />
      </BottomBar>
    </View>
  );
}
