import { Link, router } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";
import { formatDate, formatNaira, ORDER_STATUS_LABELS } from "@sotechy/shared";
import { Button, Empty, ErrorView, Loading, styles } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { spacing } from "@/lib/theme";
import { useAsync } from "@/lib/use-async";

export default function OrdersScreen() {
  const { user } = useAuth();
  const orders = useAsync(async () => (user ? api.myOrders() : []), [user?.id]);

  if (!user) {
    return (
      <Empty title="Sign in to see your orders">
        <Button title="Sign in" onPress={() => router.push("/sign-in")} />
      </Empty>
    );
  }
  if (orders.loading && !orders.data) return <Loading />;
  if (orders.error) return <ErrorView message={orders.error} onRetry={orders.reload} />;

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
      data={orders.data}
      keyExtractor={(o) => o.id}
      onRefresh={orders.reload}
      refreshing={orders.loading}
      ListEmptyComponent={<Empty title="No orders yet" />}
      renderItem={({ item }) => (
        <Link href={{ pathname: "/order/[id]", params: { id: item.id } }} asChild>
          <Pressable style={styles.card}>
            <View style={[styles.row, { justifyContent: "space-between" }]}>
              <Text style={{ fontWeight: "600" }}>{item.orderNumber}</Text>
              <Text>{ORDER_STATUS_LABELS[item.status]}</Text>
            </View>
            <Text style={styles.muted}>{formatDate(item.createdAt)}</Text>
            <Text style={styles.price}>{formatNaira(item.total)}</Text>
          </Pressable>
        </Link>
      )}
    />
  );
}
