import Ionicons from "@expo/vector-icons/Ionicons";
import * as Clipboard from "expo-clipboard";
import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { formatDate, formatNaira, ORDER_FLOW, ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS } from "@sotechy/shared";
import { useToast } from "@/components/toast";
import { Button, Divider, ErrorView, Loading, StatusPill, SummaryRow, tap, Txt, ui } from "@/components/ui";
import { api } from "@/lib/api";
import { colors, gutter, radius, space } from "@/lib/theme";
import { useAsync } from "@/lib/use-async";

function CopyRow({ label, value, onCopy }: { label: string; value: string | null | undefined; onCopy: (v: string) => void }) {
  return (
    <View style={[ui.between, { paddingVertical: space.sm, gap: space.md }]}>
      <Txt variant="small">{label}</Txt>
      <View style={[ui.row, { flexShrink: 1 }]}>
        <Txt variant="label" selectable numberOfLines={1} style={{ flexShrink: 1 }}>{value ?? "To be provided"}</Txt>
        {value ? (
          <Pressable onPress={() => onCopy(value)} hitSlop={8}>
            <Ionicons name="copy-outline" size={16} color={colors.brandPressed} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: order, error, loading, reload } = useAsync(() => api.order(id), [id]);
  const [cancelling, setCancelling] = useState(false);
  const toast = useToast();

  if (loading && !order) return <Loading />;
  if (error || !order) return <ErrorView message={error ?? "Order not found"} onRetry={reload} />;

  const pi = order.paymentInstructions;
  const flow = ORDER_FLOW.filter((s) => (order.fulfilmentType === "pickup" ? s !== "dispatched" : s !== "ready_for_pickup"));
  const current = flow.indexOf(order.status);
  const headline =
    order.status === "pending_payment" ? "Waiting for your payment" : order.status === "delivered" ? (order.fulfilmentType === "pickup" ? "Collected" : "Delivered") : ORDER_STATUS_LABELS[order.status];

  async function copy(value: string) {
    await Clipboard.setStringAsync(value);
    tap();
    toast("Copied", { icon: "copy" });
  }

  async function cancel() {
    setCancelling(true);
    try {
      await api.cancelOrder(order!.id);
      await reload();
      toast("Order cancelled", { icon: "close-circle" });
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not cancel", { icon: "alert-circle" });
    } finally {
      setCancelling(false);
    }
  }

  return (
    <ScrollView style={ui.screen} contentContainerStyle={{ padding: gutter, gap: space.lg, paddingBottom: space.xxl * 2 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.brand} />}>
      <Stack.Screen options={{ title: order.orderNumber }} />

      <View style={{ gap: 6 }}>
        <StatusPill status={order.status} />
        <Txt variant="title">{headline}</Txt>
        <Txt variant="small">Placed {formatDate(order.createdAt)} · {order.fulfilmentType === "pickup" ? "Store pickup" : "Delivery"}</Txt>
      </View>

      {current >= 0 && (
        <View style={ui.card}>
          {flow.map((s, i) => {
            const done = i <= current;
            const last = i === flow.length - 1;
            return (
              <View key={s} style={{ flexDirection: "row", gap: space.md }}>
                <View style={{ alignItems: "center", width: 20 }}>
                  <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: done ? colors.ink : colors.surface, borderWidth: done ? 0 : 1.5, borderColor: colors.line, alignItems: "center", justifyContent: "center" }}>
                    {done ? <Ionicons name="checkmark" size={13} color={colors.white} /> : null}
                  </View>
                  {!last && <View style={{ width: 2, flex: 1, minHeight: 18, backgroundColor: i < current ? colors.ink : colors.line }} />}
                </View>
                <Txt variant={i === current ? "label" : "small"} color={done ? colors.ink : colors.muted} style={{ paddingBottom: last ? 0 : space.lg }}>
                  {ORDER_STATUS_LABELS[s]}
                </Txt>
              </View>
            );
          })}
        </View>
      )}

      {pi && (
        <View style={[ui.card, { borderColor: colors.brand, borderWidth: 1.5, gap: space.xs }]}>
          <View style={ui.between}>
            <Txt variant="overline" color={colors.brandPressed}>{PAYMENT_METHOD_LABELS[pi.method]}</Txt>
            {order.reservationExpiresAt ? (
              <View style={ui.row}>
                <Ionicons name="time-outline" size={14} color={colors.warning} />
                <Txt variant="caption" color={colors.warning}>Held until {formatDate(order.reservationExpiresAt).split(", ").pop()}</Txt>
              </View>
            ) : null}
          </View>
          <Txt variant="display" style={{ marginVertical: space.sm }}>{formatNaira(order.total)}</Txt>
          {pi.method === "bank_transfer" && (
            <>
              <CopyRow label="Bank" value={pi.bankName} onCopy={copy} />
              <Divider />
              <CopyRow label="Account name" value={pi.accountName} onCopy={copy} />
              <Divider />
              <CopyRow label="Account number" value={pi.accountNumber} onCopy={copy} />
              <Divider />
              <CopyRow label="Narration" value={order.orderNumber} onCopy={copy} />
            </>
          )}
          {pi.method === "crypto" && (
            <>
              <CopyRow label="Asset" value={pi.cryptoAsset} onCopy={copy} />
              <Divider />
              <CopyRow label="Network" value={pi.cryptoNetwork} onCopy={copy} />
              <Divider />
              <CopyRow label="Address" value={pi.receivingAddress} onCopy={copy} />
            </>
          )}
          {pi.text ? <Txt variant="small" style={{ marginTop: space.sm }}>{pi.text}</Txt> : null}
          <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: space.md, marginTop: space.sm, flexDirection: "row", gap: space.sm }}>
            <Ionicons name="information-circle-outline" size={18} color={colors.ink2} />
            <Txt variant="small" color={colors.ink2} style={{ flex: 1 }}>
              We confirm your order as soon as the payment is verified. Your items are reserved until then.
            </Txt>
          </View>
        </View>
      )}

      <View style={ui.card}>
        <Txt variant="heading" style={{ marginBottom: space.sm }}>Items</Txt>
        {order.items.map((i) => (
          <SummaryRow key={i.id} label={`${i.quantity} × ${i.productName}${i.variantName !== "Standard" ? ` (${i.variantName})` : ""}`} value={formatNaira(i.lineTotal)} />
        ))}
        <Divider style={{ marginVertical: space.sm }} />
        <SummaryRow label="Subtotal" value={formatNaira(order.subtotal)} />
        {order.discountTotal > 0 && <SummaryRow label="Discount" value={`-${formatNaira(order.discountTotal)}`} tone={colors.success} />}
        <SummaryRow label="Delivery" value={order.deliveryFee ? formatNaira(order.deliveryFee) : "Free"} />
        <SummaryRow label="Total" value={formatNaira(order.total)} strong />
      </View>

      <View style={[ui.card, { flexDirection: "row", gap: space.md }]}>
        <Ionicons name={order.fulfilmentType === "pickup" ? "storefront-outline" : "bicycle-outline"} size={22} color={colors.ink2} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="label">{order.fulfilmentType === "pickup" ? `Pick up at ${order.branch?.name ?? "the store"}` : `Deliver to ${order.deliveryAddress?.recipientName ?? ""}`}</Txt>
          <Txt variant="small">
            {order.fulfilmentType === "pickup"
              ? `${order.branch?.address ?? ""}, ${order.branch?.city ?? ""}`
              : `${order.deliveryAddress?.line1 ?? ""}, ${order.deliveryAddress?.city ?? ""} · ${order.deliveryAddress?.phone ?? ""}`}
          </Txt>
        </View>
      </View>

      {order.status === "pending_payment" && <Button title="Cancel order" variant="danger" onPress={cancel} loading={cancelling} />}
    </ScrollView>
  );
}
