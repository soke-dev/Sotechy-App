// A merchant's storefront, drawn in the store's own theme (chosen in the merchant dashboard).
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatNaira } from "@sotechy/shared";
import { CartButton } from "@/components/cart-button";
import { Illo } from "@/components/illustrations";
import { openProduct, StoreLogo } from "@/components/store-bits";
import { useHeldTokens } from "@/lib/held-tokens";
import { EmptyState, ErrorView, IconButton, Loading, tap } from "@/components/ui";
import { formatTokens, isOfficialStore, loadStore, tileColor, type MarketStore, type StoreProduct } from "@/lib/marketplace";
import { ProductArt, StoreCover } from "@/components/store-brand";
import { useExternalLink } from "@/components/external-link";
import { StoreBadgeSheet } from "@/components/store-badge-sheet";
import { useStoreNotifications } from "@/lib/store-notifications";
import { fonts, gutter, radius, space } from "@/lib/theme";
import { useGrid, useScreenWidth } from "@/lib/layout";
import { useAsync } from "@/lib/use-async";
import { shareStore } from "@/lib/share";
import { useToast } from "@/components/toast";

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

// Delivery times stores choose from, fastest first
const TIMES = ["Same day", "Same day – 1 day", "1–2 days", "2–3 days", "3–5 days", "5–7 days"];
const fastest = (store: MarketStore) => store.areas.map((a) => a.days).sort((a, b) => TIMES.indexOf(a) - TIMES.indexOf(b))[0] ?? null;

/** One column of the delivery / time / rating strip */
function Fact({ label, children, color, muted, divider }: { label: string; children: React.ReactNode; color: string; muted: string; divider?: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 4, paddingVertical: space.md, borderLeftWidth: divider ? 1 : 0, borderLeftColor: divider }}>
      <T color={muted} size={12}>{label}</T>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>{children}</View>
    </View>
  );
}

const SOCIAL_ICON = { instagram: "logo-instagram", x: "logo-x", facebook: "logo-facebook", tiktok: "logo-tiktok", website: "globe-outline" } as const;

/** "Lead first, second +3": the first few items, with the rest one tap away */
function MoreRow({ icon, lead, items, shown, tail = "", t }: { icon: "bicycle" | "storefront"; lead: string; items: string[]; shown: number; tail?: string; t: { text: string; accent: string; muted: string; accentSoft?: string } }) {
  const [open, setOpen] = useState(false);
  const more = items.length - shown;
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: space.sm }}>
      <Ionicons name={icon} size={17} color={t.accent} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
          <T color={t.text} size={14} style={{ flexShrink: 1 }}>
            {lead}
            {(open ? items : items.slice(0, shown)).join(icon === "storefront" && open ? " · " : ", ")}
            {tail}
          </T>
          {more > 0 && (
            <Pressable
              onPress={() => {
                tap();
                setOpen(!open);
              }}
              hitSlop={6}
              accessibilityLabel={open ? "Show fewer" : `Show ${more} more`}
              style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1, borderColor: t.accent }}
            >
              <T color={t.accent} size={12.5} weight={fonts.bold}>{open ? "Less" : `+${more}`}</T>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

