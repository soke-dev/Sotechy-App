// Shop filters: brand, price, rating, deals and stock combine with the category, search and sort.
import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatNaira, type ProductQuery } from "@sotechy/shared";
import { api } from "@/lib/api";
import { colors, gutter, radius, space } from "@/lib/theme";
import { useSheetFrame } from "@/lib/layout";
import { useAsync } from "@/lib/use-async";
import { Button, Chip, Input, tap, Txt, type IconName } from "./ui";

export interface ShopFilters {
  brands: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStock: boolean;
  deals: boolean;
}

export const NO_FILTERS: ShopFilters = { brands: [], inStock: false, deals: false };

/** Brands shown before "Show all" (the facets list them most products first) */
const BRANDS_SHOWN = 12;

export const SORTS: { value: string; label: string; short: string; icon: IconName }[] = [
  { value: "newest", label: "Newest first", short: "Newest", icon: "time-outline" },
  { value: "price_asc", label: "Price: low to high", short: "Lowest price", icon: "trending-up" },
  { value: "price_desc", label: "Price: high to low", short: "Highest price", icon: "trending-down" },
  { value: "rating", label: "Top rated", short: "Top rated", icon: "star-outline" },
];

const PRICE_PRESETS: { label: string; min?: number; max?: number }[] = [
  { label: "Under ₦50k", max: 50_000 },
  { label: "₦50k – ₦150k", min: 50_000, max: 150_000 },
  { label: "₦150k – ₦400k", min: 150_000, max: 400_000 },
  { label: "Over ₦400k", min: 400_000 },
];

export const countFilters = (f: ShopFilters) =>
  f.brands.length + (f.minPrice !== undefined || f.maxPrice !== undefined ? 1 : 0) + (f.minRating ? 1 : 0) + (f.inStock ? 1 : 0) + (f.deals ? 1 : 0);

export const toQuery = (f: ShopFilters): ProductQuery => ({
  brands: f.brands,
  minPrice: f.minPrice,
  maxPrice: f.maxPrice,
  minRating: f.minRating,
  inStock: f.inStock || undefined,
  deals: f.deals || undefined,
});

const shortNaira = (n: number) => (n >= 1_000_000 ? `₦${+(n / 1_000_000).toFixed(1)}m` : n >= 1000 ? `₦${Math.round(n / 1000)}k` : `₦${n}`);

export function priceLabel(f: ShopFilters) {
  if (f.minPrice !== undefined && f.maxPrice !== undefined) return `${shortNaira(f.minPrice)} – ${shortNaira(f.maxPrice)}`;
  if (f.maxPrice !== undefined) return `Under ${shortNaira(f.maxPrice)}`;
  if (f.minPrice !== undefined) return `Over ${shortNaira(f.minPrice)}`;
  return "Price";
}

export const brandLabel = (f: ShopFilters) => (f.brands.length === 0 ? "Brand" : f.brands.length === 1 ? f.brands[0] : `${f.brands[0]} +${f.brands.length - 1}`);

/** Bottom sheet with a title, scrollable body and optional footer. */
/** Bottom sheet used across the app (filters, wallet, notifications) */
export function Sheet({ visible, title, right, onClose, children, footer }: { visible: boolean; title: string; right?: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const insets = useSafeAreaInsets();
  // A centred dialog on desktop
  const frame = useSheetFrame();
  return (
    <Modal visible={visible} transparent animationType={frame ? "fade" : "slide"} onRequestClose={onClose}>
      <KeyboardAvoidingView style={[{ flex: 1, justifyContent: "flex-end" }, frame?.outer]} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.overlay }} onPress={onClose} accessibilityLabel="Close" />
        <View style={[{ backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: "88%", paddingBottom: insets.bottom + space.md }, frame?.panel]}>
          <View style={{ alignItems: "center", paddingTop: space.sm }}>
            <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line }} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: gutter, paddingVertical: space.md }}>
            <Txt variant="heading" style={{ flex: 1 }}>{title}</Txt>
            {right}
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close" style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="close" size={18} color={colors.ink} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: space.lg, gap: space.xl }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View style={{ paddingHorizontal: gutter, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
        <Txt variant="label">{title}</Txt>
        {hint ? <Txt variant="caption">{hint}</Txt> : null}
      </View>
      {children}
    </View>
  );
}

