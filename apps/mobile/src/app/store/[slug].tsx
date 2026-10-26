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
import { heldTokens, StoreLogo, useStoreProducts } from "@/components/store-bits";
import { useToast } from "@/components/toast";
import { Sheet } from "@/components/shop-filters";
import { Button, EmptyState, IconButton, Loading, tap } from "@/components/ui";
import { CROSS_BONUS, formatTokens, storeBySlug, tokenNaira, type MarketStore, type StoreProduct } from "@/lib/marketplace";
import { useOffers } from "@/lib/offers";
import { useStoreNotifications } from "@/lib/store-notifications";
import { colors, fonts, gutter, radius, space } from "@/lib/theme";

type Tab = "products" | "about" | "reviews";

const REVIEWS = [
  { name: "Chidi O.", stars: 5, text: "Came the next day, well packed. Phone works perfectly.", photo: true, ago: "2 days ago" },
  { name: "Amaka N.", stars: 4, text: "Good price and they called before delivery. Box was a bit dented.", photo: false, ago: "1 week ago" },
  { name: "Tunde B.", stars: 5, text: "Picked it up myself, very friendly staff. Will buy again.", photo: true, ago: "3 weeks ago" },
];

function T({ children, color, size = 15, weight = fonts.body, style, lines }: { children: React.ReactNode; color: string; size?: number; weight?: string; style?: object; lines?: number }) {
  return (
    <Text numberOfLines={lines} style={[{ color, fontSize: size, fontFamily: weight, lineHeight: size * 1.35 }, style]}>
      {children}
    </Text>
  );
}

