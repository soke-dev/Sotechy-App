import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { FlatList, View } from "react-native";
import { formatDate, formatNaira, PAYMENT_METHOD_LABELS } from "@sotechy/shared";
import { Button, Card, EmptyState, ErrorView, Loading, ScreenHeader, StatusPill, Txt, ui } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors, gutter, space } from "@/lib/theme";
import { useAsync } from "@/lib/use-async";

export default function OrdersScreen() {
  const { user } = useAuth();
  const orders = useAsync(async () => (user ? api.myOrders() : []), [user?.id]);

  // Tabs stay mounted, so refresh when the tab comes back into view (e.g. after checkout).
  useFocusEffect(
    useCallback(() => {
      orders.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  return (
    <View style={ui.screen}>
      <ScreenHeader title="Orders" />
      {!user ? (
        <EmptyState
          icon="receipt-outline"
          title="Track your orders"
          message="Sign in to see payment status, pickup details and delivery updates."
          action={<Button title="Sign in" onPress={() => router.push("/sign-in")} />}
        />
      ) : orders.loading && !orders.data ? (
        <Loading />
      ) : orders.error ? (
        <ErrorView message={orders.error} onRetry={orders.reload} />
      ) : (
        <FlatList
          data={orders.data}
          keyExtractor={(o) => o.id}
          onRefresh={orders.reload}
          refreshing={orders.loading}
          contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: space.xxl, gap: space.md, flexGrow: 1 }}
          ListEmptyComponent={
            <EmptyState icon="receipt-outline" title="No orders yet" message="When you place an order it will appear here." action={<Button title="Browse products" variant="outline" onPress={() => router.push("/shop")} />} />
          }
          renderItem={({ item }) => (
            <Card onPress={() => router.push({ pathname: "/order/[id]", params: { id: item.id } })} style={{ gap: space.md }}>
              <View style={ui.between}>
                <Txt variant="label">{item.orderNumber}</Txt>
                <StatusPill status={item.status} />
              </View>
              <View style={ui.between}>
                <View style={{ gap: 2 }}>
                  <Txt variant="small">{formatDate(item.createdAt)}</Txt>
                  <View style={ui.row}>
                    <Ionicons name={item.fulfilmentType === "pickup" ? "storefront-outline" : "bicycle-outline"} size={14} color={colors.muted} />
                    <Txt variant="caption">{item.fulfilmentType === "pickup" ? "Pickup" : "Delivery"} · {PAYMENT_METHOD_LABELS[item.paymentMethod]}</Txt>
                  </View>
                </View>
                <View style={ui.row}>
                  <Txt variant="price">{formatNaira(item.total)}</Txt>
                  <Ionicons name="chevron-forward" size={18} color={colors.faint} />
                </View>
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}
