import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, ScrollView, View } from "react-native";
import type { CatalogProduct } from "@sotechy/shared";
import { colors, gutter, radius, space } from "@/lib/theme";
import { ProductCard } from "./product-card";
import { Txt } from "./ui";

/** Horizontal product row. `dark` puts it on an ink panel to break up long pages. */
export function ProductRail({
  title,
  subtitle,
  products,
  dark,
  onSeeAll,
}: {
  title: string;
  subtitle?: string;
  products: CatalogProduct[];
  dark?: boolean;
  onSeeAll?: () => void;
}) {
  if (products.length === 0) return null;
  const header = (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space.md, paddingHorizontal: dark ? space.lg : gutter }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="heading" color={dark ? colors.white : colors.ink} style={{ fontSize: 21 }}>{title}</Txt>
        {subtitle ? <Txt variant="label" color={dark ? colors.brandYellow : colors.brandPressed}>{subtitle}</Txt> : null}
      </View>
      {onSeeAll && (
        <Pressable
          onPress={onSeeAll}
          accessibilityLabel={`See all ${title}`}
          style={{ height: 34, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: dark ? colors.white : colors.ink, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="arrow-forward" size={18} color={dark ? colors.ink : colors.white} />
        </Pressable>
      )}
    </View>
  );
  const row = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: dark ? space.lg : gutter, gap: space.md }}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} width={150} />
      ))}
    </ScrollView>
  );

  if (!dark) {
    return (
      <View>
        {header}
        {row}
      </View>
    );
  }
  return (
    <View style={{ marginHorizontal: gutter, backgroundColor: colors.ink, borderRadius: radius.xl, paddingVertical: space.lg }}>
      {header}
      {row}
    </View>
  );
}