function ProductTile({ p, store, width, onOpen }: { p: StoreProduct; store: MarketStore; width: number; onOpen: (p: StoreProduct) => void }) {
  const t = store.theme;
  return (
    <Pressable
      onPress={() => {
        tap();
        if (p.slug) router.push({ pathname: "/product/[id]", params: { id: p.slug } });
        else onOpen(p);
      }}
      style={({ pressed }) => ({ width, borderRadius: radius.lg, backgroundColor: t.surface, overflow: "hidden", opacity: pressed ? 0.9 : 1 })}
    >
      <View style={{ aspectRatio: 1, backgroundColor: t.accent, alignItems: "center", justifyContent: "center" }}>
        <View style={{ position: "absolute", width: "64%", height: "64%", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.22)" }} />
        <Image source={p.image} style={{ width: "74%", height: "74%" }} contentFit="contain" />
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

function OfferPanel({ store, product, onGo }: { store: MarketStore; product: StoreProduct; onGo: () => void }) {
  const offers = useOffers();
  const open = offers.forProduct(store.slug, product.id);
  return (
    <View style={{ gap: space.sm, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.brandSoft }}>
      <Text style={{ fontFamily: fonts.bold, fontSize: 14.5, color: colors.ink }}>{open ? "You're negotiating this" : "The price is negotiable"}</Text>
      <Text style={{ fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.ink2 }}>
        Offer {store.name} a price. If they agree, it&apos;s held for you only, for up to {product.negotiable?.hours ?? 12} hours.
      </Text>
      <Button
        title={open ? "See your offer" : "Make an offer"}
        icon="pricetag"
        variant="dark"
        onPress={() => {
          onGo();
          router.push(open ? { pathname: "/offer/[id]", params: { id: open.id } } : { pathname: "/offer/[id]", params: { id: "new", store: store.slug, product: product.id } });
        }}
      />
    </View>
  );
}

export default function StoreScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const store = storeBySlug(slug ?? "");
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<Tab>("products");
  const subs = useStoreNotifications();
  const products = useStoreProducts(store);
  const toast = useToast();
  const [picked, setPicked] = useState<StoreProduct | null>(null);

  if (!store) return <EmptyState illo="store" title="Store not found" message="It may have closed or changed its link." />;

  const t = store.theme;
  const following = subs.isSubscribed(store.slug);
  const held = heldTokens(store.ticker);
  const tileWidth = (Math.min(width, 720) - gutter * 2 - space.md) / 2;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl }} showsVerticalScrollIndicator={false}>
        {/* Cover */}
        <View style={{ height: 210 + insets.top }}>
          <Image source={store.cover} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" />
          <LinearGradient colors={["rgba(0,0,0,0.45)", "transparent", "rgba(0,0,0,0.5)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
          <View style={{ paddingTop: insets.top + space.sm, paddingHorizontal: gutter, flexDirection: "row", justifyContent: "space-between" }}>
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
              <T color={t.text} size={13} weight={fonts.bold}>{store.rating}</T>
              <T color={t.muted} size={13}>({store.reviews.toLocaleString()})</T>
            </View>
            <T color={t.muted} size={13}>{(store.followers + (following ? 1 : 0)).toLocaleString()} subscribers</T>
            <T color={t.muted} size={13}>{store.city}</T>
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
            <Pressable style={{ height: 44, paddingHorizontal: space.lg, borderRadius: radius.pill, borderWidth: 1.5, borderColor: t.dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.12)", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }}>
              <Ionicons name="logo-whatsapp" size={17} color={t.text} />
              <T color={t.text} weight={fonts.semibold}>Chat</T>
            </Pressable>
          </View>
        </View>

        {/* Earn this store's token */}
        <Pressable
          onPress={() => router.push("/wallet")}
          style={{ marginTop: space.md, marginHorizontal: gutter, borderRadius: radius.xl, padding: space.lg, backgroundColor: t.hero, flexDirection: "row", alignItems: "center", gap: space.md, overflow: "hidden" }}
        >
          <View style={{ position: "absolute", right: -30, top: -40, width: 120, height: 120, borderRadius: 60, backgroundColor: t.accent, opacity: 0.9 }} />
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

        {store.announcement ? (
          <View style={{ marginTop: space.md, marginHorizontal: gutter, borderRadius: radius.lg, paddingVertical: 10, paddingHorizontal: space.md, backgroundColor: t.accent, flexDirection: "row", alignItems: "center", gap: space.sm }}>
            <Ionicons name="megaphone" size={15} color={t.onAccent} />
            <T color={t.onAccent} size={13} weight={fonts.semibold} style={{ flex: 1 }}>{store.announcement}</T>
          </View>
        ) : null}

        {/* Delivery */}
        <View style={{ marginTop: space.md, marginHorizontal: gutter, borderRadius: radius.lg, padding: space.md, backgroundColor: t.surface, gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
            <Ionicons name="bicycle" size={18} color={t.accent} />
            <T color={t.text} size={13.5} weight={fonts.semibold} style={{ flex: 1 }}>
              Delivers to {store.delivery.states.join(", ")}
            </T>
          </View>
          <T color={t.muted} size={12.5}>
            Home delivery from {formatNaira(store.delivery.homeFrom)}
            {store.delivery.pickup ? ` · Pickup at ${store.delivery.pickup}` : ""}
          </T>
        </View>

        {/* Tabs */}
        <View style={{ marginTop: space.lg, marginHorizontal: gutter, flexDirection: "row", backgroundColor: t.surface, borderRadius: radius.pill, padding: 4 }}>
          {(["products", "about", "reviews"] as Tab[]).map((k) => (
            <Pressable key={k} onPress={() => setTab(k)} style={{ flex: 1, height: 38, borderRadius: radius.pill, backgroundColor: tab === k ? t.accent : "transparent", alignItems: "center", justifyContent: "center" }}>
              <T color={tab === k ? t.onAccent : t.muted} size={13.5} weight={fonts.semibold}>
                {k === "products" ? `Products${products.data ? ` (${products.data.length})` : ""}` : k === "about" ? "About" : "Reviews"}
              </T>
            </Pressable>
          ))}
        </View>

        <View style={{ marginTop: space.md, paddingHorizontal: gutter }}>
          {tab === "products" &&
            (products.loading && !products.data ? (
              <View style={{ height: 200 }}>
                <Loading />
              </View>
            ) : (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.md }}>
                {(products.data ?? []).map((p) => (
                  <ProductTile key={p.id} p={p} store={store} width={tileWidth} onOpen={setPicked} />
                ))}
              </View>
            ))}

          {tab === "about" && (
            <View style={{ backgroundColor: t.surface, borderRadius: radius.lg, padding: space.lg, gap: space.md }}>
              <T color={t.text}>{store.about}</T>
              {[
                ["shield-checkmark", `Verified by Sotechy${store.isSotechy ? "" : ` · selling for ${store.sinceMonths} month${store.sinceMonths === 1 ? "" : "s"}`}`],
                ["sparkles", `Token: $${store.ticker}`],
                ["location", store.city],
                ["bicycle", `Delivers to ${store.delivery.states.join(", ")}`],
                ...(store.delivery.pickup ? [["storefront", `Pickup at ${store.delivery.pickup}`]] : []),
              ].map(([icon, text]) => (
                <View key={text} style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                  <Ionicons name={icon as "location"} size={17} color={t.accent} />
                  <T color={t.text} size={14} style={{ flex: 1 }}>{text}</T>
                </View>
              ))}
            </View>
          )}

          {tab === "reviews" && (
            <View style={{ gap: space.md }}>
              {REVIEWS.map((r) => (
                <View key={r.name} style={{ backgroundColor: t.surface, borderRadius: radius.lg, padding: space.lg, gap: 6 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Ionicons key={i} name={i <= r.stars ? "star" : "star-outline"} size={14} color="#FDB913" />
                    ))}
                    <T color={t.muted} size={12} style={{ marginLeft: 6 }}>{r.name} · {r.ago}</T>
                  </View>
                  <T color={t.text} size={14}>{r.text}</T>
                  {r.photo && <T color={t.dark ? t.accent : t.muted} size={12} weight={fonts.semibold}>Photo review · earned a 10% ${store.ticker} bonus</T>}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
      {/* A sample store's product: details and making an offer */}
      <Sheet visible={picked !== null} title={picked?.name ?? ""} onClose={() => setPicked(null)}>
        {picked && (
          <View style={{ gap: space.md }}>
            <View style={{ aspectRatio: 1.4, borderRadius: radius.xl, backgroundColor: t.accent, alignItems: "center", justifyContent: "center" }}>
              <Image source={picked.image} style={{ width: "62%", height: "80%" }} contentFit="contain" />
            </View>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
              <Text style={{ fontFamily: fonts.displayHeavy, fontSize: 28, color: colors.ink }}>{formatNaira(picked.price)}</Text>
              {picked.compareAt && picked.compareAt > picked.price ? <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.faint, textDecorationLine: "line-through" }}>{formatNaira(picked.compareAt)}</Text> : null}
            </View>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 13.5, color: colors.brandPressed }}>
              Earn {formatTokens(picked.price)} ${store.ticker}
              {store.isSotechy ? "" : ` + ${formatTokens(Math.round(picked.price * CROSS_BONUS))} $SOTECHY`}
            </Text>
            {picked.negotiable ? <OfferPanel store={store} product={picked} onGo={() => setPicked(null)} /> : null}
            <Button title="Add to cart" variant="outline" icon="bag-add-outline" onPress={() => toast("Sample store: buying opens when the marketplace goes live")} />
          </View>
        )}
      </Sheet>
    </View>
  );
}
