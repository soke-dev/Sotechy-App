import { Link } from "expo-router";
import { Image, Pressable, Text, View } from "react-native";
import { formatNaira, stockLabel, type CatalogProduct } from "@sotechy/shared";
import { colors } from "@/lib/theme";
import { ImagePlaceholder, styles } from "./ui";

export function ProductCard({ product, width }: { product: CatalogProduct; width?: number }) {
  return (
    <Link href={{ pathname: "/product/[id]", params: { id: product.slug } }} asChild>
      <Pressable style={[styles.card, { width, padding: 8 }]}>
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={{ height: 120, borderRadius: 8 }} resizeMode="cover" />
        ) : (
          <ImagePlaceholder />
        )}
        <Text numberOfLines={2} style={{ fontWeight: "500", minHeight: 36 }}>
          {product.name}
        </Text>
        <View style={styles.row}>
          <Text style={styles.price}>{formatNaira(product.minPrice)}</Text>
          {product.compareAtPrice && product.compareAtPrice > product.minPrice ? (
            <Text style={styles.strike}>{formatNaira(product.compareAtPrice)}</Text>
          ) : null}
        </View>
        <Text style={{ fontSize: 12, color: product.totalAvailable > 0 ? colors.success : colors.danger }}>
          {stockLabel(product.totalAvailable)}
        </Text>
      </Pressable>
    </Link>
  );
}
