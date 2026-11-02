import { useStoreNotifications } from "@/lib/store-notifications";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Linking, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { CartButton } from "@/components/cart-button";
import { Illo } from "@/components/illustrations";
import { StoreRow } from "@/components/store-bits";
import { useTabBarInset } from "@/components/tab-bar";
import { Chip, EmptyState, ErrorView, Input, Loading, ScreenHeader, Txt, ui } from "@/components/ui";
import { byFeatured, SOTECHY_STORE, useStores } from "@/lib/marketplace";
import { colors, gutter, radius, space } from "@/lib/theme";
import { useContentWidth, useIsDesktop } from "@/lib/layout";

/** Where stores sign up and run their shop */
const MERCHANT_SITE = "https://merchant.sotechy.shop";
// In the phone's own browser (a new tab on the web), outside the app
const openMerchantSite = () => Linking.openURL(MERCHANT_SITE).catch(() => null);

/** "Sell on Sotechy" at the top of Stores, so it's there however many stores there are */
function SellButton() {
  return (
    <Pressable
      onPress={openMerchantSite}
      accessibilityRole="link"
      accessibilityLabel="Sell on Sotechy"
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 6, height: 40, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: pressed ? colors.inversePressed : colors.inverse })}
    >
      <Ionicons name="storefront" size={16} color={colors.brand} />
      <Txt variant="label" color={colors.onInverse} style={{ fontSize: 13.5 }}>Sell</Txt>
    </Pressable>
  );
}

// Sotechy sells gadgets and appliances, so it shows under these store types
const SOTECHY_KINDS = /phone|computer|gadget|tv|gaming|power|appliance|kitchen/i;

export default function StoresScreen() {
  const desktop = useIsDesktop();
  const contentWidth = useContentWidth();
  const tabInset = useTabBarInset();
  const [q, setQ] = useState("");
  const params = useLocalSearchParams<{ kind?: string }>();
  const [kind, setKind] = useState<string>(params.kind ?? "");
  const { stores, error, loading, reload } = useStores();
  const { favourites } = useStoreNotifications();
  const SAVED = "__saved";
  // The tab stays mounted: follow a type picked on Home
  useEffect(() => {
    if (params.kind !== undefined) setKind(params.kind);
  }, [params.kind]);

  if (loading) return <Loading />;
  if (error || !stores) return <ErrorView message={error ?? "Could not load stores"} onRetry={reload} />;

  const all = [SOTECHY_STORE, ...byFeatured(stores)];
  // Store types that have stores, most common first
  const counts = new Map<string, number>();
  for (const s of stores) for (const k of s.sells) counts.set(k, (counts.get(k) ?? 0) + 1);
  const kinds = [...counts].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  if (kind && kind !== SAVED && !kinds.includes(kind)) kinds.unshift(kind);
  const term = q.trim().toLowerCase();
  const shown = all
    .filter((s) => !kind || (kind === SAVED ? favourites.includes(s.slug) : s.sells.includes(kind) || (s.isSotechy && SOTECHY_KINDS.test(kind))))
    .filter((s) => !term || `${s.name} ${s.tagline} ${s.ticker} ${s.sells.join(" ")}`.toLowerCase().includes(term));

  return (
    <View style={ui.screen}>
      <ScreenHeader title="Stores" subtitle="Verified shops on Sotechy" right={<View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}><SellButton /><CartButton /></View>} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: tabInset + space.lg, gap: space.lg }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => reload()} tintColor={colors.brand} />}
      >
        <Input icon="search" placeholder="Search stores or $TICKER" value={q} onChangeText={setQ} />

        {(kinds.length > 0 || favourites.length > 0) && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }} style={{ marginHorizontal: -gutter }}>
            <View style={{ width: gutter - space.sm }} />
            <Chip label="All stores" active={!kind} onPress={() => setKind("")} />
            {favourites.length > 0 && <Chip label={`♥ Saved (${favourites.length})`} active={kind === SAVED} onPress={() => setKind(kind === SAVED ? "" : SAVED)} />}
            {kinds.map((k) => (
              <Chip key={k} label={k} active={kind === k} onPress={() => setKind(kind === k ? "" : k)} />
            ))}
            <View style={{ width: gutter - space.sm }} />
          </ScrollView>
        )}

        {shown.length === 0 ? (
          <EmptyState illo="store" title="No stores match" message={kind ? "No store sells this yet. Try another type." : "Try another word."} />
        ) : (
          <View style={{ gap: space.md }}>
            <Txt variant="overline">
              {shown.length} store{shown.length === 1 ? "" : "s"}
            </Txt>
            {/* Two across on desktop */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.md }}>
              {shown.map((s) => (
                <View key={s.slug} style={{ width: desktop ? (contentWidth - gutter * 2 - space.md) / 2 : "100%" }}>
                  <StoreRow store={s} />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Selling on Sotechy */}
        <Pressable
          onPress={openMerchantSite}
          accessibilityRole="link"
          style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg, borderRadius: radius.xl, backgroundColor: colors.brandSoft, opacity: pressed ? 0.85 : 1 })}
        >
          <Illo name="store" size={44} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="label">Sell on Sotechy</Txt>
            <Txt variant="small" color={colors.ink2}>Open your own store with its own token. Businesses and freelancers welcome.</Txt>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 14, height: 38, borderRadius: radius.pill, backgroundColor: colors.inverse }}>
            <Txt variant="label" color={colors.onInverse} style={{ fontSize: 13 }}>Start selling</Txt>
            <Ionicons name="arrow-forward" size={14} color={colors.onInverse} />
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
}
