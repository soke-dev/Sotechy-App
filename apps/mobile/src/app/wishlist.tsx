import { router } from "expo-router";
import { FlatList, View } from "react-native";
import { ProductCard } from "@/components/product-card";
import { Button, Empty, ErrorView, Loading, styles } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { spacing } from "@/lib/theme";
import { useAsync } from "@/lib/use-async";

export default function WishlistScreen() {
  const { user } = useAuth();
  const wishlist = useAsync(async () => (user ? api.wishlist() : []), [user?.id]);

  if (!user) {
    return (
      <Empty title="Sign in to save products">
        <Button title="Sign in" onPress={() => router.push("/sign-in")} />
      </Empty>
    );
  }
  if (wishlist.loading && !wishlist.data) return <Loading />;
  if (wishlist.error) return <ErrorView message={wishlist.error} onRetry={wishlist.reload} />;

  return (
    <FlatList
      style={styles.screen}
      data={wishlist.data}
      keyExtractor={(p) => p.id}
      numColumns={2}
      columnWrapperStyle={{ gap: 12 }}
      contentContainerStyle={{ padding: spacing.lg, gap: 12 }}
      renderItem={({ item }) => (
        <View style={{ flex: 1 }}>
          <ProductCard product={item} />
        </View>
      )}
      ListEmptyComponent={<Empty title="Nothing saved yet" />}
    />
  );
}
