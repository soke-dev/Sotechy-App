import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { areaDeliveryFee, deliveryAreaFor, formatNaira, formatUsd, nairaToTokens, TOKEN_RULES, tokensToNaira, type FulfilmentType, type PromoCheck } from "@sotechy/shared";
import { AddressCard } from "@/components/address-card";
import { Illo, type IlloName } from "@/components/illustrations";
import { PayChoiceSheet, useMoneyMoves } from "@/components/money-moves";
import { Sheet } from "@/components/shop-filters";
import { useToast } from "@/components/toast";
import { BottomBar, Button, Divider, ErrorView, Input, Loading, OptionRow, SummaryRow, tap, Txt, PhoneInput, ui } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { useFeatures } from "@/lib/store-config";
import { colors, gutter, radius, space } from "@/lib/theme";
import { useAsync } from "@/lib/use-async";
import { loadStore } from "@/lib/marketplace";
import { refreshHeldTokens } from "@/lib/held-tokens";
import { TokenChoice } from "@/components/token-choice";
import { AddressSearch } from "@/components/address-search";

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

function FulfilmentCard({ illo, title, subtitle, active, locked, lockedNote = "Not available for this order", onPress }: { illo: IlloName; title: string; subtitle: string; active: boolean; locked?: boolean; lockedNote?: string; onPress: () => void }) {
  return (
    <Pressable
      disabled={locked}
      onPress={() => {
        tap();
        onPress();
      }}
      style={{ flex: 1, minWidth: 0, gap: 4, padding: space.md, borderRadius: radius.lg, borderWidth: active ? 1.5 : 1, borderColor: active ? colors.ink : colors.line, backgroundColor: active ? colors.surface : colors.bg, opacity: locked ? 0.5 : 1 }}
    >
      <View style={[ui.row, { gap: 6 }]}>
        <Illo name={illo} size={26} />
        <Txt variant="label" numberOfLines={1} style={{ flex: 1, fontSize: 14 }}>{title}</Txt>
        {!locked && <Ionicons name={active ? "radio-button-on" : "radio-button-off"} size={18} color={active ? colors.ink : colors.faint} />}
      </View>
      <Txt variant="caption" numberOfLines={2}>{locked ? lockedNote : subtitle}</Txt>
    </Pressable>
  );
}

interface Spot {
  key: string;
  name: string;
  address: string;
  fee: number | null;
  days: string;
  state: string;
}

/** A pickup point, drawn like a saved delivery address: in the list it's picked with the circle; on the page, Change opens the list */
function PickupCard({ spot, selected, count, onPress, onChange }: { spot: Spot; selected?: boolean; count?: number; onPress?: () => void; onChange?: () => void }) {
  const picking = selected !== undefined;
  return (
    <Pressable
      onPress={() => {
        tap();
        (onPress ?? onChange)?.();
      }}
      disabled={!onPress && !(onChange && (count ?? 0) > 1)}
      style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: selected ? 1.5 : 1, borderColor: selected ? colors.ink : colors.line, padding: space.lg, gap: space.md }}
    >
      <View style={{ flexDirection: "row", gap: space.md }}>
        <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
          <Illo name="pin" size={28} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Txt variant="label">{spot.name}</Txt>
          <Txt variant="small">{spot.address || spot.state}</Txt>
          <Txt variant="caption">
            {spot.fee ? formatNaira(spot.fee) : "Free"} · {spot.days}
          </Txt>
        </View>
        {picking && <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: selected ? 7 : 1.5, borderColor: selected ? colors.ink : colors.faint, marginTop: 2 }} />}
      </View>
      {onChange && (count ?? 0) > 1 && (
        <View style={[ui.between, { gap: space.sm }]}>
          <Txt variant="small">{count} pickup locations</Txt>
          <View style={[ui.row, { gap: 4 }]}>
            <Txt variant="label" color={colors.brandPressed}>Change</Txt>
            <Ionicons name="chevron-down" size={16} color={colors.brandPressed} />
          </View>
        </View>
      )}
    </Pressable>
  );
}

