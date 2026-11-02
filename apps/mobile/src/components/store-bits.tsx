// Pieces for marketplace stores: logo, token chip, the featured card on Home and the row in the Stores tab.
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { formatNaira } from "@sotechy/shared";
import { Pressable, ScrollView, Text, View } from "react-native";
import { isFeatured, isOfficialStore, tileColor, type MarketStore, type StoreProduct } from "@/lib/marketplace";
import { useHeldTokens } from "@/lib/held-tokens";
import { Illo } from "./illustrations";
import { BrandMark, ProductArt, StoreCover } from "./store-brand";
import { colors, fonts, gutter, radius, space } from "@/lib/theme";
import { ScrollRow } from "./scroll-row";
import { Txt } from "./ui";

export const openStore = (slug: string) => router.push({ pathname: "/store/[slug]", params: { slug } });
/** A product's page (Sotechy's and every store's products share it) */
export const openProduct = (slug: string) => router.push({ pathname: "/product/[id]", params: { id: slug } });

/** How many of this store's tokens the customer holds */
export const heldTokens = useHeldTokens;

export function StoreLogo({ store, size = 52, ring }: { store: MarketStore; size?: number; ring?: string }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        overflow: "hidden",
        borderWidth: ring ? 3 : 0,
        borderColor: ring,
      }}
    >
      <BrandMark store={store} size={size - (ring ? 6 : 0)} />
    </View>
  );
}

/** Marks a store that paid to be featured */
export function FeaturedTag({ small }: { small?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3, alignSelf: "flex-start", backgroundColor: "rgba(23,18,14,0.82)", borderRadius: radius.pill, paddingHorizontal: small ? 6 : 8, paddingVertical: small ? 1 : 3 }}>
      <Ionicons name="star" size={small ? 9 : 11} color="#FDB913" />
      <Text style={{ fontFamily: fonts.bold, fontSize: small ? 10 : 11, color: "#FFFFFF" }}>Featured</Text>
    </View>
  );
}

/** "Earn $TOBI" in the store's own colours */
export function TokenChip({ store, label }: { store: MarketStore; label?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", backgroundColor: store.theme.accent, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3 }}>
      <Illo name="coin" size={15} />
      <Text style={{ fontFamily: fonts.bold, fontSize: 11.5, color: store.theme.onAccent }}>{label ?? `Earn $${store.ticker}`}</Text>
    </View>
  );
}

function Rating({ store, color }: { store: MarketStore; color?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Ionicons name="star" size={12} color={colors.brandYellow} />
      <Txt variant="caption" color={color ?? colors.ink2}>
        {store.isSotechy ? "Official store · Benin City" : `${isOfficialStore(store) ? "Official store · " : ""}${store.rating ?? "New"} · ${store.productCount} product${store.productCount === 1 ? "" : "s"}`}
      </Txt>
    </View>
  );
}

