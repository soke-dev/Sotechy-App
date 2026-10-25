import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, View } from "react-native";
import { formatNaira, PAYMENT_METHOD_LABELS, type FulfilmentType, type PaymentMethodCode } from "@sotechy/shared";
import { BottomBar, Button, Chip, Divider, ErrorView, Input, Loading, OptionRow, Pill, SummaryRow, tap, Txt, ui, type IconName } from "@/components/ui";
import { AddressCard } from "@/components/address-card";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { colors, gutter, radius, space } from "@/lib/theme";
import { useAsync } from "@/lib/use-async";
import { Illo, type IlloName } from "@/components/illustrations";

const newKey = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

const methodIllo: Record<PaymentMethodCode, IlloName> = {
  bank_transfer: "bank",
  online: "card",
  crypto: "coin",
  cash: "wallet",
  pos_terminal: "card",
};

function Section({ step, title, children }: { step: number; title: string; children: ReactNode }) {
  return (
    <View style={{ gap: space.md }}>
      <View style={ui.row}>
        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.inverse, alignItems: "center", justifyContent: "center" }}>
          <Txt variant="caption" color={colors.onInverse}>{step}</Txt>
        </View>
        <Txt variant="heading">{title}</Txt>
      </View>
      {children}
    </View>
  );
}

