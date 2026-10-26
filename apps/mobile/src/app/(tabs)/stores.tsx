import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { CartButton } from "@/components/cart-button";
import { Illo } from "@/components/illustrations";
import { StoreRow } from "@/components/store-bits";
import { useTabBarInset } from "@/components/tab-bar";
import { Chip, EmptyState, Input, ScreenHeader, Txt, ui } from "@/components/ui";
import { byFeatured, STORE_KINDS, stores } from "@/lib/marketplace";

// Sotechy sells gadgets only, so it doesn't show under these
const NON_GADGET = new Set(["Fashion", "Beauty & hair", "Food & groceries", "Home & living", "Books & kids", "Sports"]);
import { colors, gutter, radius, space } from "@/lib/theme";

export default function StoresScreen() {
  const tabInset = useTabBarInset();
  const [q, setQ] = useState("");
  const params = useLocalSearchParams<{ kind?: string }>();
  const [kind, setKind] = useState<string>(params.kind ?? "");
  // The tab stays mounted: follow a type picked on Home
  useEffect(() => {
    if (params.kind !== undefined) setKind(params.kind);
  }, [params.kind]);
  const term = q.trim().toLowerCase();
  const shown = byFeatured(stores)
    .filter((s) => !kind || s.kind === kind || (s.kind === "Everything" && !NON_GADGET.has(kind)))
    .filter((s) => !term || `${s.name} ${s.tagline} ${s.ticker} ${s.city}`.toLowerCase().includes(term));

  return (
    <View style={ui.screen}>
      <ScreenHeader title="Stores" subtitle="Verified shops on Sotechy" right={<CartButton />} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: tabInset + space.lg, gap: space.lg }} keyboardShouldPersistTaps="handled">
        <Input icon="search" placeholder="Search stores, products or $TICKER" value={q} onChangeText={setQ} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }} style={{ marginHorizontal: -gutter }}>
          <View style={{ width: gutter - space.sm }} />
          <Chip label="All stores" active={!kind} onPress={() => setKind("")} />
          {STORE_KINDS.map((k) => (
            <Chip key={k} label={k} active={kind === k} onPress={() => setKind(kind === k ? "" : k)} />
          ))}
          <View style={{ width: gutter - space.sm }} />
        </ScrollView>

        {shown.length === 0 ? (
          <EmptyState illo="store" title="No stores match" message="Try another word, or clear the filter." />
        ) : (
          <View style={{ gap: space.md }}>
            <Txt variant="overline">{shown.length} stores · sample data</Txt>
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
            <Txt variant="small" color={colors.ink2}>Open your own store with its own token. Businesses and freelancers welcome.</Txt>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
