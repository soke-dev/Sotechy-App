import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { ProductCard } from "@/components/product-card";
import { Chip, EmptyState, ErrorView, Input, Loading, ScreenHeader, Txt, ui } from "@/components/ui";
import { api } from "@/lib/api";
import { colors, gutter, space } from "@/lib/theme";
import { useAsync } from "@/lib/use-async";

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

export default function ShopScreen() {
  const params = useLocalSearchParams<{ q?: string; category?: string; sort?: string; focus?: string }>();
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState(params.q ?? "");
  const [search, setSearch] = useState(params.q ?? "");
  const [category, setCategory] = useState(params.category ?? "");
  const [sort, setSort] = useState(params.sort ?? "newest");

  // The tab stays mounted, so follow new filters passed from other screens.
  useEffect(() => {
    if (params.category !== undefined) setCategory(params.category);
  }, [params.category]);
  useEffect(() => {
    if (params.q !== undefined) {
      setQuery(params.q);
      setSearch(params.q);
    }
  }, [params.q]);
  useEffect(() => {
    if (params.sort) setSort(params.sort);
  }, [params.sort]);

  const categories = useAsync(() => api.categories());
  const products = useAsync(() => api.products({ q: search, category, sort }), [search, category, sort]);
  const cardWidth = (Math.min(width, 720) - gutter * 2 - space.md) / 2;
  const sortLabel = SORTS.find((s) => s.value === sort)?.label ?? "Newest";
  const nextSort = () => setSort(SORTS[(SORTS.findIndex((s) => s.value === sort) + 1) % SORTS.length].value);

  return (
    <View style={ui.screen}>
      <ScreenHeader title="Shop" />
      <View style={{ paddingHorizontal: gutter, gap: space.md, paddingBottom: space.md }}>
        <Input
          icon="search"
          placeholder="Search by name, brand or model"
          value={query}
          autoFocus={params.focus === "1"}
          onChangeText={(t) => {
            setQuery(t);
            if (!t) setSearch("");
          }}
          onSubmitEditing={() => setSearch(query.trim())}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: gutter, gap: space.sm }}>
          <Chip label="All" active={!category} onPress={() => setCategory("")} />
          {(categories.data ?? []).map((c) => (
            <Chip key={c.id} label={c.name} active={category === c.slug} onPress={() => setCategory(c.slug)} />
          ))}
        </ScrollView>
      </View>
      <View style={[ui.between, { paddingHorizontal: gutter, paddingVertical: space.md }]}>
        <Txt variant="small">{products.data ? `${products.data.length} item${products.data.length === 1 ? "" : "s"}` : " "}</Txt>
        <Pressable onPress={nextSort} hitSlop={8} style={ui.row}>
          <Ionicons name="swap-vertical" size={15} color={colors.ink2} />
          <Txt variant="label" color={colors.ink2}>{sortLabel}</Txt>
        </Pressable>
      </View>

      {products.loading && !products.data ? (
        <Loading />
      ) : products.error ? (
        <ErrorView message={products.error} onRetry={products.reload} />
      ) : (
        <FlatList
          data={products.data}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={{ gap: space.md }}
          contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: space.xxl * 2, gap: space.xl }}
          renderItem={({ item }) => <ProductCard product={item} width={cardWidth} />}
          ListEmptyComponent={<EmptyState icon="search-outline" title="No matches" message="Try another search or browse a different category." />}
          onRefresh={products.reload}
          refreshing={products.loading}
          keyboardDismissMode="on-drag"
        />
      )}
    </View>
  );
}