export default function CheckoutScreen() {
  const cart = useCart();
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const moneyMoves = useMoneyMoves();
  const features = useFeatures();
  const config = useAsync(() => api.storeConfig());
  const fx = useAsync(() => api.exchangeRate());
  // One key per checkout attempt so a double tap or retry can't create two orders.
  const [idempotencyKey] = useState(newKey);
  const [chosenFulfilment, setFulfilment] = useState<FulfilmentType>("delivery");
  const [branchId, setBranchId] = useState<string | null>(null);
  const [pickupZoneId, setPickupZoneId] = useState<string | null>(null);
  // Which pickup point in that area (by name), and the list of every point
  const [pickupPlace, setPickupPlace] = useState<string | null>(null);
  const [placesOpen, setPlacesOpen] = useState(false);
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
  // Tokens the customer can pay with here: this store's own and $SOTECHY
  const wallet = useAsync(async () => (user ? api.wallet() : null), [user?.id]);
  const [useTokens, setUseTokens] = useState<Record<string, boolean>>({});
  // Each item says whether it can be delivered, collected, or both
  const productIds = [...new Set(cart.lines.map((l) => l.productId))];
  const products = useAsync(() => Promise.all(productIds.map((id) => api.product(id))), [productIds.join(",")]);
  const [pickingAddress, setPickingAddress] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [tokensOpen, setTokensOpen] = useState(false);
  const [phone, setPhone] = useState(user?.phone ?? "");
  // An address added from checkout is picked as soon as the customer comes back
  const knownIds = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!saved.data) return;
    const ids = saved.data.map((a) => a.id);
    const added = knownIds.current ? ids.find((id) => !knownIds.current!.has(id)) : undefined;
    if (added) setAddressId(added);
    knownIds.current = new Set(ids);
  }, [saved.data]);

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
  // Switches from admin and each item's own rules: fall back to whichever is still allowed.
  const itemsPickup = (products.data ?? []).every((p) => p.allowPickup);
  const itemsDelivery = (products.data ?? []).every((p) => p.allowDelivery);
  // A store's approved areas only: one waiting for Sotechy's approval isn't offered yet
  const areas = sellerInfo.data?.areas ?? [];
  const pickupPoints = areas.filter((a) => a.pickupPoint);
  const storeLoaded = !seller || !!sellerInfo.data;
  const storePickup = !seller || !storeLoaded || pickupPoints.length > 0;
  const storeDelivery = !seller || !storeLoaded || areas.length > 0;
  const canPickup = features.pickup && itemsPickup && storePickup;
  const canDelivery = features.delivery && itemsDelivery && storeDelivery;
  const fulfilment: FulfilmentType = chosenFulfilment === "pickup" && !canPickup && canDelivery ? "delivery" : chosenFulfilment === "delivery" && !canDelivery && canPickup ? "pickup" : chosenFulfilment;
  const onlyOne = canPickup !== canDelivery && !!products.data;
  const paused = features.maintenance || !features.ordering || (!features.delivery && !features.pickup);
  // Neither way works: the store's areas are still being approved, or the items want different ones
  const noWay = !!products.data && storeLoaded && !canPickup && !canDelivery && !paused;
  const notSetUp = !!seller && storeLoaded && areas.length === 0;
  const promoOn = features.promoCodes;
  // Deliveries go out from the main store; pickup lets the customer choose.
  const selectedBranch = seller?.branchId ?? (fulfilment === "pickup" ? branchId : null) ?? cfg.branches[0]?.id ?? null;
  const discount = features.promoCodes ? (promo?.discount ?? 0) : 0;
  const savedList = saved.data ?? [];
  const chosenId = addressId ?? savedList.find((a) => a.isDefault)?.id ?? savedList[0]?.id ?? "new";
  const chosen = savedList.find((a) => a.id === chosenId);
  // Pickup needs a phone so the store can call; delivery needs an address (which has one)
  const phoneOk = !!user?.phone || phone.replace(/\D/g, "").length >= 10;
  const addressOk = fulfilment === "pickup" ? phoneOk : !!chosen || (!user && !!(address.recipientName && address.phone && address.line1 && address.city));
  // A store charges from its own delivery areas (the API works out the same fee)
  const where = chosen ?? address;
  const sellerArea = seller && fulfilment === "delivery" ? deliveryAreaFor(areas, where.state, where.city) : null;
  const pickupPoint = pickupPoints.find((a) => a.id === pickupZoneId) ?? pickupPoints[0] ?? null;
  // Every pickup point across the store's areas (up to 5 an area), each at its own price or the area's
  const spots = pickupPoints.flatMap((a) =>
    (a.pickupPlaces?.length ? a.pickupPlaces : [{ name: a.pickupPoint ?? "", address: a.pickupAddress ?? "", fee: null }]).map((pl) => ({ key: `${a.id}:${pl.name}`, zoneId: a.id, name: pl.name, address: pl.address, fee: pl.fee ?? a.pickupFee, days: a.days, state: a.state })),
  );
  const spot = spots.find((s) => s.zoneId === pickupPoint?.id && (!pickupPlace || s.name === pickupPlace)) ?? spots[0] ?? null;
  const chooseSpot = (s: (typeof spots)[number]) => {
    setPickupZoneId(s.zoneId);
    setPickupPlace(s.name);
  };
  // The store doesn't deliver to the address (known once its areas have loaded)
  const outOfArea = !!seller && fulfilment === "delivery" && !!sellerInfo.data && !!where.city && !sellerArea;
  const freeDelivery = !seller && cfg.delivery.freeOver != null && cart.subtotal >= cfg.delivery.freeOver;
  const deliveryFee = seller
    ? fulfilment === "delivery"
      ? sellerArea
        ? areaDeliveryFee(sellerArea, cart.subtotal)
        : 0
      : (spot?.fee ?? pickupPoint?.pickupFee ?? 0)
    : fulfilment === "delivery" && !freeDelivery
      ? cfg.delivery.flatFee
      : 0;
  const cheapestDelivery = areas.length ? Math.min(...areas.map((a) => a.homeFee)) : null;
  const total = Math.max(0, cart.subtotal + deliveryFee - discount);
  // Each switched-on token covers as much as it can, up to all but ₦100 of the order
  const storeTicker = seller ? sellerInfo.data?.ticker : null;
  const spendable = (wallet.data?.balances ?? []).filter((b) => b.amount > 0 && (b.ticker === "SOTECHY" || b.ticker === storeTicker)).sort((a) => (a.ticker === "SOTECHY" ? 1 : -1));
  let room = Math.max(0, total - TOKEN_RULES.minCashPerOrder);
  const tokenPlan = spendable.map((b) => {
    const amount = useTokens[b.ticker] ? Math.min(b.amount, nairaToTokens(room)) : 0;
    const value = tokensToNaira(amount);
    room -= value;
    return { ticker: b.ticker, balance: b.amount, amount, value, most: Math.min(b.amount, nairaToTokens(Math.max(0, total - TOKEN_RULES.minCashPerOrder))) };
  });
  const tokensValue = Math.round(tokenPlan.reduce((n, t) => n + t.value, 0) * 100) / 100;
  const due = Math.max(0, Math.round((total - tokensValue) * 100) / 100);

  /** Checks the typed code; the order checks it again with real prices. */
  async function checkPromo(): Promise<PromoCheck | null> {
    const code = promoCode.trim();
    if (!code) return null;
    setCheckingPromo(true);
    setPromoError(null);
    try {
      // A store's own codes only work in that store
      const result = await api.checkPromo({ code, subtotal: cart.subtotal, store: seller?.slug });
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
    if (fulfilment === "pickup" && user && !user.phone) {
      try {
        await updateProfile({ phone });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save your phone number");
        return;
      }
    }
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
        items: cart.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity, ...(l.offerId && { offerId: l.offerId }) })),
        fulfilmentType: fulfilment,
        branchId: selectedBranch,
        deliveryAddress:
          fulfilment !== "delivery"
            ? undefined
            : chosen
              ? { recipientName: chosen.recipientName, phone: chosen.phone, line1: chosen.line1, line2: chosen.line2 ?? undefined, city: chosen.city, state: chosen.state }
              : address,
        // Stablecoin through Money Moves, in its own window
        paymentMethod: "online",
        promoCode: applied?.code,
        idempotencyKey,
        pickupZoneId: seller && fulfilment === "pickup" ? (pickupPoint?.id ?? undefined) : undefined,
        pickupPlace: seller && fulfilment === "pickup" ? (spot?.name ?? undefined) : undefined,
        tokens: tokenPlan.filter((t) => t.amount > 0).map((t) => ({ ticker: t.ticker, amount: t.amount })),
      });
      cart.clear();
      if (order.tokensValue > 0) void refreshHeldTokens();
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

  /** Paying with tokens, in the payment sheet */
  const tokenRows = <TokenChoice plan={tokenPlan} on={useTokens} onToggle={(t) => setUseTokens({ ...useTokens, [t]: !useTokens[t] })} />;
  const usingTokens = tokenPlan.filter((t) => t.amount > 0);

  return (
    <KeyboardAvoidingView style={ui.screen} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={{ padding: gutter, gap: space.xxl, paddingBottom: space.xxl }} keyboardShouldPersistTaps="handled">
        {paused && (
          <View style={{ flexDirection: "row", gap: space.md, alignItems: "center", backgroundColor: colors.warningSoft, borderRadius: radius.lg, padding: space.lg }}>
            <Ionicons name="pause-circle" size={26} color={colors.warning} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="label">Ordering is paused right now</Txt>
              <Txt variant="small" color={colors.ink2}>{features.maintenance && features.maintenanceMessage ? `${features.maintenanceMessage} ` : ""}Your cart is saved. Please check back soon, or contact us to order.</Txt>
            </View>
          </View>
        )}
        <Section step={1} title="How do you want it?">
          {seller && (
            <Txt variant="small" color={colors.ink2}>
              This order comes from <Txt variant="label" style={{ fontSize: 14 }}>{seller.name}</Txt>. They send it to you, or have it ready to collect.
            </Txt>
          )}
          {/* Side by side; one that can't be used here shows faded with why */}
          <View style={{ flexDirection: "row", gap: space.sm, alignItems: "stretch" }}>
            {features.pickup && <FulfilmentCard illo="pin" title="Pickup location" subtitle={seller ? (spots.length ? `From ${formatNaira(Math.min(...spots.map((p) => p.fee ?? 0)))}` : "Collect it yourself") : "Free · usually same day"} active={fulfilment === "pickup" && canPickup} locked={!itemsPickup || !storePickup} lockedNote={itemsPickup ? "Not available yet" : undefined} onPress={() => setFulfilment("pickup")} />}
            {features.delivery && <FulfilmentCard
              illo="bike"
              title="Home delivery"
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
              active={fulfilment === "delivery" && canDelivery}
              locked={!itemsDelivery || !storeDelivery}
              lockedNote={itemsDelivery ? "Not available yet" : undefined}
              onPress={() => setFulfilment("delivery")}
            />}
          </View>
          {onlyOne && (
            <Txt variant="small" color={colors.ink2}>
              {canDelivery
                ? itemsPickup
                  ? `${seller?.name ?? "This store"} has no pickup location yet.`
                  : "Items in this order are for home delivery only."
                : itemsDelivery
                  ? `${seller?.name ?? "This store"} doesn't deliver yet.`
                  : "Items in this order are for pickup only."}
            </Txt>
          )}
          {noWay && (
            <View style={{ flexDirection: "row", gap: space.sm, padding: space.md, borderRadius: 14, backgroundColor: colors.warningSoft }}>
              <Ionicons name="time-outline" size={18} color={colors.warning} />
              <Txt variant="small" color={colors.ink2} style={{ flex: 1 }}>
                {notSetUp
                  ? `${seller?.name ?? "This store"} is still getting its delivery areas and pickup locations approved. You'll be able to order soon; your cart is saved.`
                  : !itemsPickup && !itemsDelivery
                    ? "Some items are delivery only and others pickup only. Order them separately."
                    : `${seller?.name ?? "This store"} can't deliver or have this collected yet. Your cart is saved; try again soon.`}
              </Txt>
            </View>
          )}
        </Section>

        <Section step={2} title={fulfilment === "pickup" ? "Pickup location" : "Home delivery details"}>
          {/* The chosen pickup point, in the same card as a delivery address; Change opens every point */}
          {fulfilment === "pickup" && seller && spot && <PickupCard spot={spot} count={spots.length} onChange={() => setPlacesOpen(true)} />}
          {fulfilment === "pickup" &&
            !seller &&
            cfg.branches.map((b) => (
              <OptionRow key={b.id} illo="store" title={b.name} subtitle={`${b.address}, ${b.city}`} selected={selectedBranch === b.id} onPress={() => setBranchId(b.id)} />
            ))}
          {fulfilment === "pickup" && user && !user.phone && (
            <View style={[ui.card, { gap: space.md }]}>
              <View style={{ gap: 2 }}>
                <Txt variant="label">Add your phone number</Txt>
                <Txt variant="small">The store calls this number when your order is ready. We save it to your account.</Txt>
              </View>
              <PhoneInput label="Phone number" value={phone} onChange={setPhone} />
            </View>
          )}
          {fulfilment === "delivery" && user && chosen && (
            <View style={{ gap: space.sm }}>
              <AddressCard
                address={chosen}
                onPress={() => setPickingAddress(true)}
                footer={
                  <View style={[ui.between, { gap: space.sm }]}>
                    <Txt variant="small">{savedList.length > 1 ? `${savedList.length} saved addresses` : "Deliver here"}</Txt>
                    <View style={[ui.row, { gap: 4 }]}>
                      <Txt variant="label" color={colors.brandPressed}>Change</Txt>
                      <Ionicons name="chevron-down" size={16} color={colors.brandPressed} />
                    </View>
                  </View>
                }
              />
            </View>
          )}
          {fulfilment === "delivery" && user && !chosen && !saved.loading && (
            <View style={[ui.card, { gap: space.md, alignItems: "flex-start" }]}>
              <View style={[ui.row, { gap: space.md }]}>
                <Illo name="pin" size={34} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt variant="label">Add a delivery address</Txt>
                  <Txt variant="small">Where should we bring it? Add your address and phone number.</Txt>
                </View>
              </View>
              <Button title="Add address" icon="add" variant="outline" onPress={() => router.push({ pathname: "/address/[id]", params: { id: "new" } })} />
            </View>
          )}
          {fulfilment === "delivery" && !user && (
            <View style={{ gap: space.md }}>
              <Input label="Full name" icon="person-outline" value={address.recipientName} onChangeText={(v) => setAddress({ ...address, recipientName: v })} />
              <PhoneInput label="Phone number" value={address.phone} onChange={(v) => setAddress({ ...address, phone: v })} />
              <AddressSearch value={address.line1} onChangeText={(v) => setAddress({ ...address, line1: v })} onPick={(s) => setAddress({ ...address, line1: s.line1, city: s.city || address.city, state: s.state || address.state })} />
              <Input label="Landmark or apartment (optional)" value={address.line2} onChangeText={(v) => setAddress({ ...address, line2: v })} />
              <View style={[ui.row, { gap: space.md }]}>
                <View style={{ flex: 1 }}>
                  <Input label="City" value={address.city} onChangeText={(v) => setAddress({ ...address, city: v })} />
                </View>
                <View style={{ flex: 1 }}>
                  <Input label="State" value={address.state} onChangeText={(v) => setAddress({ ...address, state: v })} />
                </View>
              </View>
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

        {promoOn && <Section step={3} title="Promo code">
          {promo ? (
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
        </Section>}

        {tokenPlan.length > 0 && (
          <Pressable
            onPress={() => {
              tap();
              setTokensOpen(true);
            }}
            style={({ pressed }) => [ui.card, { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md, borderColor: usingTokens.length ? colors.brand : colors.line, opacity: pressed ? 0.85 : 1 }]}
          >
            <Illo name="coin" size={34} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="label">Pay with your store tokens</Txt>
              <Txt variant="caption" color={usingTokens.length ? colors.success : colors.muted}>
                {usingTokens.length
                  ? `${usingTokens.map((t) => `$${t.ticker}`).join(" + ")} · −${formatNaira(tokensValue)}`
                  : `Up to ${formatNaira(Math.min(Math.max(0, total - TOKEN_RULES.minCashPerOrder), tokenPlan.reduce((n, t) => n + tokensToNaira(t.most), 0)))} off with ${tokenPlan.map((t) => `$${t.ticker}`).join(" and ")}`}
              </Txt>
            </View>
            <Txt variant="label" color={colors.brandPressed}>{usingTokens.length ? "Change" : "Use"}</Txt>
          </Pressable>
        )}

        <View style={ui.card}>
          <Txt variant="heading" style={{ marginBottom: space.sm }}>Order summary</Txt>
          {cart.lines.map((l) => (
            <SummaryRow key={l.variantId} label={`${l.quantity} × ${l.productName}`} value={formatNaira(l.unitPrice * l.quantity)} />
          ))}
          <Divider style={{ marginVertical: space.sm }} />
          <SummaryRow label="Subtotal" value={formatNaira(cart.subtotal)} />
          <SummaryRow label={fulfilment === "pickup" ? "Pickup" : "Home delivery"} value={deliveryFee ? formatNaira(deliveryFee) : "Free"} />
          {discount > 0 && <SummaryRow label={`Promo (${promo?.code})`} value={`-${formatNaira(discount)}`} tone={colors.success} />}
          {tokensValue > 0 && <SummaryRow label="Paid with tokens" value={`-${formatNaira(tokensValue)}`} tone={colors.success} />}
          <Divider style={{ marginVertical: space.sm }} />
          <View style={[ui.between, { paddingVertical: 4 }]}>
            <Txt variant="label">Total</Txt>
            <View style={[ui.row, { gap: space.sm }]}>
              {features.usdPrices && fx.data ? <Txt variant="small">≈ {formatUsd(due, fx.data.rate)}</Txt> : null}
              <Txt variant="price">{formatNaira(due)}</Txt>
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
            title={paused ? "Ordering paused" : `Proceed to payment · ${formatNaira(due)}`}
            icon="lock-closed"
            variant="dark"
            onPress={() => {
              tap();
              setPayOpen(true);
            }}
            loading={submitting || checkingPromo}
            disabled={paused || noWay || !products.data || !storeLoaded || !selectedBranch || cart.lines.length === 0 || !addressOk || outOfArea}
          />
        </View>
      </BottomBar>
      <Sheet visible={pickingAddress} title="Deliver to" onClose={() => setPickingAddress(false)}>
        <View style={{ gap: space.md }}>
          {savedList.map((a) => (
            <AddressCard
              key={a.id}
              address={a}
              selected={chosenId === a.id}
              onPress={() => {
                setAddressId(a.id);
                setPickingAddress(false);
              }}
            />
          ))}
          <Button
            title="Add new address"
            icon="add"
            variant="outline"
            onPress={() => {
              setPickingAddress(false);
              router.push({ pathname: "/address/[id]", params: { id: "new" } });
            }}
          />
          <Pressable
            onPress={() => {
              setPickingAddress(false);
              router.push("/addresses");
            }}
            style={{ alignSelf: "center" }}
            hitSlop={8}
          >
            <Txt variant="label" color={colors.brandPressed}>Manage saved addresses</Txt>
          </Pressable>
        </View>
      </Sheet>
      <Sheet visible={placesOpen} title="Pickup location" onClose={() => setPlacesOpen(false)}>
        <View style={{ gap: space.md }}>
          {spots.map((sp) => (
            <PickupCard
              key={sp.key}
              spot={sp}
              selected={spot?.key === sp.key}
              onPress={() => {
                chooseSpot(sp);
                setPlacesOpen(false);
              }}
            />
          ))}
        </View>
      </Sheet>
      <PayChoiceSheet visible={payOpen} amount={due} onClose={() => setPayOpen(false)} onPay={() => void proceedToPayment()} />
      <Sheet visible={tokensOpen} title="Pay with tokens" onClose={() => setTokensOpen(false)} footer={<Button title={usingTokens.length ? `Use tokens · pay ${formatNaira(due)}` : "Done"} variant="dark" onPress={() => setTokensOpen(false)} />}>
        <Txt variant="small" color={colors.ink2}>
          Tokens you earned at {seller?.name ?? "this store"}, and $SOTECHY, can pay part of this order. They&apos;re only taken once your payment goes through, and at least ₦{TOKEN_RULES.minCashPerOrder} is paid in money.
        </Txt>
        {tokenRows}
        <View style={{ gap: 6 }}>
          <SummaryRow label="Order total" value={formatNaira(total)} />
          <SummaryRow label="Tokens" value={tokensValue > 0 ? `−${formatNaira(tokensValue)}` : formatNaira(0)} tone={tokensValue > 0 ? colors.success : undefined} />
          <Divider style={{ marginVertical: 2 }} />
          <SummaryRow label="You pay" value={formatNaira(due)} strong />
        </View>
      </Sheet>
      {moneyMoves.sheet}
    </KeyboardAvoidingView>
  );
}