/** Big card for the "Stores on Sotechy" carousel on Home */
export function FeaturedStoreCard({ store, width }: { store: MarketStore; width: number }) {
  return (
    <Pressable onPress={() => openStore(store.slug)} style={({ pressed }) => ({ width, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, overflow: "hidden", opacity: pressed ? 0.9 : 1 })}>
      <View style={{ height: 72 }}>
        <StoreCover store={store} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
        <LinearGradient colors={["transparent", "rgba(0,0,0,0.45)"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 44 }} />
        <View style={{ position: "absolute", top: 8, right: 8 }}>
          <TokenChip store={store} />
        </View>
        {isFeatured(store) && (
          <View style={{ position: "absolute", top: 8, left: 8 }}>
            <FeaturedTag />
          </View>
        )}
      </View>
      <View style={{ position: "absolute", top: 50, left: space.md }}>
        <StoreLogo store={store} size={44} />
      </View>
      <View style={{ paddingHorizontal: space.md, paddingTop: 26, paddingBottom: space.sm + 2, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Txt variant="label" numberOfLines={1} style={{ fontSize: 15.5, flexShrink: 1 }}>{store.name}</Txt>
          <Ionicons name="checkmark-circle" size={15} color={isOfficialStore(store) ? colors.brand : "#2F6FB3"} />
        </View>
        <Txt variant="small" numberOfLines={1}>{store.tagline}</Txt>
        {/* No token balance here: Home cards stay the same for everyone */}
        <View style={{ marginTop: 2 }}>
          <Rating store={store} />
        </View>
      </View>
    </Pressable>
  );
}

/** One store in the Stores tab */
export function StoreRow({ store }: { store: MarketStore }) {
  return (
    <Pressable
      onPress={() => openStore(store.slug)}
      style={({ pressed }) => ({ flexDirection: "row", gap: space.md, padding: space.md, borderRadius: radius.xl, backgroundColor: pressed ? colors.surfaceAlt : colors.surface, borderWidth: 1, borderColor: colors.line })}
    >
      <View>
        <StoreCover store={store} style={{ width: 92, height: 92, borderRadius: radius.lg }} />
        <View style={{ position: "absolute", left: -6, bottom: -6 }}>
          <StoreLogo store={store} size={40} />
        </View>
      </View>
      <View style={{ flex: 1, gap: 3, justifyContent: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Txt variant="label" numberOfLines={1} style={{ fontSize: 15.5, flexShrink: 1 }}>{store.name}</Txt>
          <Ionicons name="checkmark-circle" size={15} color={isOfficialStore(store) ? colors.brand : "#2F6FB3"} />
          {isFeatured(store) && <FeaturedTag small />}
        </View>
        <Txt variant="small" numberOfLines={1}>{store.tagline}</Txt>
        <Rating store={store} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
          {store.delivery.states.length > 0 && (
            <Txt variant="caption" numberOfLines={1} style={{ flexShrink: 1 }}>
              Delivers to {store.delivery.states.slice(0, 2).join(", ")}
              {store.delivery.states.length > 2 ? ` +${store.delivery.states.length - 2}` : ""}
            </Txt>
          )}
        </View>
      </View>
    </Pressable>
  );
}

/** A product from a marketplace store, with the store that sells it on its picture */
export function MarketProductCard({ store, product, width = 150, onDark }: { store: MarketStore; product: StoreProduct; width?: number; onDark?: boolean }) {
  const off = product.compareAt && product.compareAt > product.price ? Math.round(((product.compareAt - product.price) / product.compareAt) * 100) : 0;
  return (
    <Pressable onPress={() => openProduct(product.slug)} style={({ pressed }) => ({ width, opacity: pressed ? 0.88 : 1 })}>
      <View style={{ aspectRatio: 1, borderRadius: radius.lg, backgroundColor: tileColor(store.theme), alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <View style={{ position: "absolute", width: "66%", height: "66%", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.55)" }} />
        <ProductArt product={product} store={store} />
        {/* Top left: a star for a featured store, then any discount */}
        <View style={{ position: "absolute", top: 8, left: 8, flexDirection: "row", alignItems: "center", gap: 5 }}>
          {isFeatured(store) && <Ionicons name="star" size={13} color={colors.brandYellow} accessibilityLabel="Featured store" />}
          {off > 0 ? (
            <View style={{ backgroundColor: colors.inverse, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 2 }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 11, color: colors.onInverse }}>-{off}%</Text>
            </View>
          ) : null}
        </View>
        {/* Open to offers: a price-tag badge in the corner */}
        {product.negotiable ? (
          <View accessibilityLabel="Open to offers" style={{ position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: store.theme.hero, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="pricetag" size={13} color={store.theme.onHero} />
          </View>
        ) : null}
        {/* Who sells it, bottom right */}
        <View style={{ position: "absolute", left: 8, right: 8, bottom: 8, flexDirection: "row", justifyContent: "flex-end" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, maxWidth: "100%", paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.92)" }}>
            <Ionicons name="storefront" size={10} color={colors.brandPressed} />
            <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: fonts.semibold, fontSize: 10.5, color: "#17120E" }}>{store.name}</Text>
          </View>
        </View>
      </View>
      <View style={{ paddingTop: space.sm, gap: 2 }}>
        <Text numberOfLines={2} style={{ fontFamily: fonts.medium, fontSize: 13.5, lineHeight: 18, color: onDark ? colors.white : colors.ink }}>{product.name}</Text>
        <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: onDark ? colors.white : colors.ink }}>{formatNaira(product.price)}</Text>
      </View>
    </Pressable>
  );
}

/** A horizontal row of marketplace products, like the catalogue rows on Home */
export function MarketRail({ title, subtitle, items, dark, onSeeAll }: { title: string; subtitle?: string; items: { store: MarketStore; product: StoreProduct }[]; dark?: boolean; onSeeAll?: () => void }) {
  if (items.length === 0) return null;
  const pad = dark ? space.lg : gutter;
  return (
    <View style={dark ? { marginHorizontal: gutter, backgroundColor: colors.panel, borderRadius: radius.xl, paddingVertical: space.lg } : undefined}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space.md, paddingHorizontal: pad }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="heading" color={dark ? colors.white : colors.ink} style={{ fontSize: 21 }}>{title}</Txt>
          {subtitle ? <Txt variant="small" color={dark ? "rgba(255,255,255,0.65)" : colors.muted}>{subtitle}</Txt> : null}
        </View>
        {onSeeAll && (
          <Pressable onPress={onSeeAll} accessibilityLabel={`See all ${title}`} style={{ height: 34, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: dark ? colors.white : colors.inverse, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="arrow-forward" size={18} color={dark ? colors.panel : colors.onInverse} />
          </Pressable>
        )}
      </View>
      <ScrollRow contentContainerStyle={{ paddingHorizontal: pad, gap: space.md }}>
        {items.map(({ store, product }) => (
          <MarketProductCard key={`${store.slug}-${product.id}`} store={store} product={product} onDark={dark} />
        ))}
      </ScrollRow>
    </View>
  );
}