export default function StoreScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const loaded = useAsync(() => loadStore(slug ?? ""), [slug]);
  // A store's socials are outside websites: ask before leaving the app
  const external = useExternalLink();
  const toast = useToast();
  const [badgeOpen, setBadgeOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const width = useScreenWidth();
  const { cardWidth: tileWidth } = useGrid();
  const [tab, setTab] = useState<Tab>("products");
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const subs = useStoreNotifications();
  const held = useHeldTokens(loaded.data?.ticker ?? "");

  if (loaded.loading && !loaded.data) return <Loading />;
  if (loaded.error) return <ErrorView message={loaded.error} onRetry={loaded.reload} />;
  const store = loaded.data;
  // Where it delivers to the door (states with a home price), and every pickup point it has
  const homeStates = store ? (store.areas.length ? [...new Set(store.areas.filter((a) => a.homeFee != null).map((a) => a.state))] : store.delivery.homeFrom != null ? store.delivery.states : []) : [];
  const pickupSpots = store
    ? store.areas.length
      ? [...new Set(store.areas.flatMap((a) => (a.pickupPlaces?.length ? a.pickupPlaces.map((pl) => [pl.name, pl.address].filter(Boolean).join(", ")) : a.pickupPoint ? [[a.pickupPoint, a.pickupAddress].filter(Boolean).join(", ")] : [])))]
      : store.delivery.pickup
        ? store.delivery.pickup.split(" · ")
        : []
    : [];
  if (!store) return <EmptyState illo="store" title="Store not found" message="It may have closed or changed its link." />;
  const q = query.trim().toLowerCase();
  const products = q ? store.products.filter((p) => p.name.toLowerCase().includes(q)) : store.products;

  const t = store.theme;
  const share = async () => {
    tap();
    if ((await shareStore(store)) === "copied") toast("Store link copied");
  };
  const following = subs.isSubscribed(store.slug);
  const favourite = subs.isFavourite(store.slug);
  const time = fastest(store);

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

        {/* Cover, with back on the left and favourite, search and cart on the right */}
        <View style={{ height: 200 + (store.announcement ? 0 : insets.top) }}>
          <StoreCover store={store} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
          <LinearGradient colors={["rgba(0,0,0,0.4)", "transparent"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 110 }} />
          <View style={{ paddingTop: (store.announcement ? 0 : insets.top) + space.sm, paddingHorizontal: gutter, flexDirection: "row", alignItems: "center", gap: space.sm }}>
            <IconButton icon="arrow-back" tone="glass" onPress={() => (router.canGoBack() ? router.back() : router.replace("/stores"))} />
            <View style={{ flex: 1 }} />
            {!store.isSotechy && (
              <Pressable
                onPress={() => {
                  tap();
                  subs.toggleFavourite(store.slug);
                }}
                accessibilityLabel={favourite ? "Remove from favourites" : "Add to favourites"}
                style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name={favourite ? "heart" : "heart-outline"} size={21} color={favourite ? "#E5484D" : "#17120E"} />
              </Pressable>
            )}
            <IconButton
              icon="search"
              tone="glass"
              onPress={() => {
                setSearching(!searching);
                setQuery("");
                setTab("products");
              }}
            />
            <IconButton icon="share-social-outline" tone="glass" onPress={share} />
            <CartButton />
          </View>
          {/* Its socials at the bottom left (wrapping upwards before they reach the logo) */}
          {store.socials?.length ? (
            <View style={{ position: "absolute", left: gutter, bottom: 10, maxWidth: width / 2 - 44 - gutter - 8, flexDirection: "row", flexWrap: "wrap-reverse", gap: 6 }}>
              {store.socials.map((sc) => (
                <Pressable
                  key={sc.kind}
                  onPress={() => external.open(sc.url)}
                  accessibilityLabel={sc.kind === "website" ? "Website" : sc.kind === "x" ? "X" : sc.kind[0].toUpperCase() + sc.kind.slice(1)}
                  hitSlop={4}
                  style={({ pressed }) => ({ width: 32, height: 32, borderRadius: 16, backgroundColor: pressed ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center" })}
                >
                  <Ionicons name={SOCIAL_ICON[sc.kind]} size={16} color="#17120E" />
                </Pressable>
              ))}
            </View>
          ) : null}
          {/* Bottom right: your balance of the store's token, and the bell for its updates */}
          <View style={{ position: "absolute", right: gutter, bottom: 10, maxWidth: width / 2 - 44 - gutter - 8, flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Pressable
              onPress={() => router.push("/wallet")}
              accessibilityLabel={`Your $${store.ticker}: ${formatTokens(held)}`}
              style={({ pressed }) => ({ height: 32, borderRadius: 16, backgroundColor: pressed ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.92)", paddingLeft: 3, paddingRight: 10, flexDirection: "row", alignItems: "center", gap: 4 })}
            >
              <Illo name="coin" size={26} />
              <T color="#17120E" size={13} weight={fonts.bold}>{formatTokens(held)}</T>
            </Pressable>
            <Pressable
              onPress={() => {
                tap();
                subs.toggle(store.slug);
              }}
              accessibilityLabel={following ? "Subscribed to updates. Tap to stop" : "Get this store's updates"}
              accessibilityState={{ selected: following }}
              hitSlop={4}
              style={({ pressed }) => ({
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: following ? t.accent : pressed ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.92)",
                borderWidth: following ? 2 : 0,
                borderColor: "#FFFFFF",
                alignItems: "center",
                justifyContent: "center",
              })}
            >
              <Ionicons name={following ? "notifications" : "notifications-outline"} size={16} color={following ? t.onAccent : "#17120E"} />
              {/* Subscribed: a tick badge on the bell */}
              {following && (
                <View style={{ position: "absolute", right: -3, bottom: -3, width: 14, height: 14, borderRadius: 7, backgroundColor: "#1C8A4C", borderWidth: 1.5, borderColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="checkmark" size={8} color="#FFFFFF" />
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {/* Logo over the cover, then the name */}
        <View style={{ alignItems: "center", marginTop: -46, paddingHorizontal: gutter, gap: 6 }}>
          <View style={{ width: 88, height: 88, borderRadius: 44, overflow: "hidden", backgroundColor: t.surface }}>
            <StoreLogo store={store} size={88} />
          </View>
          <T color={t.text} size={22} weight={fonts.displayHeavy} lines={2} style={{ textAlign: "center", letterSpacing: -0.3 }}>{store.name}</T>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            {/* Orange tick for an official store (a registered business), blue for a freelancer; tap to see what it means */}
            <Pressable
              onPress={() => {
                tap();
                setBadgeOpen(true);
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`${isOfficialStore(store) ? "Official store" : "Verified"}. What this means`}
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <Ionicons name="checkmark-circle" size={15} color={isOfficialStore(store) ? "#F7931E" : "#2F6FB3"} />
              <T color={isOfficialStore(store) ? "#E07F0C" : "#2F6FB3"} size={13.5} weight={fonts.semibold}>{isOfficialStore(store) ? "Official store" : "Verified"}</T>
              <Ionicons name="information-circle-outline" size={14} color={isOfficialStore(store) ? "#E07F0C" : "#2F6FB3"} />
            </Pressable>
            {store.delivery.states.length > 0 && (
              <>
                <View style={{ width: 1, height: 14, backgroundColor: t.muted, opacity: 0.4 }} />
                <T color={t.muted} size={13.5}>Delivers to {store.delivery.states.length === 1 ? store.delivery.states[0] : `${store.delivery.states.length} states`}</T>
              </>
            )}
          </View>
          {store.tagline ? (
            <T color={t.muted} size={13.5} lines={2} style={{ textAlign: "center" }}>
              {store.tagline}
            </T>
          ) : null}
        </View>

        {/* Delivery fee, time and rating */}
        <View style={{ marginTop: space.md, marginHorizontal: gutter, flexDirection: "row", borderRadius: radius.lg, borderWidth: 1, borderColor: t.muted + "33", backgroundColor: t.surface }}>
          <Fact label="Delivery" color={t.text} muted={t.muted}>
            <T color={t.text} size={14.5} weight={fonts.bold}>{store.delivery.homeFrom != null ? (store.delivery.homeFrom ? `From ${formatNaira(store.delivery.homeFrom)}` : "Free") : store.delivery.pickup ? "Pickup" : "—"}</T>
          </Fact>
          <Fact label="Delivery time" color={t.text} muted={t.muted} divider={t.muted + "33"}>
            <Ionicons name="time-outline" size={14} color={t.text} />
            <T color={t.text} size={14.5} weight={fonts.bold}>{time ?? "—"}</T>
          </Fact>
          <Fact label="Rating" color={t.text} muted={t.muted} divider={t.muted + "33"}>
            <Ionicons name="star" size={14} color="#FDB913" />
            <T color={t.text} size={14.5} weight={fonts.bold}>{store.rating ?? "New"}</T>
            {store.ratingCount > 0 && <T color={t.muted} size={12.5}>({store.ratingCount.toLocaleString("en-NG")})</T>}
          </Fact>
        </View>

        {searching && (
          <View style={{ marginTop: space.md, marginHorizontal: gutter, flexDirection: "row", alignItems: "center", gap: space.sm, height: 46, borderRadius: radius.pill, backgroundColor: t.surface, paddingHorizontal: space.md }}>
            <Ionicons name="search" size={17} color={t.muted} />
            <TextInput autoFocus value={query} onChangeText={setQuery} placeholder={`Search ${store.name}`} placeholderTextColor={t.muted} style={{ flex: 1, fontFamily: fonts.body, fontSize: 15, color: t.text }} />
            {query ? (
              <Pressable onPress={() => setQuery("")} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={t.muted} />
              </Pressable>
            ) : null}
          </View>
        )}

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
              ].map(([icon, text]) => (
                <View key={text} style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                  <Ionicons name={icon as "location"} size={17} color={t.accent} />
                  <T color={t.text} size={14} style={{ flex: 1 }}>{text}</T>
                </View>
              ))}
              {/* Home delivery by state, then pickup points: the first few, the rest behind "+N" */}
              {homeStates.length > 0 ? (
                <MoreRow
                  icon="bicycle"
                  lead={`Home delivery to ${homeStates.length === 1 ? "" : `${homeStates.length} states: `}`}
                  items={homeStates}
                  shown={2}
                  tail={store.delivery.homeFrom ? `, from ${formatNaira(store.delivery.homeFrom)}` : ""}
                  t={t}
                />
              ) : pickupSpots.length ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                  <Ionicons name="bicycle" size={17} color={t.accent} />
                  <T color={t.text} size={14} style={{ flex: 1 }}>Pickup only: no home delivery</T>
                </View>
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                  <Ionicons name="bicycle" size={17} color={t.accent} />
                  <T color={t.text} size={14} style={{ flex: 1 }}>Delivery areas are being set up</T>
                </View>
              )}
              {pickupSpots.length > 0 && <MoreRow icon="storefront" lead="Pickup at " items={pickupSpots} shown={1} t={t} />}
            </View>
          )}

        </View>
      </ScrollView>
      {external.sheet}
      <StoreBadgeSheet visible={badgeOpen} official={isOfficialStore(store)} storeName={store.name} onClose={() => setBadgeOpen(false)} />
    </View>
  );
}
