// Every price the customer is negotiating, and agreed prices they can still buy at.
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { formatNaira, type OfferStatus } from "@sotechy/shared";
import { ProductImage } from "@/components/product-image";
import { Chip, EmptyState, ErrorView, Loading, Pill, Txt, ui } from "@/components/ui";
import { api } from "@/lib/api";
import { timeLeft } from "@/lib/marketplace";
import { colors, gutter, radius, space } from "@/lib/theme";
import { useAsync } from "@/lib/use-async";

export const OFFER_LABEL: Record<OfferStatus, { label: string; tone: "warning" | "brand" | "success" | "neutral" }> = {
  waiting_store: { label: "Waiting for the store", tone: "warning" },
  waiting_customer: { label: "Store replied", tone: "brand" },
  agreed: { label: "Price agreed", tone: "success" },
  used: { label: "Bought", tone: "neutral" },
  declined: { label: "Closed", tone: "neutral" },
  expired: { label: "Expired", tone: "neutral" },
};

/** Still open (waiting, replied, or agreed and buyable), bought at the agreed price, or over */
const TABS: { id: "pending" | "used" | "closed"; label: string; statuses: OfferStatus[]; empty: string }[] = [
  { id: "pending", label: "Pending", statuses: ["waiting_store", "waiting_customer", "agreed"], empty: "Offers you're still talking about, and prices you can still buy at, show here." },
  { id: "used", label: "Used", statuses: ["used"], empty: "Offers you bought at the agreed price show here." },
  { id: "closed", label: "Closed", statuses: ["declined", "expired"], empty: "Declined and expired offers show here." },
];

export default function OffersScreen() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("pending");
  const offers = useAsync(() => api.offers(), [], { live: true });
  useFocusEffect(
    useCallback(() => {
      offers.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );
  if (offers.loading && !offers.data) return <Loading />;
  if (offers.error && !offers.data) return <ErrorView message={offers.error} onRetry={offers.reload} />;
  const all = offers.data ?? [];
  const current = TABS.find((t) => t.id === tab)!;
  const list = all.filter((o) => current.statuses.includes(o.status));

  return (
    <ScrollView
      style={ui.screen}
      contentContainerStyle={{ padding: gutter, gap: space.md, paddingBottom: space.xxl * 2 }}
      refreshControl={<RefreshControl refreshing={offers.loading} onRefresh={offers.reload} tintColor={colors.brand} />}
    >
      <View style={{ flexDirection: "row", gap: space.sm }}>
        {TABS.map((t) => {
          const n = all.filter((o) => t.statuses.includes(o.status)).length;
          return <Chip key={t.id} label={n ? `${t.label} (${n})` : t.label} active={tab === t.id} onPress={() => setTab(t.id)} />;
        })}
      </View>
      {all.length === 0 ? (
        <EmptyState illo="tag" title="No offers yet" message="Look for “Make an offer” on products from stores that take offers." />
      ) : list.length === 0 ? (
        <Txt variant="small" style={{ textAlign: "center", paddingVertical: space.xl }}>{current.empty}</Txt>
      ) : (
        list.map((o) => (
          <Pressable key={o.id} onPress={() => router.push({ pathname: "/offer/[id]", params: { id: o.id } })} style={({ pressed }) => [ui.card, { flexDirection: "row", gap: space.md, alignItems: "center", opacity: pressed ? 0.85 : 1 }]}>
            <View style={{ width: 56, height: 56, borderRadius: radius.md, overflow: "hidden" }}>
              <ProductImage uri={o.product.image} name={o.product.name} style={{ flex: 1 }} padding={6} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Txt variant="label" numberOfLines={1}>{o.product.name}</Txt>
              <Txt variant="caption">{o.store.name}</Txt>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <Pill label={OFFER_LABEL[o.status].label} tone={OFFER_LABEL[o.status].tone} />
                {o.status === "agreed" && o.agreedUntil ? <Txt variant="caption" color={colors.success}>{timeLeft(o.agreedUntil)}</Txt> : null}
              </View>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Txt variant="price">{formatNaira(o.agreedPrice ?? o.lastAmount)}</Txt>
              <Txt variant="caption" style={{ textDecorationLine: "line-through" }}>{formatNaira(o.listPrice)}</Txt>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.faint} />
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}
