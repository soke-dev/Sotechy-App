import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { FlatList, ScrollView, View } from "react-native";
import { ProductCard } from "@/components/product-card";
import { Chip, Empty, ErrorView, Input, Loading, styles } from "@/components/ui";
import { api } from "@/lib/api";
import { spacing } from "@/lib/theme";
import { useAsync } from "@/lib/use-async";

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price ↑" },
  { value: "price_desc", label: "Price ↓" },
];

export default function ShopScreen() {
  const params = useLocalSearchParams<{ q?: string; category?: string }>();
  const [query, setQuery] = useState(params.q ?? "");
  const [search, setSearch] = useState(params.q ?? "");
  const [category, setCategory] = useState(params.category ?? "");
  const [sort, setSort] = useState("newest");

  const categories = useAsync(() => api.categories());
  const products = useAsync(() => api.products({ q: search, category, sort }), [search, category, sort]);

  return (
    <View style={styles.screen}>
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <Input placeholder="Search by name, brand or model" value={query} onChangeText={setQuery} onSubmitEditing={() => setSearch(query)} returnKeyType="search" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Chip label="All" active={!category} onPress={() => setCategory("")} />
          {(categories.data ?? []).map((c) => (
            <Chip key={c.id} label={c.name} active={category === c.slug} onPress={() => setCategory(c.slug)} />
          ))}
        </ScrollView>
        <View style={styles.row}>
          {SORTS.map((s) => (
            <Chip key={s.value} label={s.label} active={sort === s.value} onPress={() => setSort(s.value)} />
          ))}
        </View>
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
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, gap: 12 }}
          renderItem={({ item }) => (
            <View style={{ flex: 1 }}>
              <ProductCard product={item} />
            </View>
          )}
          ListEmptyComponent={<Empty title="No products found" />}
          onRefresh={products.reload}
          refreshing={products.loading}
        />
      )}
    </View>
  );
}
