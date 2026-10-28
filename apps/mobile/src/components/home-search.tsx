import Ionicons from "@expo/vector-icons/Ionicons";
import { router, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, TextInput, View } from "react-native";
import { formatNaira, type CatalogProduct } from "@sotechy/shared";
import { ProductImage } from "@/components/product-image";
import { openStore, StoreLogo } from "@/components/store-bits";
import { Txt } from "@/components/ui";
import { api } from "@/lib/api";
import { SOTECHY_STORE, useStores, type MarketStore } from "@/lib/marketplace";
import { colors, fonts, radius, space } from "@/lib/theme";

const MAX_PRODUCTS = 6;

/** Home's search: products, brands and stores show right under it as you type */
export function HomeSearch() {
  const [q, setQ] = useState("");
  const [products, setProducts] = useState<CatalogProduct[] | null>(null);
  const [busy, setBusy] = useState(false);
  const { stores } = useStores();
  const term = q.trim();

  // Products (the catalogue matches name, brand and model), after a pause in typing
  useEffect(() => {
    if (term.length < 2) return setProducts(null);
    let live = true;
    setBusy(true);
    const t = setTimeout(() => {
      api
        .products({ q: term })
        .then((r) => live && setProducts(r), () => live && setProducts([]))
        .finally(() => live && setBusy(false));
    }, 300);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [term]);

  const needle = term.toLowerCase();
  const matchStore = (s: MarketStore) => [s.name, s.tagline, s.ticker, ...s.sells].some((x) => x?.toLowerCase().includes(needle));
  const storeHits = term.length < 2 ? [] : [SOTECHY_STORE, ...(stores ?? [])].filter(matchStore).slice(0, 4);
  const brands = [...new Set((products ?? []).map((p) => p.brand).filter((b): b is string => !!b && b.toLowerCase().includes(needle)))].slice(0, 6);
  const shopFor = (query: string) => router.push({ pathname: "/shop", params: { q: query } } as Href);
  const nothing = !busy && products !== null && products.length === 0 && storeHits.length === 0;

  return (
    <View style={{ gap: space.sm }}>
      <View style={{ height: 50, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: term ? colors.brand : colors.line, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 18 }}>
        <Ionicons name="search" size={18} color={colors.ink2} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search products, stores and brands"
          placeholderTextColor={colors.faint}
          returnKeyType="search"
          onSubmitEditing={() => term && shopFor(term)}
          style={{ flex: 1, height: "100%", fontFamily: fonts.body, fontSize: 15, color: colors.ink }}
        />
        {busy ? <ActivityIndicator size="small" color={colors.brand} /> : null}
        {q ? (
          <Pressable onPress={() => setQ("")} hitSlop={10} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={colors.faint} />
          </Pressable>
        ) : null}
      </View>

      {term.length >= 2 && (
        <View style={{ borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, padding: space.md, gap: space.md }}>
          {storeHits.length > 0 && (
            <View style={{ gap: space.xs }}>
              <Txt variant="overline">Stores</Txt>
              {storeHits.map((s) => (
                <Pressable key={s.slug} onPress={() => openStore(s.slug)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: 6, opacity: pressed ? 0.7 : 1 })}>
                  <StoreLogo store={s} size={34} />
                  <View style={{ flex: 1 }}>
                    <Txt variant="label" numberOfLines={1}>{s.name}</Txt>
                    <Txt variant="caption" numberOfLines={1}>{s.tagline}</Txt>
                  </View>
                  <Txt variant="caption" color={colors.brandPressed}>${s.ticker}</Txt>
                </Pressable>
              ))}
            </View>
          )}

          {brands.length > 0 && (
            <View style={{ gap: space.xs }}>
              <Txt variant="overline">Brands</Txt>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.xs }}>
                {brands.map((b) => (
                  <Pressable key={b} onPress={() => shopFor(b)} style={({ pressed }) => ({ paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: pressed ? colors.line : colors.surfaceAlt })}>
                    <Txt variant="label" style={{ fontSize: 13 }}>{b}</Txt>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {(products?.length ?? 0) > 0 && (
            <View style={{ gap: space.xs }}>
              <Txt variant="overline">Products</Txt>
              {products!.slice(0, MAX_PRODUCTS).map((p) => (
                <Pressable key={p.id} onPress={() => router.push({ pathname: "/product/[id]", params: { id: p.slug } })} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: 5, opacity: pressed ? 0.7 : 1 })}>
                  <ProductImage uri={p.imageUrl} name={p.name} style={{ width: 42, height: 42 }} radius={10} iconSize={18} />
                  <View style={{ flex: 1 }}>
                    <Txt variant="label" numberOfLines={1}>{p.name}</Txt>
                    <Txt variant="caption" numberOfLines={1}>{p.storeName ?? "Sotechy"}</Txt>
                  </View>
                  <Txt variant="price" style={{ fontSize: 14 }}>{formatNaira(p.minPrice)}</Txt>
                </Pressable>
              ))}
            </View>
          )}

          {nothing && <Txt variant="small">Nothing matches &quot;{term}&quot; yet. Try another word.</Txt>}

          {(products?.length ?? 0) > MAX_PRODUCTS && (
            <Pressable onPress={() => shopFor(term)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingTop: space.xs }}>
              <Txt variant="label" color={colors.brandPressed}>See all {products!.length} products</Txt>
              <Ionicons name="arrow-forward" size={15} color={colors.brandPressed} />
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}
