import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, ScrollView, View } from "react-native";
import { formatDate, formatNaira, type OrderStatus, type OrderSummary } from "@sotechy/shared";
import { useTabBarInset } from "@/components/tab-bar";
import { useToast } from "@/components/toast";
import { Button, EmptyState, ErrorView, Loading, ScreenHeader, StatusPill, tap, Txt, ui } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { orderSteps } from "@/lib/orders";
import { colors, fonts, gutter, radius, space } from "@/lib/theme";
import { useAsync } from "@/lib/use-async";
import { ProductImage } from "@/components/product-image";

type Segment = "all" | "to_pay" | "active" | "completed" | "cancelled";

const SEGMENTS: { key: Segment; label: string; match: (s: OrderStatus) => boolean }[] = [
  { key: "all", label: "All", match: () => true },
  { key: "to_pay", label: "To pay", match: (s) => s === "pending_payment" || s === "payment_failed" },
  { key: "active", label: "In progress", match: (s) => ["paid", "processing", "ready_for_pickup", "dispatched"].includes(s) },
  { key: "completed", label: "Completed", match: (s) => s === "delivered" },
  { key: "cancelled", label: "Cancelled", match: (s) => s === "cancelled" || s === "refunded" },
];

function Thumb({ uri, name, size = 52 }: { uri?: string | null; name: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: 13, borderWidth: 2, borderColor: colors.surface, overflow: "hidden" }}>
      <ProductImage uri={uri} name={name} style={{ flex: 1 }} padding={4} iconSize={22} />
    </View>
  );
}

function MiniProgress({ order }: { order: OrderSummary }) {
  const steps = orderSteps(order.fulfilmentType);
  const current = steps.findIndex((s) => s.status === order.status);
  if (current < 0) return null;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {steps.map((s, i) => (
          <View key={s.status} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i <= current ? colors.brand : colors.line }} />
        ))}
      </View>
      <View style={ui.between}>
        <Txt variant="caption" color={colors.brandPressed} style={{ fontFamily: fonts.semibold }}>{steps[current].label}</Txt>
        {current < steps.length - 1 && <Txt variant="caption">Next: {steps[current + 1].label}</Txt>}
      </View>
    </View>
  );
}

function OrderCard({ order }: { order: OrderSummary }) {
  const cart = useCart();
  const toast = useToast();
  const open = () => router.push({ pathname: "/order/[id]", params: { id: order.id } });
  const toPay = order.status === "pending_payment";
  const finished = order.status === "delivered" || order.status === "cancelled" || order.status === "refunded";
  const first = order.items[0];
  const extra = order.items.length - 1;

  const buyAgain = () => {
    tap();
    for (const i of order.items) {
      cart.add({ variantId: i.variantId, productId: i.productId ?? i.variantId, productName: i.productName, variantName: i.variantName, unitPrice: i.unitPrice, imageUrl: i.imageUrl ?? null }, i.quantity);
    }
    toast("Added to cart again", { action: { label: "View", onPress: () => router.push("/cart") } });
  };

  return (
    <Pressable onPress={open} style={({ pressed }) => [ui.card, { gap: space.md, padding: space.lg, opacity: pressed ? 0.9 : 1 }]}>
      <View style={[ui.between, { alignItems: "flex-start" }]}>
        <View style={{ gap: 2 }}>
          <Txt variant="label" style={{ fontSize: 15 }}>{order.orderNumber}</Txt>
          <Txt variant="caption">
            {formatDate(order.createdAt)} · {order.fulfilmentType === "pickup" ? "Store pickup" : "Delivery"}
          </Txt>
        </View>
        <StatusPill status={order.status} />
      </View>

      <View style={[ui.row, { gap: space.md }]}>
        <View style={{ flexDirection: "row" }}>
          {order.items.slice(0, 3).map((i, idx) => (
            <View key={i.id} style={{ marginLeft: idx === 0 ? 0 : -14, zIndex: 3 - idx }}>
              <Thumb uri={i.imageUrl} name={i.productName} />
            </View>
          ))}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="medium" numberOfLines={1}>{first?.productName ?? "Order"}</Txt>
          <Txt variant="caption">
            {extra > 0 ? `+ ${extra} more item${extra === 1 ? "" : "s"}` : `Qty ${first?.quantity ?? 1}`}
          </Txt>
        </View>
      </View>

      {!finished && <MiniProgress order={order} />}

      <View style={[ui.between, { paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.line }]}>
        <View>
          <Txt variant="caption">Total</Txt>
          <Txt variant="price" style={{ fontSize: 17 }}>{formatNaira(order.total)}</Txt>
        </View>
        {toPay ? (
          <Button title="Pay now" size="sm" icon="wallet-outline" onPress={open} />
        ) : finished ? (
          <Button title={order.status === "delivered" ? "Buy again" : "Order again"} size="sm" variant="outline" icon="refresh" onPress={buyAgain} />
        ) : (
          <Button title="Track order" size="sm" variant="dark" icon="navigate-outline" onPress={open} />
        )}
      </View>
    </Pressable>
  );
}