function FulfilmentCard({ illo, title, subtitle, active, onPress }: { illo: IlloName; title: string; subtitle: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={{ flex: 1, padding: space.lg, borderRadius: radius.lg, borderWidth: active ? 1.5 : 1, borderColor: active ? colors.ink : colors.line, backgroundColor: active ? colors.surface : colors.bg, gap: 6 }}
    >
      <Illo name={illo} size={38} />
      <Txt variant="label">{title}</Txt>
      <Txt variant="caption">{subtitle}</Txt>
    </Pressable>
  );
}

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
  const [address, setAddress] = useState({ recipientName: user?.fullName ?? "", phone: user?.phone ?? "", line1: "", line2: "", city: "Benin City", state: "Edo" });
  const [submitting, setSubmitting] = useState(false);
  const saved = useAsync(async () => (user ? api.addresses() : []), [user?.id]);
  // null = use the default saved address; "new" = type a new one; otherwise a saved address id
  const [addressId, setAddressId] = useState<string | null>(null);
  const [saveNew, setSaveNew] = useState(true);

  useFocusEffect(
    useCallback(() => {
      saved.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );
  const [error, setError] = useState<string | null>(null);

  if (config.loading && !config.data) return <Loading />;
  if (config.error || !config.data) return <ErrorView message={config.error ?? "Could not load checkout"} onRetry={config.reload} />;

  const cfg = config.data;
  const methods = cfg.paymentMethods.filter((m) => m.isEnabled && m.online);
  const selectedBranch = branchId ?? cfg.branches[0]?.id ?? null;
  const selectedMethod = method ?? methods[0]?.code ?? null;
  const selectedAsset = cryptoAsset ?? cfg.cryptoAssets[0]?.symbol ?? null;
  const freeDelivery = cfg.delivery.freeOver != null && cart.subtotal >= cfg.delivery.freeOver;
  const deliveryFee = fulfilment === "delivery" && !freeDelivery ? cfg.delivery.flatFee : 0;
  const movePromo = cfg.promotions.find((p) => p.cryptoAsset === "MOVE" && p.paymentMethod === "crypto");
  const estDiscount =
    movePromo && selectedMethod === "crypto" && selectedAsset === "MOVE"
      ? Math.min(movePromo.maxDiscountAmount ?? Infinity, Math.round((cart.subtotal * movePromo.value) / 100))
      : 0;
  const total = cart.subtotal + deliveryFee - estDiscount;
  const savedList = saved.data ?? [];
  const chosenId = addressId ?? savedList.find((a) => a.isDefault)?.id ?? savedList[0]?.id ?? "new";
  const chosen = savedList.find((a) => a.id === chosenId);
  const addressOk = fulfilment === "pickup" || !!chosen || !!(address.recipientName && address.phone && address.line1 && address.city);

  async function placeOrder() {
    if (!selectedBranch || !selectedMethod) return;
    setSubmitting(true);
    setError(null);
    try {
      const order = await api.placeOrder({
        items: cart.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
        fulfilmentType: fulfilment,
        branchId: selectedBranch,
        deliveryAddress:
          fulfilment !== "delivery"
            ? undefined
            : chosen
              ? { recipientName: chosen.recipientName, phone: chosen.phone, line1: chosen.line1, line2: chosen.line2 ?? undefined, city: chosen.city, state: chosen.state }
              : address,
        paymentMethod: selectedMethod,
        cryptoAsset: selectedMethod === "crypto" ? (selectedAsset ?? undefined) : undefined,
        promoCode: promoCode.trim() || undefined,
        idempotencyKey,
      });
      cart.clear();
      if (fulfilment === "delivery" && !chosen && saveNew && user) {
        // Remember the new address for next time; the order already succeeded, so ignore failures.
        api.addAddress({ ...address, label: savedList.length ? "Other" : "Home", line2: address.line2 || null }).catch(() => {});
      }
      if (selectedMethod === "online") {
        try {
          const { checkoutUrl } = await api.startOnlinePayment(order.id);
          await WebBrowser.openBrowserAsync(checkoutUrl);
        } catch {
          // The order exists; payment can be retried from the order screen.
        }
      }
      router.replace({ pathname: "/order/[id]", params: { id: order.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place order");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={ui.screen} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={{ padding: gutter, gap: space.xxl, paddingBottom: space.xxl }} keyboardShouldPersistTaps="handled">
        <Section step={1} title="How do you want it?">
          <View style={[ui.row, { gap: space.md, alignItems: "stretch" }]}>
            <FulfilmentCard illo="store" title="Store pickup" subtitle="Free · usually same day" active={fulfilment === "pickup"} onPress={() => setFulfilment("pickup")} />
            <FulfilmentCard
              illo="bike"
              title="Delivery"
              subtitle={freeDelivery ? "Free for this order" : `${formatNaira(cfg.delivery.flatFee)} · 1–2 days`}
              active={fulfilment === "delivery"}
              onPress={() => setFulfilment("delivery")}
            />
          </View>
        </Section>

        <Section step={2} title={fulfilment === "pickup" ? "Pickup store" : "Delivery details"}>
          {fulfilment === "delivery" && (
            <View style={{ gap: space.md }}>
              {savedList.map((a) => (
                <AddressCard key={a.id} address={a} selected={chosenId === a.id} onPress={() => setAddressId(a.id)} />
              ))}
              {savedList.length > 0 && (
                <OptionRow illo="pin" title="Use a different address" subtitle="Enter a new delivery address" selected={chosenId === "new"} onPress={() => setAddressId("new")} />
              )}
              {chosenId === "new" && (
                <View style={{ gap: space.md }}>
                  <Input label="Full name" icon="person-outline" value={address.recipientName} onChangeText={(v) => setAddress({ ...address, recipientName: v })} />
                  <Input label="Phone number" icon="call-outline" keyboardType="phone-pad" value={address.phone} onChangeText={(v) => setAddress({ ...address, phone: v })} />
                  <Input label="Street address" icon="home-outline" value={address.line1} onChangeText={(v) => setAddress({ ...address, line1: v })} />
                  <Input label="Landmark or apartment (optional)" value={address.line2} onChangeText={(v) => setAddress({ ...address, line2: v })} />
                  <View style={[ui.row, { gap: space.md }]}>
                    <View style={{ flex: 1 }}>
                      <Input label="City" value={address.city} onChangeText={(v) => setAddress({ ...address, city: v })} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Input label="State" value={address.state} onChangeText={(v) => setAddress({ ...address, state: v })} />
                    </View>
                  </View>
                  {user && (
                    <View style={[ui.card, ui.between, { paddingVertical: space.md }]}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Txt variant="label">Save this address</Txt>
                        <Txt variant="small">Pick it in one tap next time</Txt>
                      </View>
                      <Switch value={saveNew} onValueChange={setSaveNew} trackColor={{ true: colors.brand, false: colors.line }} thumbColor={colors.white} />
                    </View>
                  )}
                </View>
              )}
              {savedList.length > 0 && (
                <Pressable onPress={() => router.push("/addresses")} style={{ alignSelf: "flex-start" }} hitSlop={8}>
                  <Txt variant="label" color={colors.brandPressed}>Manage saved addresses</Txt>
                </Pressable>
              )}
              <Txt variant="label" style={{ marginTop: space.sm }}>Ships from</Txt>
            </View>
          )}
          {cfg.branches.map((b) => (
            <OptionRow key={b.id} illo="store" title={b.name} subtitle={`${b.address}, ${b.city}`} selected={selectedBranch === b.id} onPress={() => setBranchId(b.id)} />
          ))}
        </Section>

        <Section step={3} title="Payment">
          {methods.map((m) => (
            <OptionRow
              key={m.code}
              illo={methodIllo[m.code]}
              title={PAYMENT_METHOD_LABELS[m.code]}
              subtitle={m.code === "bank_transfer" ? "Pay into our account, we confirm it" : m.code === "online" ? "Card or bank via Money Moves" : "Pay with supported crypto"}
              selected={selectedMethod === m.code}
              onPress={() => setMethod(m.code)}
              right={m.code === "crypto" && movePromo ? <Pill label={`-${movePromo.value}% $MOVE`} tone="brand" /> : undefined}
            />
          ))}
          {selectedMethod === "crypto" && cfg.cryptoAssets.length > 0 && (
            <View style={[ui.row, { flexWrap: "wrap" }]}>
              {cfg.cryptoAssets.map((a) => (
                <Chip key={a.id} label={`${a.symbol} · ${a.network}`} active={selectedAsset === a.symbol} onPress={() => setCryptoAsset(a.symbol)} />
              ))}
            </View>
          )}
          <Input icon="pricetag-outline" placeholder="Promo code (optional)" autoCapitalize="characters" value={promoCode} onChangeText={setPromoCode} />
        </Section>

        <View style={ui.card}>
          <Txt variant="heading" style={{ marginBottom: space.sm }}>Order summary</Txt>
          {cart.lines.map((l) => (
            <SummaryRow key={l.variantId} label={`${l.quantity} × ${l.productName}`} value={formatNaira(l.unitPrice * l.quantity)} />
          ))}
          <Divider style={{ marginVertical: space.sm }} />
          <SummaryRow label="Subtotal" value={formatNaira(cart.subtotal)} />
          <SummaryRow label="Delivery" value={fulfilment === "pickup" ? "Free" : formatNaira(deliveryFee)} />
          {estDiscount > 0 && <SummaryRow label="$MOVE discount" value={`-${formatNaira(estDiscount)}`} tone={colors.success} />}
          <Divider style={{ marginVertical: space.sm }} />
          <SummaryRow label="Total" value={formatNaira(total)} strong />
          <Txt variant="caption" style={{ marginTop: space.sm }}>Final amount is confirmed by Sotechy when the order is placed.</Txt>
        </View>

        {error && (
          <View style={{ backgroundColor: colors.dangerSoft, borderRadius: radius.md, padding: space.md, flexDirection: "row", gap: space.sm }}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Txt variant="small" color={colors.danger} style={{ flex: 1 }}>{error}</Txt>
          </View>
        )}
      </ScrollView>
      <BottomBar>
        <Button
          title={`Place order · ${formatNaira(total)}`}
          variant="dark"
          onPress={placeOrder}
          loading={submitting}
          disabled={!selectedMethod || !selectedBranch || cart.lines.length === 0 || !addressOk}
          style={{ flex: 1 }}
        />
      </BottomBar>
    </KeyboardAvoidingView>
  );
}
