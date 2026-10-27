import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { CartButton } from "@/components/cart-button";
import { Illo } from "@/components/illustrations";
import { StoreRow } from "@/components/store-bits";
import { useTabBarInset } from "@/components/tab-bar";
import { Chip, EmptyState, ErrorView, Input, Loading, ScreenHeader, Txt, ui } from "@/components/ui";
import { byFeatured, SOTECHY_STORE, useStores } from "@/lib/marketplace";
import { colors, gutter, radius, space } from "@/lib/theme";

// Sotechy sells gadgets and appliances, so it shows under these store types
const SOTECHY_KINDS = /phone|computer|gadget|tv|gaming|power|appliance|kitchen/i;

export default function StoresScreen() {
  const tabInset = useTabBarInset();
  const [q, setQ] = useState("");
  const params = useLocalSearchParams<{ kind?: string }>();
  const [kind, setKind] = useState<string>(params.kind ?? "");
  const { stores, error, loading, reload } = useStores();
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
  if (kind && !kinds.includes(kind)) kinds.unshift(kind);
  const term = q.trim().toLowerCase();
  const shown = all
    .filter((s) => !kind || s.sells.includes(kind) || (s.isSotechy && SOTECHY_KINDS.test(kind)))
    .filter((s) => !term || `${s.name} ${s.tagline} ${s.ticker} ${s.sells.join(" ")}`.toLowerCase().includes(term));

  return (
    <View style={ui.screen}>
      <ScreenHeader title="Stores" subtitle="Verified shops on Sotechy" right={<CartButton />} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: tabInset + space.lg, gap: space.lg }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => reload()} tintColor={colors.brand} />}
      >
        <Input icon="search" placeholder="Search stores or $TICKER" value={q} onChangeText={setQ} />

        {kinds.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }} style={{ marginHorizontal: -gutter }}>
            <View style={{ width: gutter - space.sm }} />
            <Chip label="All stores" active={!kind} onPress={() => setKind("")} />
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
            {shown.map((s) => (
              <StoreRow key={s.slug} store={s} />
            ))}
          </View>
        )}

        {/* Selling on Sotechy */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg, borderRadius: radius.xl, backgroundColor: colors.brandSoft }}>
          <Illo name="store" size={44} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="label">Sell on Sotechy</Txt>
            <Txt variant="small" color={colors.ink2}>Open your own store with its own token at merchant.sotechy.shop. Businesses and freelancers welcome.</Txt>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
