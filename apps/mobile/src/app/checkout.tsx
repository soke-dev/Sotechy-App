import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, View } from "react-native";
import { areaDeliveryFee, deliveryAreaFor, formatNaira, formatUsd, type FulfilmentType, type PromoCheck } from "@sotechy/shared";
import { AddressCard } from "@/components/address-card";
import { Illo, type IlloName } from "@/components/illustrations";
import { PayOptionsLine, useMoneyMoves } from "@/components/money-moves";
import { useToast } from "@/components/toast";
import { BottomBar, Button, Divider, ErrorView, Input, Loading, OptionRow, SummaryRow, tap, Txt, PhoneInput, ui } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { useFeatures } from "@/lib/store-config";
import { colors, gutter, radius, space } from "@/lib/theme";
import { useAsync } from "@/lib/use-async";
import { loadStore } from "@/lib/marketplace";

const newKey = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

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
  const toast = useToast();
  const moneyMoves = useMoneyMoves();
  const features = useFeatures();
  const config = useAsync(() => api.storeConfig());
  const fx = useAsync(() => api.exchangeRate());
  // One key per checkout attempt so a double tap or retry can't create two orders.
  const [idempotencyKey] = useState(newKey);
  const [chosenFulfilment, setFulfilment] = useState<FulfilmentType>("pickup");
  const [branchId, setBranchId] = useState<string | null>(null);
  const [pickupZoneId, setPickupZoneId] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promo, setPromo] = useState<PromoCheck | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [checkingPromo, setCheckingPromo] = useState(false);
  const [address, setAddress] = useState({ recipientName: user?.fullName ?? "", phone: user?.phone ?? "", line1: "", line2: "", city: "Benin City", state: "Edo" });
  const [submitting, setSubmitting] = useState(false);
  const saved = useAsync(async () => (user ? api.addresses() : []), [user?.id]);
  // A marketplace store's order ships from (or is collected at) that store
  const seller = cart.seller;
  const sellerInfo = useAsync(async () => (seller ? loadStore(seller.slug) : null), [seller?.slug]);
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
  // Switches from admin: fall back to whichever of delivery/pickup is still on.
  const fulfilment: FulfilmentType =
    chosenFulfilment === "pickup" && !features.pickup ? "delivery" : chosenFulfilment === "delivery" && !features.delivery ? "pickup" : chosenFulfilment;
  const paused = !features.ordering || (!features.delivery && !features.pickup);
  const promoOn = features.promoCodes;
  // Deliveries go out from the main store; pickup lets the customer choose.
  const selectedBranch = seller?.branchId ?? (fulfilment === "pickup" ? branchId : null) ?? cfg.branches[0]?.id ?? null;
  const discount = features.promoCodes ? (promo?.discount ?? 0) : 0;
  const savedList = saved.data ?? [];
  const chosenId = addressId ?? savedList.find((a) => a.isDefault)?.id ?? savedList[0]?.id ?? "new";
  const chosen = savedList.find((a) => a.id === chosenId);
  const addressOk = fulfilment === "pickup" || !!chosen || !!(address.recipientName && address.phone && address.line1 && address.city);
  // A store charges from its own delivery areas (the API works out the same fee)
  const areas = sellerInfo.data?.areas ?? [];
  const where = chosen ?? address;
  const sellerArea = seller && fulfilment === "delivery" ? deliveryAreaFor(areas, where.state, where.city) : null;
  const pickupPoints = areas.filter((a) => a.pickupPoint);
  const pickupPoint = pickupPoints.find((a) => a.id === pickupZoneId) ?? pickupPoints[0] ?? null;
  // The store doesn't deliver to the address (known once its areas have loaded)
  const outOfArea = !!seller && fulfilment === "delivery" && !!sellerInfo.data && !!where.city && !sellerArea;
  const freeDelivery = !seller && cfg.delivery.freeOver != null && cart.subtotal >= cfg.delivery.freeOver;
  const deliveryFee = seller
    ? fulfilment === "delivery"
      ? sellerArea
        ? areaDeliveryFee(sellerArea, cart.subtotal)
        : 0
      : (pickupPoint?.pickupFee ?? 0)
    : fulfilment === "delivery" && !freeDelivery
      ? cfg.delivery.flatFee
      : 0;
  const cheapestDelivery = areas.length ? Math.min(...areas.map((a) => a.homeFee)) : null;
  const total = Math.max(0, cart.subtotal + deliveryFee - discount);

  /** Checks the typed code; the order checks it again with real prices. */
  async function checkPromo(): Promise<PromoCheck | null> {
    const code = promoCode.trim();
    if (!code) return null;
    setCheckingPromo(true);
    setPromoError(null);
    try {
      const result = await api.checkPromo({ code, subtotal: cart.subtotal });
      setPromo(result);
      tap();
      return result;
    } catch (err) {
      setPromo(null);
      setPromoError(err instanceof Error ? err.message : "Promo code is not valid");
      throw err;
    } finally {
      setCheckingPromo(false);
    }
  }

  async function proceedToPayment() {
    if (!selectedBranch) return;
    setError(null);
    // A typed but unapplied code is checked first so it can't fail after payment opens.
    let applied = promoOn ? promo : null;
    if (promoOn && !applied && promoCode.trim()) {
      try {
        applied = await checkPromo();
      } catch {
        return;
      }
    }
    setSubmitting(true);
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
        // Money Moves handles every method (bank transfer, crypto, its app) in its own window.
        paymentMethod: "online",
        promoCode: applied?.code,
        idempotencyKey,
        pickupZoneId: seller && fulfilment === "pickup" ? (pickupPoint?.id ?? undefined) : undefined,
      });
      cart.clear();
      if (fulfilment === "delivery" && !chosen && saveNew && user) {
        // Remember the new address for next time; the order already succeeded, so ignore failures.
        api.addAddress({ ...address, label: savedList.length ? "Other" : "Home", line2: address.line2 || null }).catch(() => {});
      }
      let paid = false;
      try {
        paid = await moneyMoves.pay({ id: order.id, orderNumber: order.orderNumber, total: order.total });
      } catch {
        toast("Payment didn't open. You can pay from your order.", { icon: "alert-circle" });
      }
      // Without an in-app confirmation, the order screen keeps checking until the payment lands.
      router.replace({ pathname: "/order/[id]", params: paid ? { id: order.id } : { id: order.id, checking: "1" } });
      if (paid) toast("Payment received", { icon: "checkmark-circle" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place order");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={ui.screen} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={{ padding: gutter, gap: space.xxl, paddingBottom: space.xxl }} keyboardShouldPersistTaps="handled">
        {paused && (
          <View style={{ flexDirection: "row", gap: space.md, alignItems: "center", backgroundColor: colors.warningSoft, borderRadius: radius.lg, padding: space.lg }}>
            <Ionicons name="pause-circle" size={26} color={colors.warning} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="label">Ordering is paused right now</Txt>
              <Txt variant="small" color={colors.ink2}>Your cart is saved. Please check back soon, or contact us to order.</Txt>
            </View>
          </View>
        )}
        <Section step={1} title="How do you want it?">
          {seller && (
            <Txt variant="small" color={colors.ink2}>
              This order comes from <Txt variant="label" style={{ fontSize: 14 }}>{seller.name}</Txt>. They send it to you, or have it ready to collect.
            </Txt>
          )}
          <View style={[ui.row, { gap: space.md, alignItems: "stretch" }]}>
            {features.pickup && <FulfilmentCard illo="store" title="Store pickup" subtitle={seller ? (pickupPoints.length ? `From ${formatNaira(Math.min(...pickupPoints.map((p) => p.pickupFee ?? 0)))}` : "Collect from the store") : "Free · usually same day"} active={fulfilment === "pickup"} onPress={() => setFulfilment("pickup")} />}
            {features.delivery && <FulfilmentCard
              illo="bike"
              title="Delivery"
              subtitle={
                seller
                  ? sellerArea
                    ? `${deliveryFee ? formatNaira(deliveryFee) : "Free"} · ${sellerArea.days}`
                    : cheapestDelivery != null
                      ? `From ${formatNaira(cheapestDelivery)}`
                      : "Not available yet"
                  : freeDelivery
                    ? "Free for this order"
                    : `${formatNaira(cfg.delivery.flatFee)} · 1–2 days`
              }
              active={fulfilment === "delivery"}
              onPress={() => setFulfilment("delivery")}
            />}
          </View>
        </Section>

        <Section step={2} title={fulfilment === "pickup" ? "Pickup store" : "Delivery details"}>
          {fulfilment === "pickup" &&
            seller &&
            (pickupPoints.length ? (
              pickupPoints.map((p) => (
                <OptionRow
                  key={p.id}
                  illo="store"
                  title={p.pickupPoint ?? seller.name}
                  subtitle={`${p.state} · ${p.pickupFee ? formatNaira(p.pickupFee) : "Free"} · ${p.days}`}
                  selected={pickupPoint?.id === p.id}
                  onPress={() => setPickupZoneId(p.id)}
                />
              ))
            ) : (
              <OptionRow illo="store" title={seller.name} subtitle="The store tells you where and when to collect" selected onPress={() => {}} />
            ))}
          {fulfilment === "pickup" &&
            !seller &&
            cfg.branches.map((b) => (
              <OptionRow key={b.id} illo="store" title={b.name} subtitle={`${b.address}, ${b.city}`} selected={selectedBranch === b.id} onPress={() => setBranchId(b.id)} />
            ))}
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
                  <PhoneInput label="Phone number" value={address.phone} onChange={(v) => setAddress({ ...address, phone: v })} />
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
            </View>
          )}
          {outOfArea && (
            <View style={{ flexDirection: "row", gap: space.sm, padding: space.md, borderRadius: 14, backgroundColor: colors.surfaceAlt }}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.warning} />
              <Txt variant="small" color={colors.ink2} style={{ flex: 1 }}>
                {seller?.name} doesn&apos;t deliver to {where.city}, {where.state} yet.
                {sellerInfo.data?.delivery.states.length ? ` They deliver to ${sellerInfo.data.delivery.states.join(", ")}.` : ""}
                {pickupPoints.length ? " You can collect from them instead." : ""}
              </Txt>
            </View>
          )}
        </Section>

        <Section step={3} title="Payment">
          <View style={[ui.card, { flexDirection: "row", gap: space.md, alignItems: "center" }]}>
            <Illo name="wallet" size={38} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="label">Secure payment with Money Moves</Txt>
              <Txt variant="small">The Money Moves window opens when you tap Proceed to payment. Nothing is charged until you confirm there.</Txt>
            </View>
            <Ionicons name="lock-closed" size={18} color={colors.success} />
          </View>

          {!promoOn ? null : promo ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm, backgroundColor: colors.successSoft, borderRadius: radius.md, padding: space.md }}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <View style={{ flex: 1 }}>
                <Txt variant="label" color={colors.success}>{promo.code} applied</Txt>
                <Txt variant="small" color={colors.ink2}>{promo.name} · you save {formatNaira(promo.discount)}</Txt>
              </View>
              <Pressable
                onPress={() => {
                  setPromo(null);
                  setPromoCode("");
                }}
                hitSlop={8}
              >
                <Txt variant="label" color={colors.ink2}>Remove</Txt>
              </Pressable>
            </View>
          ) : (
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
                <View style={{ flex: 1 }}>
                  <Input
                    icon="pricetag-outline"
                    placeholder="Promo code (optional)"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    value={promoCode}
                    onChangeText={(t) => {
                      setPromoCode(t);
                      setPromoError(null);
                    }}
                    onSubmitEditing={() => checkPromo().catch(() => {})}
                    returnKeyType="done"
                  />
                </View>
                <Button title="Apply" variant="outline" onPress={() => checkPromo().catch(() => {})} loading={checkingPromo} disabled={!promoCode.trim()} />
              </View>
              {promoError && <Txt variant="small" color={colors.danger}>{promoError}</Txt>}
            </View>
          )}
        </Section>

        <View style={ui.card}>
          <Txt variant="heading" style={{ marginBottom: space.sm }}>Order summary</Txt>
          {cart.lines.map((l) => (
            <SummaryRow key={l.variantId} label={`${l.quantity} × ${l.productName}`} value={formatNaira(l.unitPrice * l.quantity)} />
          ))}
          <Divider style={{ marginVertical: space.sm }} />
          <SummaryRow label="Subtotal" value={formatNaira(cart.subtotal)} />
          <SummaryRow label={fulfilment === "pickup" ? "Pickup" : "Delivery"} value={deliveryFee ? formatNaira(deliveryFee) : "Free"} />
          {discount > 0 && <SummaryRow label={`Promo (${promo?.code})`} value={`-${formatNaira(discount)}`} tone={colors.success} />}
          <Divider style={{ marginVertical: space.sm }} />
          <View style={[ui.between, { paddingVertical: 4 }]}>
            <Txt variant="label">Total</Txt>
            <View style={[ui.row, { gap: space.sm }]}>
              {features.usdPrices && fx.data ? <Txt variant="small">≈ {formatUsd(total, fx.data.rate)}</Txt> : null}
              <Txt variant="price">{formatNaira(total)}</Txt>
            </View>
          </View>
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
        <View style={{ flex: 1, gap: space.sm }}>
          <Button
            title={paused ? "Ordering paused" : `Proceed to payment · ${formatNaira(total)}`}
            icon="lock-closed"
            variant="dark"
            onPress={proceedToPayment}
            loading={submitting || checkingPromo}
            disabled={paused || !selectedBranch || cart.lines.length === 0 || !addressOk || outOfArea}
          />
          <PayOptionsLine />
        </View>
      </BottomBar>
      {moneyMoves.sheet}
    </KeyboardAvoidingView>
  );
}
