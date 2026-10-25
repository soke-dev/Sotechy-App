import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, RefreshControl, ScrollView, Text, View } from "react-native";
import { formatDate, formatNaira, ORDER_FLOW, ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS } from "@sotechy/shared";
import { Button, Card, ErrorView, Loading, styles } from "@/components/ui";
import { api } from "@/lib/api";
import { colors } from "@/lib/theme";
import { useAsync } from "@/lib/use-async";

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: order, error, loading, reload } = useAsync(() => api.order(id), [id]);
  const [cancelling, setCancelling] = useState(false);

  if (loading && !order) return <Loading />;
  if (error || !order) return <ErrorView message={error ?? "Order not found"} onRetry={reload} />;

  const pi = order.paymentInstructions;
  const flow = ORDER_FLOW.filter((s) => (order.fulfilmentType === "pickup" ? s !== "dispatched" : s !== "ready_for_pickup"));
  const currentIndex = flow.indexOf(order.status);

  async function cancel() {
    setCancelling(true);
    try {
      await api.cancelOrder(order!.id);
      await reload();
    } catch (err) {
      Alert.alert("Could not cancel", err instanceof Error ? err.message : "");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}>
      <Card>
        <Text style={{ fontSize: 18, fontWeight: "700" }}>{order.orderNumber}</Text>
        <Text style={styles.muted}>{formatDate(order.createdAt)}</Text>
        <Text style={{ fontWeight: "600", marginTop: 4 }}>{ORDER_STATUS_LABELS[order.status]}</Text>
        {currentIndex >= 0 && (
          <View style={{ gap: 4, marginTop: 8 }}>
            {flow.map((s, i) => (
              <Text key={s} style={{ color: i <= currentIndex ? colors.success : colors.muted }}>
                {i <= currentIndex ? "●" : "○"} {ORDER_STATUS_LABELS[s]}
              </Text>
            ))}
          </View>
        )}
      </Card>

      {pi && (
        <Card style={{ borderColor: colors.warning }}>
          <Text style={{ fontWeight: "700" }}>How to pay — {PAYMENT_METHOD_LABELS[pi.method]}</Text>
          <Text style={styles.price}>Amount: {formatNaira(order.total)}</Text>
          {pi.method === "bank_transfer" && (
            <>
              <Text>Bank: {pi.bankName ?? "to be provided"}</Text>
              <Text>Account name: {pi.accountName ?? "to be provided"}</Text>
              <Text>Account number: {pi.accountNumber ?? "to be provided"}</Text>
              <Text>Narration: {order.orderNumber}</Text>
            </>
          )}
          {pi.method === "crypto" && (
            <>
              <Text>Asset: {pi.cryptoAsset}</Text>
              <Text>Network: {pi.cryptoNetwork}</Text>
              <Text selectable>Address: {pi.receivingAddress ?? "to be provided"}</Text>
            </>
          )}
          {pi.text && <Text style={styles.muted}>{pi.text}</Text>}
          <Text style={[styles.muted, { fontSize: 12 }]}>
            Your order is confirmed once we verify the payment. Items are held for you until{" "}
            {order.reservationExpiresAt ? formatDate(order.reservationExpiresAt) : "the payment window closes"}.
          </Text>
        </Card>
      )}

      <Card>
        <Text style={{ fontWeight: "600" }}>Items</Text>
        {order.items.map((i) => (
          <View key={i.id} style={[styles.row, { justifyContent: "space-between" }]}>
            <Text style={{ flex: 1 }}>
              {i.quantity} × {i.productName} ({i.variantName})
            </Text>
            <Text>{formatNaira(i.lineTotal)}</Text>
          </View>
        ))}
        <View style={[styles.row, { justifyContent: "space-between" }]}><Text>Subtotal</Text><Text>{formatNaira(order.subtotal)}</Text></View>
        {order.discountTotal > 0 && <View style={[styles.row, { justifyContent: "space-between" }]}><Text>Discount</Text><Text>-{formatNaira(order.discountTotal)}</Text></View>}
        <View style={[styles.row, { justifyContent: "space-between" }]}><Text>Delivery</Text><Text>{formatNaira(order.deliveryFee)}</Text></View>
        <View style={[styles.row, { justifyContent: "space-between" }]}><Text style={{ fontWeight: "700" }}>Total</Text><Text style={styles.price}>{formatNaira(order.total)}</Text></View>
      </Card>

      <Card>
        <Text style={{ fontWeight: "600" }}>{order.fulfilmentType === "pickup" ? "Pickup" : "Delivery"}</Text>
        {order.branch && <Text style={styles.muted}>{order.branch.name}, {order.branch.address}, {order.branch.city}</Text>}
        {order.deliveryAddress && (
          <Text style={styles.muted}>
            {order.deliveryAddress.recipientName} · {order.deliveryAddress.line1}, {order.deliveryAddress.city}
          </Text>
        )}
      </Card>

      {order.status === "pending_payment" && <Button title="Cancel order" variant="secondary" onPress={cancel} loading={cancelling} />}
    </ScrollView>
  );
}
