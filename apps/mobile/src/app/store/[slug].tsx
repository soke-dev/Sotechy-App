// A merchant's storefront, drawn in the store's own theme (chosen in the merchant dashboard).
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatNaira } from "@sotechy/shared";
import { CartButton } from "@/components/cart-button";
import { Illo } from "@/components/illustrations";
import { openProduct, StoreLogo } from "@/components/store-bits";
import { useHeldTokens } from "@/lib/held-tokens";
import { EmptyState, ErrorView, IconButton, Loading, tap } from "@/components/ui";
import { CROSS_BONUS, formatTokens, loadStore, tileColor, tokenNaira, type MarketStore, type StoreProduct } from "@/lib/marketplace";
import { ProductArt, StoreCover } from "@/components/store-brand";
import { useStoreNotifications } from "@/lib/store-notifications";
import { fonts, gutter, radius, space } from "@/lib/theme";
import { useAsync } from "@/lib/use-async";

type Tab = "products" | "about";


function T({ children, color, size = 15, weight = fonts.body, style, lines }: { children: React.ReactNode; color: string; size?: number; weight?: string; style?: object; lines?: number }) {
  return (
    <Text numberOfLines={lines} style={[{ color, fontSize: size, fontFamily: weight, lineHeight: size * 1.35 }, style]}>
      {children}
    </Text>
  );
}

