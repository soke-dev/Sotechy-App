import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { formatNaira, PAYMENT_METHOD_LABELS, type FulfilmentType, type PaymentMethodCode } from "@sotechy/shared";
import { Button, Card, Chip, ErrorView, Input, Loading, SectionTitle, styles } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { colors } from "@/lib/theme";
import { useAsync } from "@/lib/use-async";

const newKey = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

export default function CheckoutScreen() {
  const cart = useCart();
  const { user } = useAuth();
  const config = useAsync(() => api.storeConfig());
  // One key per checkout attempt so a double tap or retry can't create two orders.
  const [idempotencyKey] = useState(newKey);
  const [fulfilment, setFulfilment] = useState<FulfilmentType>("pickup");
  const [branchId, setBranchId] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethodCode | null>(null);
  const [cryptoAsset, setCryptoAsset] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [address, setAddress] = useState({ recipientName: user?.fullName ?? "", phone: user?.phone ?? "", line1: "", line2: "", city: "", state: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (config.loading && !config.data) return <Loading />;
  if (config.error || !config.data) return <ErrorView message={config.error ?? "Could not load checkout"} onRetry={config.reload} />;

  const cfg = config.data;
  const methods = cfg.paymentMethods.filter((m) => m.isEnabled && m.online);
  const selectedBranch = branchId ?? cfg.branches[0]?.id ?? null;
  const selectedMethod = method ?? methods[0]?.code ?? null;
  const deliveryEstimate =
    fulfilment === "delivery" && !(cfg.delivery.freeOver != null && cart.subtotal >= cfg.delivery.freeOver) ? cfg.delivery.flatFee : 0;

  async function placeOrder() {
    if (!selectedBranch || !selectedMethod) return;
    setSubmitting(true);
    setError(null);
    try {
      const order = await api.placeOrder({
        items: cart.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
        fulfilmentType: fulfilment,
        branchId: selectedBranch,
        deliveryAddress: fulfilment === "delivery" ? address : undefined,
        paymentMethod: selectedMethod,
        cryptoAsset: selectedMethod === "crypto" ? (cryptoAsset ?? cfg.cryptoAssets[0]?.symbol) : undefined,
        promoCode: promoCode.trim() || undefined,
        idempotencyKey,
      });
      cart.clear();
      if (selectedMethod === "card") {
        const { authorizationUrl } = await api.startCardPayment(order.id);
        await WebBrowser.openBrowserAsync(authorizationUrl);
      }
      router.replace({ pathname: "/order/[id]", params: { id: order.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place order");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SectionTitle>How do you want it?</SectionTitle>
      <View style={styles.row}>
        <Chip label="Store pickup" active={fulfilment === "pickup"} onPress={() => setFulfilment("pickup")} />
        <Chip label="Delivery" active={fulfilment === "delivery"} onPress={() => setFulfilment("delivery")} />
      </View>

      <Card>
        <Text style={{ fontWeight: "600" }}>{fulfilment === "pickup" ? "Pickup branch" : "Ships from"}</Text>
        {cfg.branches.map((b) => (
          <Chip key={b.id} label={`${b.name} — ${b.city}`} active={selectedBranch === b.id} onPress={() => setBranchId(b.id)} />
        ))}
      </Card>

      {fulfilment === "delivery" && (
        <Card>
          <Text style={{ fontWeight: "600" }}>Delivery address</Text>
          <Input label="Recipient name" value={address.recipientName} onChangeText={(v) => setAddress({ ...address, recipientName: v })} />
          <Input label="Phone" keyboardType="phone-pad" value={address.phone} onChangeText={(v) => setAddress({ ...address, phone: v })} />
          <Input label="Address" value={address.line1} onChangeText={(v) => setAddress({ ...address, line1: v })} />
          <Input label="Address line 2" value={address.line2} onChangeText={(v) => setAddress({ ...address, line2: v })} />
          <Input label="City" value={address.city} onChangeText={(v) => setAddress({ ...address, city: v })} />
          <Input label="State" value={address.state} onChangeText={(v) => setAddress({ ...address, state: v })} />
          {cfg.delivery.note && <Text style={styles.muted}>{cfg.delivery.note}</Text>}
        </Card>
      )}

      <SectionTitle>Payment</SectionTitle>
      <View style={[styles.row, { flexWrap: "wrap" }]}>
        {methods.map((m) => (
          <Chip key={m.code} label={PAYMENT_METHOD_LABELS[m.code]} active={selectedMethod === m.code} onPress={() => setMethod(m.code)} />
        ))}
      </View>
      {selectedMethod === "crypto" && (
        <View style={[styles.row, { flexWrap: "wrap" }]}>
          {cfg.cryptoAssets.map((a) => (
            <Chip key={a.id} label={`${a.symbol} (${a.network})`} active={(cryptoAsset ?? cfg.cryptoAssets[0]?.symbol) === a.symbol} onPress={() => setCryptoAsset(a.symbol)} />
          ))}
        </View>
      )}
      <Input placeholder="Promo code (optional)" autoCapitalize="characters" value={promoCode} onChangeText={setPromoCode} />

      <Card>
        {cart.lines.map((l) => (
          <View key={l.variantId} style={[styles.row, { justifyContent: "space-between" }]}>
            <Text style={{ flex: 1 }} numberOfLines={1}>
              {l.quantity} × {l.productName}
            </Text>
            <Text>{formatNaira(l.unitPrice * l.quantity)}</Text>
          </View>
        ))}
        <View style={[styles.row, { justifyContent: "space-between" }]}>
          <Text>Delivery</Text>
          <Text>{formatNaira(deliveryEstimate)}</Text>
        </View>
        <View style={[styles.row, { justifyContent: "space-between" }]}>
          <Text style={{ fontWeight: "700" }}>Estimated total</Text>
          <Text style={styles.price}>{formatNaira(cart.subtotal + deliveryEstimate)}</Text>
        </View>
        <Text style={[styles.muted, { fontSize: 12 }]}>Final total, including eligible discounts, is confirmed on the next screen.</Text>
      </Card>

      {error && <Text style={{ color: colors.danger }}>{error}</Text>}
      <Button title="Place order" onPress={placeOrder} loading={submitting} disabled={!selectedMethod || !selectedBranch || cart.lines.length === 0} />
    </ScrollView>
  );
}