function ToggleRow({ icon, title, subtitle, value, onChange }: { icon: IconName; title: string; subtitle: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onChange(!value);
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      style={{ flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md }}
    >
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={18} color={colors.brandPressed} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt variant="label">{title}</Txt>
        <Txt variant="small">{subtitle}</Txt>
      </View>
      <Ionicons name={value ? "checkbox" : "square-outline"} size={24} color={value ? colors.ink : colors.faint} />
    </Pressable>
  );
}

const parseNaira = (t: string) => {
  const n = Number(t.replace(/[^\d]/g, ""));
  return t.trim() && Number.isFinite(n) ? n : undefined;
};

/** Full filter sheet. Changes are a draft until "Show N items"; the count updates as you pick. */
export function FilterSheet({
  visible,
  value,
  search,
  category,
  onClose,
  onApply,
}: {
  visible: boolean;
  value: ShopFilters;
  search: string;
  category: string;
  onClose: () => void;
  onApply: (f: ShopFilters) => void;
}) {
  const [draft, setDraft] = useState<ShopFilters>(value);
  const [minText, setMinText] = useState("");
  const [maxText, setMaxText] = useState("");
  const [countKey, setCountKey] = useState("");

  // Start from the applied filters each time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    setDraft(value);
    setMinText(value.minPrice !== undefined ? String(value.minPrice) : "");
    setMaxText(value.maxPrice !== undefined ? String(value.maxPrice) : "");
  }, [visible, value]);

  // Debounce the live count so typing a price doesn't fire a request per key.
  const key = JSON.stringify(draft);
  useEffect(() => {
    const t = setTimeout(() => setCountKey(key), 250);
    return () => clearTimeout(t);
  }, [key]);

  const facets = useAsync(async () => (visible ? api.productFacets({ q: search, category }) : null), [visible, search, category]);
  const count = useAsync(async () => (visible && countKey ? (await api.products({ q: search, category, ...toQuery(JSON.parse(countKey)) })).length : null), [visible, countKey, search, category]);

  const set = (patch: Partial<ShopFilters>) => setDraft((d) => ({ ...d, ...patch }));
  // Many brands: the top ones (and any picked), a search, and "show all"
  const [brandQuery, setBrandQuery] = useState("");
  const [allBrands, setAllBrands] = useState(false);
  const brandList = facets.data?.brands ?? [];
  const manyBrands = brandList.length > BRANDS_SHOWN;
  const findBrand = brandQuery.trim().toLowerCase();
  const brandsShown = findBrand
    ? brandList.filter((b) => b.name.toLowerCase().includes(findBrand))
    : allBrands || !manyBrands
      ? brandList
      : [...brandList.slice(0, BRANDS_SHOWN), ...brandList.slice(BRANDS_SHOWN).filter((b) => draft.brands.includes(b.name))];
  const toggleBrand = (name: string) => set({ brands: draft.brands.includes(name) ? draft.brands.filter((b) => b !== name) : [...draft.brands, name] });
  const setPrice = (min?: number, max?: number) => {
    set({ minPrice: min, maxPrice: max });
    setMinText(min !== undefined ? String(min) : "");
    setMaxText(max !== undefined ? String(max) : "");
  };
  const reset = () => {
    setDraft(NO_FILTERS);
    setMinText("");
    setMaxText("");
  };
  const range = facets.data?.price;
  const pending = countFilters(draft);
  const shown = count.data;

  return (
    <Sheet
      visible={visible}
      title="Filters"
      onClose={onClose}
      right={
        pending > 0 ? (
          <Pressable onPress={reset} hitSlop={8}>
            <Txt variant="label" color={colors.brandPressed}>Reset</Txt>
          </Pressable>
        ) : null
      }
      footer={
        <Button
          title={shown == null ? "Show results" : shown === 0 ? "No matching items" : `Show ${shown} item${shown === 1 ? "" : "s"}`}
          variant="dark"
          disabled={shown === 0}
          loading={count.loading && shown == null}
          onPress={() => onApply(draft)}
        />
      }
    >
      <ToggleRowGroup>
        <ToggleRow icon="pricetag-outline" title="Deals" subtitle="Discounted items and Sotechy picks" value={draft.deals} onChange={(deals) => set({ deals })} />
        <ToggleRow icon="cube-outline" title="In stock only" subtitle="Hide items that are sold out" value={draft.inStock} onChange={(inStock) => set({ inStock })} />
      </ToggleRowGroup>

      {(facets.data?.brands.length ?? 0) > 0 && (
        <Section title="Brand" hint={draft.brands.length ? `${draft.brands.length} selected` : "Pick one or more"}>
          {manyBrands && <Input icon="search" placeholder={`Search ${brandList.length} brands`} value={brandQuery} onChangeText={setBrandQuery} />}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
            {brandsShown.map((b) => (
              <Chip key={b.name} label={`${b.name} (${b.count})`} active={draft.brands.includes(b.name)} icon={draft.brands.includes(b.name) ? "checkmark" : undefined} onPress={() => toggleBrand(b.name)} />
            ))}
            {findBrand && brandsShown.length === 0 && <Txt variant="small">No brand called &quot;{brandQuery.trim()}&quot; here.</Txt>}
          </View>
          {manyBrands && !findBrand && (
            <Pressable onPress={() => setAllBrands(!allBrands)} hitSlop={6} style={{ alignSelf: "flex-start" }}>
              <Txt variant="label" color={colors.brandPressed}>{allBrands ? "Show fewer" : `Show all ${brandList.length} brands`}</Txt>
            </Pressable>
          )}
        </Section>
      )}

      <Section title="Price" hint={range && range.max ? `${formatNaira(range.min)} – ${formatNaira(range.max)}` : undefined}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
          {PRICE_PRESETS.map((p) => {
            const active = draft.minPrice === p.min && draft.maxPrice === p.max;
            return <Chip key={p.label} label={p.label} active={active} onPress={() => (active ? setPrice(undefined, undefined) : setPrice(p.min, p.max))} />;
          })}
        </View>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: space.sm }}>
          <View style={{ flex: 1 }}>
            <Input
              label="Min (₦)"
              value={minText}
              onChangeText={(t) => {
                setMinText(t);
                set({ minPrice: parseNaira(t) });
              }}
              placeholder={range?.min ? String(range.min) : "0"}
              keyboardType="number-pad"
            />
          </View>
          <Txt variant="small" style={{ paddingBottom: 15 }}>to</Txt>
          <View style={{ flex: 1 }}>
            <Input
              label="Max (₦)"
              value={maxText}
              onChangeText={(t) => {
                setMaxText(t);
                set({ maxPrice: parseNaira(t) });
              }}
              placeholder={range?.max ? String(range.max) : "Any"}
              keyboardType="number-pad"
            />
          </View>
        </View>
      </Section>

      <Section title="Customer rating">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
          {[4, 3].map((r) => (
            <Chip key={r} icon="star" label={`${r} & up`} active={draft.minRating === r} onPress={() => set({ minRating: draft.minRating === r ? undefined : r })} />
          ))}
        </View>
      </Section>
    </Sheet>
  );
}

function ToggleRowGroup({ children }: { children: ReactNode }) {
  return <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, paddingHorizontal: space.md }}>{children}</View>;
}

export function SortSheet({ visible, value, onClose, onChange }: { visible: boolean; value: string; onClose: () => void; onChange: (sort: string) => void }) {
  return (
    <Sheet visible={visible} title="Sort by" onClose={onClose}>
      <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line }}>
        {SORTS.map((s, i) => {
          const active = s.value === value;
          return (
            <Pressable
              key={s.value}
              onPress={() => {
                tap();
                onChange(s.value);
              }}
              style={{ flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderTopColor: colors.line }}
            >
              <Ionicons name={s.icon} size={18} color={active ? colors.brandPressed : colors.muted} />
              <Txt variant={active ? "label" : "medium"} style={{ flex: 1 }}>{s.label}</Txt>
              {active && <Ionicons name="checkmark-circle" size={20} color={colors.brandPressed} />}
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}
