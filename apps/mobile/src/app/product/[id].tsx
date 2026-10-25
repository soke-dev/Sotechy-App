import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Image, ScrollView, Text, View } from "react-native";
import { formatNaira, stockLabel } from "@sotechy/shared";
import { Button, Card, Chip, ErrorView, ImagePlaceholder, Loading, styles } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { colors } from "@/lib/theme";
import { useAsync } from "@/lib/use-async";

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: product, error, loading, reload } = useAsync(() => api.product(id), [id]);
  const [variantId, setVariantId] = useState<string | null>(null);
  const cart = useCart();
  const { user } = useAuth();

  if (loading && !product) return <Loading />;
  if (error || !product) return <ErrorView message={error ?? "Not found"} onRetry={reload} />;

  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0];
  const stock = product.stock.filter((s) => s.variantId === variant?.id);
  const available = stock.reduce((n, s) => n + s.quantity - s.reserved, 0);

  function addToCart() {
    if (!variant || !product) return;
    cart.add({
      variantId: variant.id,
      productId: product.id,
      productName: product.name,
      variantName: variant.name,
      unitPrice: variant.price,
      imageUrl: product.images[0] ?? null,
    });
    Alert.alert("Added to cart", product.name);
  }

  async function toggleWishlist() {
    if (!user) return router.push("/sign-in");
    const res = await api.toggleWishlist(product!.id);
    Alert.alert(res.saved ? "Saved to wishlist" : "Removed from wishlist");
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: product.brand ?? "Product" }} />
      {product.images[0] ? <Image source={{ uri: product.images[0] }} style={{ height: 260, borderRadius: 10 }} resizeMode="contain" /> : <ImagePlaceholder height={260} />}

      <View style={{ gap: 6 }}>
        <Text style={{ fontSize: 20, fontWeight: "700" }}>{product.name}</Text>
        {product.model && <Text style={styles.muted}>Model: {product.model}</Text>}
        <View style={styles.row}>
          <Text style={[styles.price, { fontSize: 22 }]}>{formatNaira(variant?.price)}</Text>
          {variant?.compareAtPrice ? <Text style={styles.strike}>{formatNaira(variant.compareAtPrice)}</Text> : null}
        </View>
        <Text style={{ color: available > 0 ? colors.success : colors.danger }}>{stockLabel(available, product.lowStockThreshold)}</Text>
      </View>

      {product.variants.length > 1 && (
        <View style={[styles.row, { flexWrap: "wrap" }]}>
          {product.variants.map((v) => (
            <Chip key={v.id} label={v.name} active={v.id === variant?.id} onPress={() => setVariantId(v.id)} />
          ))}
        </View>
      )}

      <View style={styles.row}>
        <Button title="Add to cart" onPress={addToCart} disabled={available <= 0} style={{ flex: 1 }} />
        <Button title="♡" variant="secondary" onPress={toggleWishlist} />
      </View>

      <Card>
        <Text style={{ fontWeight: "600" }}>Availability by branch</Text>
        {stock.length === 0 && <Text style={styles.muted}>Not stocked at any branch yet.</Text>}
        {stock.map((s) => (
          <View key={s.branchId} style={[styles.row, { justifyContent: "space-between" }]}>
            <Text>{s.branchName}</Text>
            <Text style={styles.muted}>{stockLabel(s.quantity - s.reserved, product.lowStockThreshold)}</Text>
          </View>
        ))}
        <Text style={[styles.muted, { fontSize: 12 }]}>
          {[product.allowDelivery && "Delivery", product.allowPickup && "Store pickup"].filter(Boolean).join(" · ")}
        </Text>
      </Card>

      {product.description && (
        <Card>
          <Text style={{ fontWeight: "600" }}>Description</Text>
          <Text>{product.description}</Text>
        </Card>
      )}

      {Object.keys(product.specifications).length > 0 && (
        <Card>
          <Text style={{ fontWeight: "600" }}>Specifications</Text>
          {Object.entries(product.specifications).map(([k, v]) => (
            <View key={k} style={[styles.row, { justifyContent: "space-between" }]}>
              <Text style={styles.muted}>{k}</Text>
              <Text>{v}</Text>
            </View>
          ))}
        </Card>
      )}

      <Card>
        <Text style={{ fontWeight: "600" }}>Warranty & returns</Text>
        <Text style={styles.muted}>Condition: {product.condition}</Text>
        <Text style={styles.muted}>{product.warrantyMonths ? `${product.warrantyMonths}-month warranty` : "Warranty details to be confirmed"}</Text>
        {product.returnPolicy && <Text style={styles.muted}>{product.returnPolicy}</Text>}
      </Card>
    </ScrollView>
  );
}
