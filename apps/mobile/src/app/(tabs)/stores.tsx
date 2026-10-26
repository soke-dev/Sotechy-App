import { useState } from "react";
import { ScrollView, View } from "react-native";
import { CartButton } from "@/components/cart-button";
import { Illo } from "@/components/illustrations";
import { StoreRow } from "@/components/store-bits";
import { useTabBarInset } from "@/components/tab-bar";
import { Chip, EmptyState, Input, ScreenHeader, Txt, ui } from "@/components/ui";
import { STORE_KINDS, stores } from "@/lib/marketplace";
import { colors, gutter, radius, space } from "@/lib/theme";

export default function StoresScreen() {
  const tabInset = useTabBarInset();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<string>("");
  const term = q.trim().toLowerCase();
  const shown = stores
    .filter((s) => !kind || s.kind === kind || s.kind === "Everything")
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
