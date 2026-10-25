import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { MenuButton } from "@/components/menu";
import { ProductCard } from "@/components/product-card";
import { SupportChat } from "@/components/support-chat";
import { useTabBarInset } from "@/components/tab-bar";
import { Chip, EmptyState, ErrorView, Input, Loading, ScreenHeader, Txt, ui } from "@/components/ui";
import { api } from "@/lib/api";
import { colors, fonts, gutter, radius, space } from "@/lib/theme";
import { useAsync } from "@/lib/use-async";

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

export default function ShopScreen() {
  const params = useLocalSearchParams<{ q?: string; category?: string; sort?: string; focus?: string; featured?: string }>();
  const { width } = useWindowDimensions();
  const tabInset = useTabBarInset();
  const [query, setQuery] = useState(params.q ?? "");
  const [search, setSearch] = useState(params.q ?? "");
  const [category, setCategory] = useState(params.category ?? "");
  const [sort, setSort] = useState(params.sort ?? "newest");
  const [dealsOnly, setDealsOnly] = useState(params.featured === "1");

  // The tab stays mounted, so follow new filters passed from other screens (home, menu).
  useEffect(() => {
    if (params.category !== undefined) {
      setCategory(params.category);
      setDealsOnly(false);
    }
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
  useEffect(() => {
    if (params.featured === "1") {
      setDealsOnly(true);
      setCategory("");
    }
  }, [params.featured]);

  const categories = useAsync(() => api.categories());
  const products = useAsync(() => api.products({ q: search, category, sort, featured: dealsOnly || undefined }), [search, category, sort, dealsOnly]);
  const cardWidth = (Math.min(width, 720) - gutter * 2 - space.md) / 2;
  const sortLabel = SORTS.find((s) => s.value === sort)?.label ?? "Newest";
  const nextSort = () => setSort(SORTS[(SORTS.findIndex((s) => s.value === sort) + 1) % SORTS.length].value);

  const all = categories.data ?? [];
  const tops = all.filter((c) => !c.parentId).sort((a, b) => a.sortOrder - b.sortOrder);
  const selected = all.find((c) => c.slug === category);
  const group = selected?.parentId ? all.find((c) => c.id === selected.parentId) : selected;
  const subs = group ? all.filter((c) => c.parentId === group.id).sort((a, b) => a.sortOrder - b.sortOrder) : [];

  return (
    <View style={ui.screen}>
      <ScreenHeader title={group?.name ?? (dealsOnly ? "Deals" : "Shop")} right={<MenuButton />} />
      <View style={{ paddingHorizontal: gutter, paddingBottom: space.md }}>
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
          <Chip label="All" active={!category && !dealsOnly} onPress={() => { setCategory(""); setDealsOnly(false); }} />
          <Chip label="Deals" icon="pricetag" active={dealsOnly} onPress={() => { setDealsOnly(!dealsOnly); setCategory(""); }} />
          {tops.map((c) => (
            <Chip key={c.id} label={c.name} active={group?.id === c.id} onPress={() => { setCategory(c.slug); setDealsOnly(false); }} />
          ))}
        </ScrollView>
      </View>
      {subs.length > 0 && group && (
        <View style={{ flexShrink: 0 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: gutter, gap: space.lg, paddingTop: space.md }}>
          {[{ id: group.id, name: "All", slug: group.slug }, ...subs].map((s) => {
            const active = category === s.slug;
            return (
              <Pressable key={s.id} onPress={() => setCategory(s.slug)} style={{ paddingBottom: 6, borderBottomWidth: 2, borderBottomColor: active ? colors.brand : "transparent" }}>
                <Txt variant="label" color={active ? colors.ink : colors.muted} style={{ fontFamily: active ? fonts.semibold : fonts.medium }}>{s.name}</Txt>
              </Pressable>
            );
          })}
        </ScrollView>
        </View>
      )}
      <View style={[ui.between, { paddingHorizontal: gutter, paddingVertical: space.md }]}>
        <Txt variant="small">{products.data ? `${products.data.length} item${products.data.length === 1 ? "" : "s"}` : " "}</Txt>
        <Pressable onPress={nextSort} hitSlop={8} style={[ui.row, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 }]}>
          <Ionicons name="swap-vertical" size={14} color={colors.ink2} />
          <Txt variant="label" color={colors.ink2} style={{ fontSize: 13 }}>{sortLabel}</Txt>
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
          contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: tabInset + space.lg, gap: space.md }}
          renderItem={({ item }) => <ProductCard product={item} width={cardWidth} />}
          ListEmptyComponent={<EmptyState icon="search-outline" title="No matches" message="Try another search or browse a different category." />}
          onRefresh={products.reload}
          refreshing={products.loading}
          keyboardDismissMode="on-drag"
        />
      )}
      <SupportChat bottomOffset={tabInset} />
    </View>
  );
}
