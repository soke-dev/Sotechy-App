import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { FlatList, View } from "react-native";
import { ProductCard } from "@/components/product-card";
import { Button, EmptyState, ErrorView, Loading, ui } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { gutter, space } from "@/lib/theme";
import { useGrid } from "@/lib/layout";
import { useAsync } from "@/lib/use-async";

export default function WishlistScreen() {
  const { user } = useAuth();
  const { columns, cardWidth } = useGrid();
  const wishlist = useAsync(async () => (user ? api.wishlist() : []), [user?.id]);

  useFocusEffect(
    useCallback(() => {
      wishlist.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  if (!user) {
    return (
      <EmptyState illo="heart" title="Save what you love" message="Sign in to keep a list of products you want to come back to." action={<Button title="Sign in" onPress={() => router.push("/sign-in")} />} />
    );
  }
  if (wishlist.loading && !wishlist.data) return <Loading />;
  if (wishlist.error) return <ErrorView message={wishlist.error} onRetry={wishlist.reload} />;

  return (
    <View style={ui.screen}>
      <FlatList
        data={wishlist.data}
        key={columns}
        keyExtractor={(p) => p.id}
        numColumns={columns}
        columnWrapperStyle={{ gap: space.md }}
        contentContainerStyle={{ padding: gutter, gap: space.xl, flexGrow: 1 }}
        renderItem={({ item }) => <ProductCard product={item} width={cardWidth} />}
        ListEmptyComponent={<EmptyState illo="heart" title="Nothing saved yet" message="Tap the heart on a product to save it here." />}
      />
    </View>
  );
}
