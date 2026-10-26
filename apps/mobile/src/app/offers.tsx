// Every price the customer is negotiating, and deals they can still buy at.
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { formatNaira } from "@sotechy/shared";
import { EmptyState, Pill, Txt, ui } from "@/components/ui";
import { findProduct, storeBySlug, tileColor, timeLeft } from "@/lib/marketplace";
import { statusOf, useOffers } from "@/lib/offers";
import { colors, gutter, radius, space } from "@/lib/theme";

const LABEL = {
  waiting_store: { label: "Waiting for the store", tone: "warning" as const },
  countered: { label: "Store replied", tone: "brand" as const },
  agreed: { label: "Deal agreed", tone: "success" as const },
  declined: { label: "Closed", tone: "neutral" as const },
  expired: { label: "Expired", tone: "neutral" as const },
};

export default function OffersScreen() {
  const { threads } = useOffers();
  return (
    <ScrollView style={ui.screen} contentContainerStyle={{ padding: gutter, gap: space.md, paddingBottom: space.xxl * 2 }}>
      {threads.length === 0 ? (
        <EmptyState illo="tag" title="No offers yet" message="Look for “Make an offer” on products in a store's page." />
      ) : (
        threads.map((t) => {
          const store = storeBySlug(t.store);
          const product = findProduct(t.store, t.productId);
          if (!store || !product) return null;
          const status = statusOf(t);
          const last = [...t.messages].reverse().find((m) => m.amount)?.amount;
          return (
            <Pressable key={t.id} onPress={() => router.push({ pathname: "/offer/[id]", params: { id: t.id } })} style={({ pressed }) => [ui.card, { flexDirection: "row", gap: space.md, alignItems: "center", opacity: pressed ? 0.85 : 1 }]}>
              <View style={{ width: 56, height: 56, borderRadius: radius.md, backgroundColor: tileColor(store.theme), alignItems: "center", justifyContent: "center" }}>
                <Image source={product.image} style={{ width: "78%", height: "78%" }} contentFit="contain" />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Txt variant="label" numberOfLines={1}>{product.name}</Txt>
                <Txt variant="caption">{store.name}</Txt>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <Pill label={LABEL[status].label} tone={LABEL[status].tone} />
                  {status === "agreed" && t.expiresAt ? <Txt variant="caption" color={colors.success}>{timeLeft(new Date(t.expiresAt).toISOString())}</Txt> : null}
                </View>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Txt variant="price">{formatNaira(t.agreedPrice ?? last ?? product.price)}</Txt>
                <Txt variant="caption" style={{ textDecorationLine: "line-through" }}>{formatNaira(product.price)}</Txt>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.faint} />
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}
