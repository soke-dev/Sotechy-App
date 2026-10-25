import { Image } from "expo-image";
import { Link } from "expo-router";
import { Pressable, View } from "react-native";
import type { CatalogProduct } from "@sotechy/shared";
import { colors, radius, space } from "@/lib/theme";
import { discountPercent, ImagePlaceholder, Pill, Price, productIcon, Txt } from "./ui";

export function ProductCard({ product, width }: { product: CatalogProduct; width?: number }) {
  const off = discountPercent(product.minPrice, product.compareAtPrice);
  const soldOut = product.totalAvailable <= 0;
  // The fixed width lives on a wrapper View: Link's asChild doesn't keep function styles on web.
  return (
    <View style={{ width }}>
      <Link href={{ pathname: "/product/[id]", params: { id: product.slug } }} asChild>
        <Pressable style={{ gap: space.sm }}>
          <View style={{ width: "100%", aspectRatio: 1, borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.surfaceAlt }}>
            {product.imageUrl ? (
              <Image source={{ uri: product.imageUrl }} style={{ flex: 1, opacity: soldOut ? 0.5 : 1 }} contentFit="cover" transition={150} />
            ) : (
              <ImagePlaceholder style={{ flex: 1 }} icon={productIcon(product.name)} size={40} />
            )}
            <View style={{ position: "absolute", top: 8, left: 8, gap: 4 }}>
              {off > 0 && <Pill label={`-${off}%`} tone="dark" />}
              {soldOut && <Pill label="Sold out" tone="neutral" />}
            </View>
          </View>
          <View style={{ gap: 2, paddingHorizontal: 2 }}>
            {product.brand ? <Txt variant="overline">{product.brand}</Txt> : null}
            <Txt variant="medium" numberOfLines={2} style={{ fontSize: 14, lineHeight: 19, minHeight: 38 }}>
              {product.name}
            </Txt>
            <Price amount={product.minPrice} compareAt={product.compareAtPrice} />
            {!soldOut && product.totalAvailable <= 3 ? (
              <Txt variant="caption" color={colors.warning}>Only {product.totalAvailable} left</Txt>
            ) : null}
          </View>
        </Pressable>
      </Link>
    </View>
  );
}
