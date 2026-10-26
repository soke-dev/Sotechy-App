import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { CartButton } from "@/components/cart-button";
import { Illo } from "@/components/illustrations";
import { StoreRow } from "@/components/store-bits";
import { useTabBarInset } from "@/components/tab-bar";
import { Chip, EmptyState, Input, ScreenHeader, Txt, ui } from "@/components/ui";
import { formatNaira } from "@sotechy/shared";
import { STORE_KINDS, stores, tokenNaira, wallet } from "@/lib/marketplace";
import { colors, fonts, gutter, radius, space } from "@/lib/theme";

export default function StoresScreen() {
  const tabInset = useTabBarInset();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<string>("");
  const term = q.trim().toLowerCase();
  const shown = stores
    .filter((s) => !kind || s.kind === kind || s.kind === "Everything")
    .filter((s) => !term || `${s.name} ${s.tagline} ${s.ticker} ${s.city}`.toLowerCase().includes(term));
  const spendable = wallet.balances.reduce((n, b) => n + tokenNaira(b.amount), 0);

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

        {/* Your tokens, one tap from every store */}
        <Pressable
          onPress={() => router.push("/wallet")}
          style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md, borderRadius: radius.xl, backgroundColor: pressed ? colors.panelPressed : colors.panel })}
        >
          <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" }}>
            <Illo name="coin" size={32} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="caption" color="rgba(255,255,255,0.6)">Your store tokens</Txt>
            <Txt variant="label" color={colors.white} style={{ fontSize: 15 }}>
              ≈ {formatNaira(Math.round(spendable))} to spend
            </Txt>
          </View>
          <Txt variant="caption" color={colors.brandYellow} style={{ fontFamily: fonts.bold }}>Wallet</Txt>
          <Ionicons name="chevron-forward" size={16} color={colors.brandYellow} />
        </Pressable>

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
