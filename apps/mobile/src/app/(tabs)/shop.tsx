import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { MenuButton } from "@/components/menu";
import { ProductCard } from "@/components/product-card";
import { brandLabel, countFilters, FilterSheet, NO_FILTERS, priceLabel, SORTS, SortSheet, toQuery, type ShopFilters } from "@/components/shop-filters";
import { SupportChat } from "@/components/support-chat";
import { useTabBarInset } from "@/components/tab-bar";
import { Button, Chip, EmptyState, ErrorView, Input, Loading, ScreenHeader, tap, Txt, ui } from "@/components/ui";
import { api } from "@/lib/api";
import { colors, fonts, gutter, radius, space } from "@/lib/theme";
import { useAsync } from "@/lib/use-async";

/** "Filters" button with a count of the filters in use. */
function FiltersButton({ count, onPress }: { count: number; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={count ? `Filters, ${count} on` : "Filters"}
      style={({ pressed }) => ({ height: 36, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.ink, backgroundColor: pressed ? colors.surfaceAlt : colors.surface, flexDirection: "row", alignItems: "center", gap: 6 })}
    >
      <Ionicons name="options-outline" size={16} color={colors.ink} />
      <Txt variant="label" style={{ fontSize: 13 }}>Filters</Txt>
      {count > 0 && (
        <View style={{ minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 11, color: colors.white }}>{count}</Text>
        </View>
      )}
    </Pressable>
  );
}

export default function ShopScreen() {
  const params = useLocalSearchParams<{ q?: string; category?: string; sort?: string; focus?: string; featured?: string }>();
  const { width } = useWindowDimensions();
  const tabInset = useTabBarInset();
  const [query, setQuery] = useState(params.q ?? "");
  const [search, setSearch] = useState(params.q ?? "");
  const [category, setCategory] = useState(params.category ?? "");
  const [sort, setSort] = useState(params.sort ?? "newest");
  const [filters, setFilters] = useState<ShopFilters>(params.featured === "1" ? { ...NO_FILTERS, deals: true } : NO_FILTERS);
  const [sheet, setSheet] = useState<"filters" | "sort" | null>(null);

  // The tab stays mounted, so follow new filters passed from other screens (home, menu).
  useEffect(() => {
    if (params.category !== undefined) {
      setCategory(params.category);
      setFilters(NO_FILTERS);
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
      setFilters({ ...NO_FILTERS, deals: true });
      setCategory("");
    }
  }, [params.featured]);

  const categories = useAsync(() => api.categories());
  // Category, search, sort and every filter combine into one query.
  const products = useAsync(() => api.products({ q: search, category, sort, ...toQuery(filters) }), [search, category, sort, JSON.stringify(filters)]);
  const cardWidth = (Math.min(width, 720) - gutter * 2 - space.md) / 2;
  const sortShort = SORTS.find((s) => s.value === sort)?.short ?? "Newest";
  const active = countFilters(filters);
  const hasPrice = filters.minPrice !== undefined || filters.maxPrice !== undefined;
  const toggle = (patch: Partial<ShopFilters>) => {
    tap();
    setFilters((f) => ({ ...f, ...patch }));
  };

  const all = categories.data ?? [];
  const tops = all.filter((c) => !c.parentId).sort((a, b) => a.sortOrder - b.sortOrder);
  const selected = all.find((c) => c.slug === category);
  const group = selected?.parentId ? all.find((c) => c.id === selected.parentId) : selected;
  const subs = group ? all.filter((c) => c.parentId === group.id).sort((a, b) => a.sortOrder - b.sortOrder) : [];
  const count = products.data?.length;

  return (
    <View style={ui.screen}>
      <ScreenHeader title={group?.name ?? (filters.deals ? "Deals" : "Shop")} right={<MenuButton />} />
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
          <Chip label="All" active={!category} onPress={() => setCategory("")} />
          {tops.map((c) => (
            <Chip key={c.id} label={c.name} active={group?.id === c.id} onPress={() => setCategory(c.slug)} />
          ))}
        </ScrollView>
      </View>
      {subs.length > 0 && group && (
        <View style={{ flexShrink: 0 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: gutter, gap: space.lg, paddingTop: space.md }}>
            {[{ id: group.id, name: "All", slug: group.slug }, ...subs].map((s) => {
              const on = category === s.slug;
              return (
                <Pressable key={s.id} onPress={() => setCategory(s.slug)} style={{ paddingBottom: 6, borderBottomWidth: 2, borderBottomColor: on ? colors.brand : "transparent" }}>
                  <Txt variant="label" color={on ? colors.ink : colors.muted} style={{ fontFamily: on ? fonts.semibold : fonts.medium }}>{s.name}</Txt>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Filter toolbar: quick toggles plus the full filter sheet; everything stacks */}
      <View style={{ flexShrink: 0, marginTop: space.md, paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.line }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: gutter, gap: space.sm }}>
          <FiltersButton count={active} onPress={() => setSheet("filters")} />
          <Chip icon="swap-vertical" label={sortShort} trailingIcon="chevron-down" active={sort !== "newest"} onPress={() => setSheet("sort")} />
          <Chip icon="pricetag-outline" label="Deals" active={filters.deals} onPress={() => toggle({ deals: !filters.deals })} />
          <Chip icon="cube-outline" label="In stock" active={filters.inStock} onPress={() => toggle({ inStock: !filters.inStock })} />
          <Chip icon="star" label="4 & up" active={filters.minRating === 4} onPress={() => toggle({ minRating: filters.minRating === 4 ? undefined : 4 })} />
          <Chip label={brandLabel(filters)} trailingIcon="chevron-down" active={filters.brands.length > 0} onPress={() => setSheet("filters")} />
          <Chip label={priceLabel(filters)} trailingIcon="chevron-down" active={hasPrice} onPress={() => setSheet("filters")} />
        </ScrollView>
      </View>

      <View style={[ui.between, { paddingHorizontal: gutter, paddingVertical: space.md }]}>
        <Txt variant="small">{count !== undefined ? `${count} item${count === 1 ? "" : "s"}${active ? ` · ${active} filter${active === 1 ? "" : "s"} on` : ""}` : " "}</Txt>
        {active > 0 && (
          <Pressable onPress={() => setFilters(NO_FILTERS)} hitSlop={8}>
            <Txt variant="label" color={colors.brandPressed} style={{ fontSize: 13 }}>Clear all</Txt>
          </Pressable>
        )}
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
          ListEmptyComponent={
            active ? (
              <EmptyState illo="search" title="No matches" message="Nothing fits all of these filters. Try removing one or two." action={<Button title="Clear filters" variant="outline" onPress={() => setFilters(NO_FILTERS)} />} />
            ) : (
              <EmptyState illo="search" title="No matches" message="Try another search or browse a different category." />
            )
          }
          onRefresh={products.reload}
          refreshing={products.loading}
          keyboardDismissMode="on-drag"
        />
      )}
      <SupportChat bottomOffset={tabInset} />

      <FilterSheet
        visible={sheet === "filters"}
        value={filters}
        search={search}
        category={category}
        onClose={() => setSheet(null)}
        onApply={(f) => {
          setFilters(f);
          setSheet(null);
        }}
      />
      <SortSheet
        visible={sheet === "sort"}
        value={sort}
        onClose={() => setSheet(null)}
        onChange={(s) => {
          setSort(s);
          setSheet(null);
        }}
      />
    </View>
  );
}