function ProductTile({ p, store, width }: { p: StoreProduct; store: MarketStore; width: number }) {
  const t = store.theme;
  return (
    <Pressable
      onPress={() => {
        tap();
        openProduct(p.slug);
      }}
      style={({ pressed }) => ({ width, borderRadius: radius.lg, backgroundColor: t.surface, overflow: "hidden", opacity: pressed ? 0.9 : 1 })}
    >
      <View style={{ aspectRatio: 1, backgroundColor: tileColor(t, true), alignItems: "center", justifyContent: "center" }}>
        <View style={{ position: "absolute", width: "64%", height: "64%", borderRadius: 999, backgroundColor: t.dark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.55)" }} />
        <ProductArt product={p} store={store} scale={0.74} />
        {p.negotiable ? (
          <View style={{ position: "absolute", top: 8, right: 8, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: t.hero, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 2 }}>
            <Ionicons name="pricetag" size={10} color={t.onHero} />
            <T color={t.onHero} size={10.5} weight={fonts.bold}>Make an offer</T>
          </View>
        ) : null}
        {p.compareAt && p.compareAt > p.price ? (
          <View style={{ position: "absolute", top: 8, left: 8, backgroundColor: t.surface, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 2 }}>
            <T color={t.text} size={11} weight={fonts.bold}>-{Math.round(((p.compareAt - p.price) / p.compareAt) * 100)}%</T>
          </View>
        ) : null}
      </View>
      <View style={{ padding: space.sm + 2, gap: 2 }}>
        <T color={t.text} size={13.5} weight={fonts.semibold} lines={2}>{p.name}</T>
        <T color={t.text} size={15} weight={fonts.bold}>{formatNaira(p.price)}</T>
        <T color={t.dark ? t.accent : t.muted} size={11.5} weight={fonts.semibold}>+{formatTokens(p.price)} ${store.ticker}</T>
      </View>
    </Pressable>
  );
}

export default function StoreScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const loaded = useAsync(() => loadStore(slug ?? ""), [slug]);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<Tab>("products");
  const subs = useStoreNotifications();
  const held = useHeldTokens(loaded.data?.ticker ?? "");

  if (loaded.loading && !loaded.data) return <Loading />;
  if (loaded.error) return <ErrorView message={loaded.error} onRetry={loaded.reload} />;
  const store = loaded.data;
  if (!store) return <EmptyState illo="store" title="Store not found" message="It may have closed or changed its link." />;
  const products = store.products;

  const t = store.theme;
  const following = subs.isSubscribed(store.slug);
  const tileWidth = (Math.min(width, 720) - gutter * 2 - space.md) / 2;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl }} showsVerticalScrollIndicator={false}>
        {/* The store's announcement sits above everything */}
        {store.announcement ? (
          <View style={{ paddingTop: insets.top + 10, paddingBottom: 10, paddingHorizontal: gutter, backgroundColor: t.accent, flexDirection: "row", alignItems: "center", gap: space.sm }}>
            <Ionicons name="megaphone" size={15} color={t.onAccent} />
            <T color={t.onAccent} size={13} weight={fonts.semibold} style={{ flex: 1 }}>{store.announcement}</T>
          </View>
        ) : null}

        {/* Cover */}
        <View style={{ height: 210 + (store.announcement ? 0 : insets.top) }}>
          <StoreCover store={store} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
          <LinearGradient colors={["rgba(0,0,0,0.45)", "transparent", "rgba(0,0,0,0.5)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
          <View style={{ paddingTop: (store.announcement ? 0 : insets.top) + space.sm, paddingHorizontal: gutter, flexDirection: "row", justifyContent: "space-between" }}>
            <IconButton icon="chevron-back" tone="glass" onPress={() => (router.canGoBack() ? router.back() : router.replace("/stores"))} />
            <CartButton />
          </View>
        </View>

        {/* Name card */}
        <View style={{ marginTop: -48, marginHorizontal: gutter, backgroundColor: t.surface, borderRadius: radius.xl, padding: space.lg, gap: space.md }}>
          <View style={{ flexDirection: "row", gap: space.md, alignItems: "center" }}>
            <StoreLogo store={store} size={64} />
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <T color={t.text} size={21} weight={fonts.displayHeavy} lines={2} style={{ flexShrink: 1, letterSpacing: -0.3 }}>{store.name}</T>
                <Ionicons name="checkmark-circle" size={18} color={t.accent} />
              </View>
              <T color={t.muted} size={13.5} lines={2}>{store.tagline}</T>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, flexWrap: "wrap" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="star" size={14} color="#FDB913" />
              <T color={t.text} size={13} weight={fonts.bold}>{store.rating ?? "New store"}</T>
            </View>
            <T color={t.muted} size={13}>
              {products.length} product{products.length === 1 ? "" : "s"}
            </T>
            {store.delivery.states.length > 0 && <T color={t.muted} size={13}>Delivers to {store.delivery.states.length === 1 ? store.delivery.states[0] : `${store.delivery.states.length} states`}</T>}
          </View>
          <View style={{ flexDirection: "row", gap: space.sm }}>
            <Pressable
              onPress={() => {
                tap();
                subs.toggle(store.slug);
              }}
              style={{ flex: 1, height: 44, borderRadius: radius.pill, backgroundColor: following ? "transparent" : t.accent, borderWidth: following ? 1.5 : 0, borderColor: t.accent, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }}
            >
              <Ionicons name={following ? "notifications" : "notifications-outline"} size={17} color={following ? t.accent : t.onAccent} />
              <T color={following ? t.accent : t.onAccent} weight={fonts.semibold}>{following ? "Subscribed" : "Get their updates"}</T>
            </Pressable>
          </View>
        </View>

        {/* Earn this store's token */}
        <Pressable
          onPress={() => router.push("/wallet")}
          style={{ marginTop: space.md, marginHorizontal: gutter, borderRadius: radius.xl, padding: space.lg, backgroundColor: t.hero, flexDirection: "row", alignItems: "center", gap: space.md, overflow: "hidden" }}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <T color={t.onHero} size={16} weight={fonts.bold}>Earn ${store.ticker} on every order</T>
            <T color="rgba(255,255,255,0.7)" size={12.5}>
              1 ${store.ticker} per ₦1{store.isSotechy ? "" : `, plus ${CROSS_BONUS * 100}% $SOTECHY`}. Spend it here like cash.
            </T>
            {held > 0 && (
              <T color={t.accent === "#17120E" ? "#FDB913" : t.accent} size={12.5} weight={fonts.bold} style={{ marginTop: 4 }}>
                You have {formatTokens(held)} ${store.ticker} ≈ {formatNaira(Math.round(tokenNaira(held)))}
              </T>
            )}
          </View>
          <Illo name="coin" size={48} />
        </Pressable>


        {/* Tabs */}
        <View style={{ marginTop: space.lg, marginHorizontal: gutter, flexDirection: "row", backgroundColor: t.surface, borderRadius: radius.pill, padding: 4 }}>
          {(["products", "about"] as Tab[]).map((k) => (
            <Pressable key={k} onPress={() => setTab(k)} style={{ flex: 1, height: 38, borderRadius: radius.pill, backgroundColor: tab === k ? t.accent : "transparent", alignItems: "center", justifyContent: "center" }}>
              <T color={tab === k ? t.onAccent : t.muted} size={13.5} weight={fonts.semibold}>
                {k === "products" ? `Products (${products.length})` : "About"}
              </T>
            </Pressable>
          ))}
        </View>

        <View style={{ marginTop: space.md, paddingHorizontal: gutter }}>
          {tab === "products" &&
            (products.length === 0 ? (
              <View style={{ backgroundColor: t.surface, borderRadius: radius.lg, padding: space.xl, alignItems: "center", gap: space.sm }}>
                <Illo name="box" size={56} />
                <T color={t.text} weight={fonts.semibold}>No products yet</T>
                <T color={t.muted} size={13.5} style={{ textAlign: "center" }}>Subscribe to hear when {store.name} adds something.</T>
              </View>
            ) : (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.md }}>
                {products.map((p) => (
                  <ProductTile key={p.id} p={p} store={store} width={tileWidth} />
                ))}
              </View>
            ))}

          {tab === "about" && (
            <View style={{ backgroundColor: t.surface, borderRadius: radius.lg, padding: space.lg, gap: space.md }}>
              <T color={t.text}>{store.about}</T>
              {[
                ["shield-checkmark", "Verified by Sotechy"],
                ["sparkles", `Token: $${store.ticker}`],
                ...(store.sells.length ? [["pricetags", store.sells.join(" · ")]] : []),
                ["bicycle", store.delivery.states.length ? `Delivers to ${store.delivery.states.join(", ")}${store.delivery.homeFrom ? `, from ${formatNaira(store.delivery.homeFrom)}` : ""}` : "Delivery areas are being set up"],
                ...(store.delivery.pickup ? [["storefront", `Pickup at ${store.delivery.pickup}`]] : []),
              ].map(([icon, text]) => (
                <View key={text} style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                  <Ionicons name={icon as "location"} size={17} color={t.accent} />
                  <T color={t.text} size={14} style={{ flex: 1 }}>{text}</T>
                </View>
              ))}
            </View>
          )}

        </View>
      </ScrollView>
    </View>
  );
}