export default function OrdersScreen() {
  const { user } = useAuth();
  const tabInset = useTabBarInset();
  const [segment, setSegment] = useState<Segment>("all");
  const orders = useAsync(async () => (user ? api.myOrders() : []), [user?.id]);

  // Tabs stay mounted, so refresh when the tab comes back into view (e.g. after checkout).
  useFocusEffect(
    useCallback(() => {
      orders.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  if (!user) {
    return (
      <View style={ui.screen}>
        <ScreenHeader title="Orders" />
        <EmptyState
          illo="receipt"
          title="Track your orders"
          message="Sign in to see payment status, pickup details and delivery updates."
          action={<Button title="Sign in" onPress={() => router.push("/sign-in")} />}
        />
      </View>
    );
  }

  const all = orders.data ?? [];
  const active = SEGMENTS.find((s) => s.key === segment)!;
  const visible = all.filter((o) => active.match(o.status));
  const toPay = all.filter((o) => o.status === "pending_payment");

  return (
    <View style={ui.screen}>
      <ScreenHeader title="Orders" subtitle={all.length ? `${all.length} order${all.length === 1 ? "" : "s"}` : undefined} />

      {/* Sub-menu */}
      <View style={{ flexShrink: 0 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: gutter, gap: space.sm, paddingBottom: space.md }}>
          {SEGMENTS.map((s) => {
            const count = all.filter((o) => s.match(o.status)).length;
            const on = s.key === segment;
            return (
              <Pressable
                key={s.key}
                onPress={() => {
                  tap();
                  setSegment(s.key);
                }}
                style={{ height: 38, paddingHorizontal: 14, borderRadius: radius.pill, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: on ? colors.inverse : colors.surface, borderWidth: 1, borderColor: on ? colors.inverse : colors.line }}
              >
                <Txt variant="label" color={on ? colors.onInverse : colors.ink2} style={{ fontSize: 13.5 }}>{s.label}</Txt>
                {count > 0 && s.key !== "all" && (
                  <View style={{ minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, backgroundColor: on ? colors.brand : colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
                    <Txt variant="caption" color={on ? colors.white : colors.ink2} style={{ fontSize: 11, fontFamily: fonts.bold }}>{count}</Txt>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {orders.loading && !orders.data ? (
        <Loading />
      ) : orders.error ? (
        <ErrorView message={orders.error} onRetry={orders.reload} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(o) => o.id}
          onRefresh={orders.reload}
          refreshing={orders.loading}
          contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: tabInset + space.lg, gap: space.md, flexGrow: 1 }}
          ListHeaderComponent={
            segment === "all" && toPay.length > 0 ? (
              <Pressable
                onPress={() => setSegment("to_pay")}
                style={{ flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.warningSoft, marginBottom: space.xs }}
              >
                <Ionicons name="time-outline" size={20} color={colors.warning} />
                <Txt variant="small" color={colors.ink2} style={{ flex: 1 }}>
                  {toPay.length} order{toPay.length === 1 ? " is" : "s are"} waiting for payment. Items are only held for a short time.
                </Txt>
                <Ionicons name="chevron-forward" size={16} color={colors.warning} />
              </Pressable>
            ) : undefined
          }
          ListEmptyComponent={
            <EmptyState
              illo="receipt"
              title={segment === "all" ? "No orders yet" : `Nothing in “${active.label}”`}
              message={segment === "all" ? "When you place an order it will appear here." : "Orders will show up here when they reach this stage."}
              action={segment === "all" ? <Button title="Browse products" variant="outline" onPress={() => router.push("/shop")} /> : undefined}
            />
          }
          renderItem={({ item }) => <OrderCard order={item} />}
        />
      )}
    </View>
  );
}
