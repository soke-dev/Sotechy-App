import Ionicons from "@expo/vector-icons/Ionicons";
import * as Clipboard from "expo-clipboard";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { formatDate, formatNaira, ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, type OrderDetail } from "@sotechy/shared";
import { useDialog } from "@/components/dialog";
import { PayChoiceSheet, useMoneyMoves } from "@/components/money-moves";
import { useToast } from "@/components/toast";
import { Button, Divider, ErrorView, Loading, SummaryRow, tap, Txt, ui } from "@/components/ui";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { orderSteps, statusCopy } from "@/lib/orders";
import { colors, fonts, gutter, radius, space } from "@/lib/theme";
import { useAsync } from "@/lib/use-async";
import { openWhatsApp } from "@/lib/whatsapp";
import { Illo, type IlloName } from "@/components/illustrations";
import { ProductImage } from "@/components/product-image";

function Section({ title, illo, right, children }: { title: string; illo: IlloName; right?: ReactNode; children: ReactNode }) {
  return (
    <View style={[ui.card, { gap: space.md }]}>
      <View style={ui.between}>
        <View style={ui.row}>
          <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
            <Illo name={illo} size={26} />
          </View>
          <Txt variant="heading" style={{ fontSize: 17 }}>{title}</Txt>
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

function CopyRow({ label, value, onCopy }: { label: string; value: string | null | undefined; onCopy: (v: string) => void }) {
  return (
    <View style={[ui.between, { paddingVertical: space.sm, gap: space.md }]}>
      <Txt variant="small">{label}</Txt>
      <Pressable disabled={!value} onPress={() => value && onCopy(value)} style={[ui.row, { flexShrink: 1 }]} hitSlop={6}>
        <Txt variant="label" selectable numberOfLines={1} style={{ flexShrink: 1 }}>{value ?? "To be provided"}</Txt>
        {value ? <Ionicons name="copy-outline" size={15} color={colors.brandPressed} /> : null}
      </Pressable>
    </View>
  );
}

/** Minutes left on the stock hold, updated every 30 seconds. */
function useMinutesLeft(until: string | null) {
  const calc = () => (until ? Math.max(0, Math.ceil((new Date(until).getTime() - Date.now()) / 60_000)) : null);
  const [left, setLeft] = useState(calc);
  useEffect(() => {
    if (!until) return;
    const t = setInterval(() => setLeft(calc()), 30_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [until]);
  return left;
}

function Hero({ order, onCopy }: { order: OrderDetail; onCopy: (v: string) => void }) {
  const steps = orderSteps(order.fulfilmentType);
  const current = steps.findIndex((s) => s.status === order.status);
  const copy = statusCopy(order.status, order.fulfilmentType);
  const minutes = useMinutesLeft(order.status === "pending_payment" ? order.reservationExpiresAt : null);
  const stopped = order.status === "cancelled" || order.status === "refunded" || order.status === "payment_failed";

  return (
    <View style={{ backgroundColor: colors.panel, borderRadius: radius.xl, padding: space.xl, gap: space.lg, overflow: "hidden" }}>
      <View style={{ position: "absolute", right: -60, top: -60, width: 180, height: 180, borderRadius: 90, backgroundColor: stopped ? "#4A403A" : colors.brand, opacity: 0.9 }} />
      <View style={{ position: "absolute", right: -90, top: -90, width: 240, height: 240, borderRadius: 120, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.08)" }} />

      <Pressable onPress={() => onCopy(order.orderNumber)} style={[ui.row, { alignSelf: "flex-start" }]} hitSlop={6}>
        <Txt variant="overline" color="#C9C0B6">Order {order.orderNumber}</Txt>
        <Ionicons name="copy-outline" size={13} color="#C9C0B6" />
      </Pressable>
      <View style={{ gap: 6, maxWidth: "85%" }}>
        <Txt variant="title" color={colors.white} style={{ fontFamily: fonts.displayHeavy, fontSize: 26, lineHeight: 29 }}>{copy.title}</Txt>
        <Txt variant="small" color="#D9D0C6">{copy.body}</Txt>
      </View>

      {minutes != null && (
        <View style={[ui.row, { alignSelf: "flex-start", backgroundColor: "rgba(253,185,19,0.16)", borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 }]}>
          <Ionicons name="time-outline" size={14} color={colors.brandYellow} />
          <Txt variant="caption" color={colors.brandYellow} style={{ fontFamily: fonts.semibold }}>
            {minutes > 0 ? `Items held for ${minutes} more min` : "Hold expired. Pay soon or contact us"}
          </Txt>
        </View>
      )}

      {!stopped && current >= 0 && (
        <View style={{ gap: space.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {steps.map((s, i) => (
              <View key={s.status} style={{ flex: i === steps.length - 1 ? 0 : 1, flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: i === current ? 22 : 16,
                    height: i === current ? 22 : 16,
                    borderRadius: 11,
                    backgroundColor: i <= current ? colors.brand : "#4A403A",
                    borderWidth: i === current ? 4 : 0,
                    borderColor: "rgba(247,147,30,0.35)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {i < current ? <Ionicons name="checkmark" size={10} color={colors.white} /> : null}
                </View>
                {i < steps.length - 1 && <View style={{ flex: 1, height: 3, marginHorizontal: 4, borderRadius: 2, backgroundColor: i < current ? colors.brand : "#4A403A" }} />}
              </View>
            ))}
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {steps.map((s, i) => (
              <Txt key={s.status} variant="caption" color={i === current ? colors.white : "#9E948A"} style={{ fontSize: 11, fontFamily: i === current ? fonts.bold : fonts.medium }}>
                {s.label}
              </Txt>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

export default function OrderScreen() {
  const { id, checking } = useLocalSearchParams<{ id: string; checking?: string }>();
  const { data: order, error, loading, reload } = useAsync(() => api.order(id), [id]);
  const config = useAsync(() => api.storeConfig());
  // Delivered orders have a receipt, recorded on Monad (none before then)
  const receipt = useAsync(() => api.orderReceipt(id).catch(() => null), [id]);
  const [cancelling, setCancelling] = useState(false);
  const [paying, setPaying] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const moneyMoves = useMoneyMoves();
  const [payOpen, setPayOpen] = useState(false);
  // After Money Moves closes, look for the payment for a minute (the webhook can take a few seconds).
  const [watchUntil, setWatchUntil] = useState(checking ? Date.now() + 60_000 : 0);
  const watching = !!order && order.status === "pending_payment" && watchUntil > Date.now();
  useEffect(() => {
    if (!watching) return;
    const t = setTimeout(reload, 4000);
    return () => clearTimeout(t);
  }, [watching, order, reload]);
  useEffect(() => {
    if (watchUntil && order?.status === "paid") {
      setWatchUntil(0);
      toast("Payment received", { icon: "checkmark-circle" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.status]);
  const toast = useToast();
  const dialog = useDialog();
  const cart = useCart();

  if (loading && !order) return <Loading />;
  if (error || !order) return <ErrorView message={error ?? "Order not found"} onRetry={reload} />;

  const pi = order.paymentInstructions;
  const support = config.data?.support;
  const finished = order.status === "delivered" || order.status === "cancelled" || order.status === "refunded";
  const store = order.branch;
  const mapsUrl = store ? `https://maps.google.com/?q=${encodeURIComponent(`${store.address}, ${store.city}, Nigeria`)}` : null;
  const history = [...order.history].reverse();

  /** The customer says they got it, so the store's last payment can go */
  async function confirmReceived() {
    setConfirming(true);
    try {
      await api.confirmReceived(order!.id);
      tap();
      toast("Thanks for confirming", { icon: "checkmark-circle" });
      await reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't confirm. Try again.", { icon: "alert-circle" });
    } finally {
      setConfirming(false);
    }
  }

  async function copy(value: string) {
    await Clipboard.setStringAsync(value);
    tap();
    toast("Copied", { icon: "copy" });
  }

  async function cancel() {
    const ok = await dialog.confirm({
      title: "Cancel this order?",
      message: "Your reserved items will be released. You can place a new order any time.",
      illo: "box",
      confirmLabel: "Cancel order",
      cancelLabel: "Keep order",
      tone: "danger",
    });
    if (!ok) return;
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

  async function payNow() {
    setPaying(true);
    try {
      const paid = await moneyMoves.pay({ id: order!.id, orderNumber: order!.orderNumber, total: order!.total });
      if (!paid) setWatchUntil(Date.now() + 60_000);
      await reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Payment didn't open", { icon: "alert-circle" });
    } finally {
      setPaying(false);
    }
  }

  function buyAgain() {
    tap();
    for (const i of order!.items) {
      cart.add({ variantId: i.variantId, productId: i.productId ?? i.variantId, productName: i.productName, variantName: i.variantName, unitPrice: i.unitPrice, imageUrl: i.imageUrl ?? null }, i.quantity);
    }
    toast("Added to cart again", { action: { label: "View", onPress: () => router.push("/cart") } });
  }

  return (
    <ScrollView style={ui.screen} contentContainerStyle={{ padding: gutter, gap: space.lg, paddingBottom: space.xxl * 2 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.brand} />}>
      <Stack.Screen options={{ title: "Track order" }} />

      <Hero order={order} onCopy={copy} />

      {watching && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm, backgroundColor: colors.brandSoft, borderRadius: radius.md, padding: space.md }}>
          <ActivityIndicator color={colors.brandPressed} />
          <Txt variant="small" color={colors.ink2} style={{ flex: 1 }}>Checking for your Money Moves payment. This usually takes a few seconds.</Txt>
        </View>
      )}

      {order.status === "delivered" && !order.customerConfirmedAt && (
        <View style={[ui.card, { gap: space.md }]}>
          <View style={[ui.row, { gap: space.md }]}>
            <Illo name="box" size={38} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="label">{order.fulfilmentType === "pickup" ? "Did you collect your order?" : "Did you get your order?"}</Txt>
              <Txt variant="small">Let the store know it reached you. If something&apos;s wrong, contact support instead.</Txt>
            </View>
          </View>
          <Button title="Yes, I got it" icon="checkmark-circle" variant="dark" loading={confirming} onPress={confirmReceived} />
        </View>
      )}

      {pi && (
        <Section title="How to pay" illo="wallet" right={<Txt variant="caption">{PAYMENT_METHOD_LABELS[pi.method]}</Txt>}>
          <View style={{ backgroundColor: colors.brandSoft, borderRadius: radius.md, padding: space.md, gap: 2 }}>
            <Txt variant="caption" color={colors.brandPressed}>Amount to pay</Txt>
            <Txt variant="display" style={{ fontSize: 28, lineHeight: 32 }}>{formatNaira(order.total)}</Txt>
          </View>
          <View>
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
            {pi.method === "online" && <Txt variant="small">{pi.text}</Txt>}
          </View>
          {pi.method === "online" ? (
            <>
              <Button
                title="Proceed to payment"
                icon="lock-closed"
                variant="dark"
                loading={paying}
                onPress={() => {
                  tap();
                  setPayOpen(true);
                }}
              />
              <PayChoiceSheet visible={payOpen} amount={order.total} onClose={() => setPayOpen(false)} onPay={() => void payNow()} />
            </>
          ) : (
            <>
              <Button
                title="I've paid: send proof on WhatsApp"
                variant="outline"
                icon="logo-whatsapp"
                onPress={() => openWhatsApp(support?.whatsapp, `Hello Sotechy, I've paid ${formatNaira(order.total)} for order ${order.orderNumber}. Here is my proof of payment:`)}
              />
              <Txt variant="caption">We confirm payments against our bank or wallet records. Screenshots alone don&apos;t confirm an order.</Txt>
            </>
          )}
        </Section>
      )}

      <Section title="Order updates" illo="receipt">
        {history.map((h, i) => {
          const latest = i === 0;
          return (
            <View key={h.id} style={{ flexDirection: "row", gap: space.md }}>
              <View style={{ alignItems: "center", width: 14 }}>
                <View style={{ width: 14, height: 14, borderRadius: 7, marginTop: 3, backgroundColor: latest ? colors.brand : colors.surface, borderWidth: latest ? 3 : 2, borderColor: latest ? colors.brandSoft : colors.line }} />
                {i < history.length - 1 && <View style={{ flex: 1, width: 2, backgroundColor: colors.line, marginTop: 2 }} />}
              </View>
              <View style={{ flex: 1, paddingBottom: i < history.length - 1 ? space.lg : 0, gap: 2 }}>
                <Txt variant="label" color={latest ? colors.ink : colors.ink2}>{ORDER_STATUS_LABELS[h.toStatus]}</Txt>
                {h.note ? <Txt variant="small">{h.note}</Txt> : null}
                <Txt variant="caption" color={colors.faint}>{formatDate(h.createdAt)}</Txt>
              </View>
            </View>
          );
        })}
      </Section>

      <Section title={`Items (${order.items.reduce((n, i) => n + i.quantity, 0)})`} illo="box" right={finished ? <Button title="Buy again" size="sm" variant="outline" icon="refresh" onPress={buyAgain} /> : undefined}>
        {order.items.map((i, idx) => (
          <View key={i.id}>
            {idx > 0 && <Divider style={{ marginBottom: space.md }} />}
            <Pressable onPress={() => i.productId && router.push({ pathname: "/product/[id]", params: { id: i.productId } })} style={[ui.row, { gap: space.md }]}>
              <ProductImage uri={i.imageUrl} name={i.productName} style={{ width: 60, height: 60 }} radius={12} padding={5} iconSize={24} />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt variant="medium" numberOfLines={2}>{i.productName}</Txt>
                <Txt variant="caption">
                  {i.variantName !== "Standard" ? `${i.variantName} · ` : ""}Qty {i.quantity} × {formatNaira(i.unitPrice)}
                </Txt>
              </View>
              <Txt variant="price">{formatNaira(i.lineTotal)}</Txt>
            </Pressable>
          </View>
        ))}
      </Section>

      <Section title={order.fulfilmentType === "pickup" ? "Pickup" : "Delivery"} illo={order.fulfilmentType === "pickup" ? "store" : "bike"}>
        {order.fulfilmentType === "pickup" && store ? (
          <>
            <View style={{ gap: 2 }}>
              <Txt variant="label">{store.name}</Txt>
              <Txt variant="small">{store.address}, {store.city}</Txt>
              {store.openingHours ? <Txt variant="caption">Open {store.openingHours}</Txt> : null}
            </View>
            <View style={[ui.row, { gap: space.sm }]}>
              <Button title="Directions" icon="navigate-outline" variant="outline" size="sm" style={{ flex: 1 }} onPress={() => mapsUrl && Linking.openURL(mapsUrl)} />
              <Button title="Call store" icon="call-outline" variant="outline" size="sm" style={{ flex: 1 }} disabled={!(store.phone ?? support?.phone)} onPress={() => Linking.openURL(`tel:${(store.phone ?? support?.phone ?? "").replace(/[^\d+]/g, "")}`)} />
            </View>
            <Txt variant="caption">Bring your order number ({order.orderNumber}) when you collect.</Txt>
          </>
        ) : order.deliveryAddress ? (
          <View style={{ gap: 2 }}>
            <Txt variant="label">{order.deliveryAddress.recipientName}</Txt>
            <Txt variant="small">
              {order.deliveryAddress.line1}
              {order.deliveryAddress.line2 ? `, ${order.deliveryAddress.line2}` : ""}, {order.deliveryAddress.city}, {order.deliveryAddress.state}
            </Txt>
            <Txt variant="caption">{order.deliveryAddress.phone} · Ships from {store?.name ?? "our store"}</Txt>
          </View>
        ) : null}
      </Section>

      <Section title="Payment summary" illo="card">
        <View>
          <SummaryRow label="Subtotal" value={formatNaira(order.subtotal)} />
          {order.discountTotal > 0 && <SummaryRow label="Discount" value={`-${formatNaira(order.discountTotal)}`} tone={colors.success} />}
          <SummaryRow label="Delivery" value={order.deliveryFee ? formatNaira(order.deliveryFee) : "Free"} />
          {order.tokensValue > 0 && <SummaryRow label="Paid with tokens" value={`-${formatNaira(order.tokensValue)}`} tone={colors.success} />}
          <Divider style={{ marginVertical: space.sm }} />
          <SummaryRow label={order.tokensValue > 0 ? "Paid in money" : "Total"} value={formatNaira(order.total)} strong />
          <SummaryRow label="Paid with" value={`${PAYMENT_METHOD_LABELS[order.paymentMethod]}${order.cryptoAsset ? ` (${order.cryptoAsset})` : ""}`} />
          <SummaryRow label="Placed" value={formatDate(order.createdAt)} />
        </View>
      </Section>

      {order.status === "delivered" && receipt.data && (
        <Pressable
          disabled={!receipt.data.nftUrl && !receipt.data.txUrl}
          onPress={() => {
            const url = receipt.data?.nftUrl ?? receipt.data?.txUrl;
            if (url) Linking.openURL(url);
          }}
          style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, backgroundColor: pressed ? colors.surfaceAlt : colors.surface })}
        >
          <Illo name="receipt" size={40} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="label">Receipt #{receipt.data.id}</Txt>
            <Txt variant="caption">{receipt.data.txUrl ? "Recorded on Monad. Tap to see it. Only a fingerprint is public, never your details or what you paid." : "Being recorded on Monad…"}</Txt>
          </View>
          {receipt.data.txUrl && <Ionicons name="open-outline" size={18} color={colors.muted} />}
        </Pressable>
      )}

      <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius.xl, padding: space.lg, gap: space.md }}>
        <View style={{ gap: 2 }}>
          <Txt variant="label">Need help with this order?</Txt>
          <Txt variant="small">Our team can answer questions about payment, pickup or delivery.</Txt>
        </View>
        <View style={[ui.row, { gap: space.sm }]}>
          <Button title="WhatsApp" icon="logo-whatsapp" variant="dark" size="sm" style={{ flex: 1 }} onPress={() => openWhatsApp(support?.whatsapp, `Hello Sotechy, I need help with order ${order.orderNumber}.`)} />
          <Button title="Call us" icon="call-outline" variant="outline" size="sm" style={{ flex: 1 }} disabled={!support?.phone} onPress={() => Linking.openURL(`tel:${(support?.phone ?? "").replace(/[^\d+]/g, "")}`)} />
        </View>
      </View>

      {order.status === "pending_payment" && <Button title="Cancel order" variant="danger" icon="close-circle-outline" onPress={cancel} loading={cancelling} />}
      {moneyMoves.sheet}
    </ScrollView>
  );
}
