// Pieces for marketplace stores: logo, token chip, the featured card on Home and the row in the Stores tab.
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { api } from "@/lib/api";
import { formatTokens, wallet, type MarketStore, type StoreProduct } from "@/lib/marketplace";
import { colors, fonts, radius, space } from "@/lib/theme";
import { useAsync } from "@/lib/use-async";
import { Txt } from "./ui";

export const openStore = (slug: string) => router.push({ pathname: "/store/[slug]", params: { slug } });

/** How many of this store's tokens the customer holds */
export const heldTokens = (ticker: string) => wallet.balances.find((b) => b.ticker === ticker)?.amount ?? 0;

export function StoreLogo({ store, size = 52, ring }: { store: MarketStore; size?: number; ring?: string }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        backgroundColor: store.theme.accent,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        borderWidth: ring ? 3 : 0,
        borderColor: ring,
      }}
    >
      <Image source={store.logo} style={{ width: "76%", height: "76%" }} contentFit="contain" />
    </View>
  );
}

/** "Earn $XENA" in the store's own colours */
export function TokenChip({ store, label }: { store: MarketStore; label?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", backgroundColor: store.theme.accent, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3 }}>
      <Ionicons name="sparkles" size={11} color={store.theme.onAccent} />
      <Text style={{ fontFamily: fonts.bold, fontSize: 11.5, color: store.theme.onAccent }}>{label ?? `Earn $${store.ticker}`}</Text>
    </View>
  );
}

function Rating({ store, color }: { store: MarketStore; color?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Ionicons name="star" size={12} color={colors.brandYellow} />
      <Txt variant="caption" color={color ?? colors.ink2}>
        {store.rating} · {store.city}
      </Txt>
    </View>
  );
}

/** Big card for the "Stores on Sotechy" carousel on Home */
export function FeaturedStoreCard({ store, width }: { store: MarketStore; width: number }) {
  const held = heldTokens(store.ticker);
  return (
    <Pressable onPress={() => openStore(store.slug)} style={({ pressed }) => ({ width, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, overflow: "hidden", opacity: pressed ? 0.9 : 1 })}>
      <View style={{ height: 112 }}>
        <Image source={store.cover} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" />
        <LinearGradient colors={["transparent", "rgba(0,0,0,0.55)"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 70 }} />
        <View style={{ position: "absolute", top: 10, right: 10 }}>
          <TokenChip store={store} />
        </View>
      </View>
      <View style={{ position: "absolute", top: 84, left: space.md }}>
        <StoreLogo store={store} size={54} ring={colors.surface} />
      </View>
      <View style={{ paddingHorizontal: space.md, paddingTop: 32, paddingBottom: space.md, gap: 3 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Txt variant="label" numberOfLines={1} style={{ fontSize: 15.5, flexShrink: 1 }}>{store.name}</Txt>
          <Ionicons name="checkmark-circle" size={15} color={store.isSotechy ? colors.brand : "#2F6FB3"} />
        </View>
        <Txt variant="small" numberOfLines={1}>{store.tagline}</Txt>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
          <Rating store={store} />
          {held > 0 && (
            <Txt variant="caption" color={colors.brandPressed} style={{ fontFamily: fonts.bold }}>
              You have {formatTokens(held)}
            </Txt>
          )}
        </View>
      </View>
    </Pressable>
  );
}

/** One store in the Stores tab */
export function StoreRow({ store }: { store: MarketStore }) {
  const held = heldTokens(store.ticker);
  return (
    <Pressable
      onPress={() => openStore(store.slug)}
      style={({ pressed }) => ({ flexDirection: "row", gap: space.md, padding: space.md, borderRadius: radius.xl, backgroundColor: pressed ? colors.surfaceAlt : colors.surface, borderWidth: 1, borderColor: colors.line })}
    >
      <View>
        <Image source={store.cover} style={{ width: 92, height: 92, borderRadius: radius.lg }} contentFit="cover" />
        <View style={{ position: "absolute", left: -6, bottom: -6 }}>
          <StoreLogo store={store} size={40} ring={colors.surface} />
        </View>
      </View>
      <View style={{ flex: 1, gap: 3, justifyContent: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Txt variant="label" numberOfLines={1} style={{ fontSize: 15.5, flexShrink: 1 }}>{store.name}</Txt>
          <Ionicons name="checkmark-circle" size={15} color={store.isSotechy ? colors.brand : "#2F6FB3"} />
        </View>
        <Txt variant="small" numberOfLines={1}>{store.tagline}</Txt>
        <Rating store={store} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
          <TokenChip store={store} label={held > 0 ? `${formatTokens(held)} $${store.ticker}` : undefined} />
          <Txt variant="caption" numberOfLines={1} style={{ flexShrink: 1 }}>
            Delivers to {store.delivery.states.slice(0, 2).join(", ")}
            {store.delivery.states.length > 2 ? ` +${store.delivery.states.length - 2}` : ""}
          </Txt>
        </View>
      </View>
    </Pressable>
  );
}

/** A store's products: Sotechy's come from the live catalogue, the others are samples for now */
export function useStoreProducts(store: MarketStore | undefined) {
  return useAsync(async (): Promise<StoreProduct[]> => {
    if (!store) return [];
    if (!store.isSotechy) return store.products;
    const items = await api.products({ sort: "newest" });
    return items.map((p) => ({ id: p.id, name: p.name, price: p.minPrice, compareAt: p.compareAtPrice ?? undefined, image: p.imageUrl ? { uri: p.imageUrl } : store.logo, slug: p.slug }));
  }, [store?.slug]);
}
