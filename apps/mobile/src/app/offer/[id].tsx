// Negotiating one product with its store: offers, the store's counter-offers, and an agreed price that only
// this customer can use, for the hours the store set. /offer/new?variant=… makes the first offer.
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatNaira, type OfferView } from "@sotechy/shared";
import { useAddToCart } from "@/components/add-to-cart";
import { useCartFeedback } from "@/components/cart-feedback";
import { ProductImage } from "@/components/product-image";
import { useToast } from "@/components/toast";
import { Button, EmptyState, ErrorView, Loading, Pill, Txt, ui } from "@/components/ui";
import { api } from "@/lib/api";
import { timeLeft } from "@/lib/marketplace";
import { colors, fonts, gutter, radius, space } from "@/lib/theme";
import { useAsync } from "@/lib/use-async";
import { OFFER_LABEL } from "../offers";

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 60 * 24 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 60 / 24)}d ago`;
};

function Bubble({ m, o }: { m: OfferView["messages"][number]; o: OfferView }) {
  const mine = m.from === "customer";
  const label = m.kind === "offer" ? "Your offer" : m.kind === "counter" ? (mine ? "You offered" : `${o.store.name} offered`) : m.kind === "accept" ? "Price agreed" : mine ? "You closed this" : `${o.store.name} declined`;
  const tint = m.kind === "accept" ? colors.successSoft : m.kind === "decline" ? colors.surfaceAlt : mine ? colors.surface : colors.brandSoft;
  const off = m.amount ? Math.round(((o.listPrice - m.amount) / o.listPrice) * 100) : 0;
  return (
    <View style={{ alignSelf: mine ? "flex-end" : "flex-start", width: "86%", borderRadius: radius.xl, padding: space.lg, backgroundColor: tint, borderWidth: mine ? 1 : 0, borderColor: colors.line, gap: 4 }}>
      <Txt variant="overline">{label}</Txt>
      {m.amount ? (
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
          <Text style={{ fontFamily: fonts.displayHeavy, fontSize: 26, color: colors.ink, letterSpacing: -0.5 }}>{formatNaira(m.amount)}</Text>
          {off > 0 && m.kind !== "accept" ? <Txt variant="label" color={colors.muted}>{off}% off</Txt> : null}
        </View>
      ) : null}
      {m.text ? <Txt variant="body" style={{ marginTop: 4 }}>{m.text}</Txt> : null}
      <Txt variant="caption" style={{ marginTop: 2 }}>{ago(m.createdAt)}</Txt>
    </View>
  );
}

function AmountInput({ value, onChange, price, hint }: { value: string; onChange: (v: string) => void; price: number; hint?: string }) {
  const n = Number(value.replace(/\D/g, "")) || 0;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", height: 60, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: space.lg }}>
        <Text style={{ fontFamily: fonts.displayHeavy, fontSize: 24, color: colors.muted }}>₦</Text>
        <TextInput
          value={n ? n.toLocaleString("en-NG") : ""}
          onChangeText={onChange}
          keyboardType="number-pad"
          placeholder={Math.round(price * 0.9).toLocaleString("en-NG")}
          placeholderTextColor={colors.faint}
          style={{ flex: 1, fontFamily: fonts.displayHeavy, fontSize: 24, color: colors.ink, marginLeft: 4 }}
        />
      </View>
      <Txt variant="caption">{n ? `${Math.round(((price - n) / price) * 100)}% below the price of ${formatNaira(price)}` : (hint ?? `The price is ${formatNaira(price)}`)}</Txt>
    </View>
  );
}

const noteStyle = { minHeight: 70, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, padding: space.lg, fontFamily: fonts.body, fontSize: 15, color: colors.ink, textAlignVertical: "top" as const };

export default function OfferScreen() {
  // New offers arrive with what's being offered on: /offer/new?variant=&name=&price=&image=&store=
  const params = useLocalSearchParams<{ id: string; variant?: string; name?: string; price?: string; image?: string; store?: string }>();
  const isNew = params.id === "new";
  const offer = useAsync(async () => (isNew ? null : api.offer(params.id)), [params.id], { live: true });
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const addToCart = useAddToCart();
  const showAdded = useCartFeedback();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [countering, setCountering] = useState(false);
  const [busy, setBusy] = useState(false);
  const value = Number(amount.replace(/\D/g, "")) || 0;

  const run = async (fn: () => Promise<OfferView>) => {
    setBusy(true);
    try {
      const o = await fn();
      setAmount("");
      setNote("");
      setCountering(false);
      if (isNew) router.replace({ pathname: "/offer/[id]", params: { id: o.id } });
      else offer.reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't send that", { icon: "alert-circle" });
    } finally {
      setBusy(false);
    }
  };

  // A brand new offer
  if (isNew) {
    const price = Number(params.price) || 0;
    if (!params.variant || !price) return <EmptyState illo="tag" title="Offer not found" message="Open the product and tap Make an offer." />;
    return (
      <KeyboardAvoidingView style={ui.screen} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
        <Stack.Screen options={{ title: "Make an offer" }} />
        <ScrollView contentContainerStyle={{ padding: gutter, gap: space.md, paddingBottom: space.xl }} keyboardShouldPersistTaps="handled">
          <View style={[ui.card, { flexDirection: "row", alignItems: "center", gap: space.md }]}>
            <View style={{ width: 64, height: 64, borderRadius: radius.lg, overflow: "hidden" }}>
              <ProductImage uri={params.image || null} name={params.name ?? ""} style={{ flex: 1 }} padding={6} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="label" numberOfLines={2}>{params.name}</Txt>
              <Txt variant="small">Price {formatNaira(price)}</Txt>
              {params.store ? <Txt variant="caption">{params.store}</Txt> : null}
            </View>
          </View>
          <Txt variant="heading">How much would you pay?</Txt>
          <AmountInput value={amount} onChange={setAmount} price={price} />
          <TextInput value={note} onChangeText={setNote} placeholder="Add a message for the store (optional)" placeholderTextColor={colors.faint} multiline maxLength={300} style={noteStyle} />
          <View style={{ flexDirection: "row", gap: space.sm, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt }}>
            <Ionicons name="information-circle-outline" size={18} color={colors.muted} />
            <Txt variant="caption" style={{ flex: 1 }}>If the store agrees, the price is held for you only, for up to 24 hours, for one item. You can make up to three offers.</Txt>
          </View>
        </ScrollView>
        <View style={{ paddingHorizontal: gutter, paddingTop: space.sm, paddingBottom: insets.bottom + space.sm, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.bg }}>
          <Button
            title={value ? `Send offer of ${formatNaira(value)}` : "Send offer"}
            icon="pricetag"
            loading={busy}
            disabled={!value || value >= price}
            onPress={() => run(() => api.makeOffer({ variantId: params.variant!, amount: value, text: note.trim() || null }))}
          />
        </View>
      </KeyboardAvoidingView>
    );
  }

  if (offer.loading && !offer.data) return <Loading />;
  if (offer.error || !offer.data) return <ErrorView message={offer.error ?? "Offer not found"} onRetry={offer.reload} />;
  const o = offer.data;
  const label = OFFER_LABEL[o.status];

  const buy = async () => {
    if (!o.agreedPrice) return;
    const line = {
      variantId: o.product.variantId,
      productId: o.product.id,
      productName: o.product.name,
      variantName: o.product.variantName,
      unitPrice: o.agreedPrice,
      imageUrl: o.product.image,
      offerId: o.id,
      store: o.store.branchId ? { slug: o.store.slug, name: o.store.name, branchId: o.store.branchId } : null,
    };
    if (!(await addToCart(line, 1))) return;
    showAdded({ name: o.product.name, imageUrl: o.product.image, quantity: 1, unitPrice: o.agreedPrice });
  };

  return (
    <KeyboardAvoidingView style={ui.screen} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <Stack.Screen options={{ title: "Your offer" }} />
      <ScrollView contentContainerStyle={{ padding: gutter, gap: space.md, paddingBottom: space.xl }} keyboardShouldPersistTaps="handled">
        <View style={[ui.card, { flexDirection: "row", alignItems: "center", gap: space.md }]}>
          <View style={{ width: 64, height: 64, borderRadius: radius.lg, overflow: "hidden" }}>
            <ProductImage uri={o.product.image} name={o.product.name} style={{ flex: 1 }} padding={6} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="label" numberOfLines={2}>{o.product.name}</Txt>
            <Txt variant="small">Price {formatNaira(o.listPrice)}</Txt>
            <Txt variant="caption">{o.store.name}</Txt>
          </View>
          <Pill label={label.label} tone={label.tone} />
        </View>

        {o.status === "agreed" && o.agreedPrice && o.agreedUntil ? (
          <View style={{ borderRadius: radius.xl, backgroundColor: colors.successSoft, padding: space.lg, gap: space.sm }}>
            <View style={ui.row}>
              <Ionicons name="time" size={18} color={colors.success} />
              <Txt variant="label" color={colors.success}>{timeLeft(o.agreedUntil)} to buy at this price</Txt>
            </View>
            <Txt variant="small" color={colors.ink2}>Only you can buy one at {formatNaira(o.agreedPrice)}. After that it goes back to {formatNaira(o.listPrice)}.</Txt>
            <Button title={`Buy at ${formatNaira(o.agreedPrice)}`} icon="bag-handle" onPress={buy} />
          </View>
        ) : null}

        <View style={{ gap: space.md, marginTop: space.sm }}>
          {o.messages.map((m) => (
            <Bubble key={m.id} m={m} o={o} />
          ))}
        </View>

        {o.status === "waiting_customer" && !countering && (
          <View style={{ flexDirection: "row", gap: space.sm }}>
            <Button title={`Accept ${formatNaira(o.lastAmount)}`} icon="checkmark" loading={busy} onPress={() => run(() => api.answerOffer(o.id, { action: "accept" }))} style={{ flex: 1.3 }} />
            <Button title="Offer again" variant="outline" onPress={() => setCountering(true)} style={{ flex: 1 }} />
          </View>
        )}
        {o.status === "waiting_customer" && countering && (
          <View style={{ gap: space.sm }}>
            <AmountInput value={amount} onChange={setAmount} price={o.listPrice} hint={`Less than the store's ${formatNaira(o.lastAmount)}`} />
            <TextInput value={note} onChangeText={setNote} placeholder="Add a message (optional)" placeholderTextColor={colors.faint} multiline maxLength={300} style={noteStyle} />
            <View style={{ flexDirection: "row", gap: space.sm }}>
              <Button title="Cancel" variant="ghost" onPress={() => setCountering(false)} style={{ flex: 1 }} />
              <Button title="Send offer" loading={busy} disabled={!value || value >= o.lastAmount} onPress={() => run(() => api.answerOffer(o.id, { action: "counter", amount: value, text: note.trim() || null }))} style={{ flex: 1.4 }} />
            </View>
          </View>
        )}
        {(o.status === "waiting_store" || o.status === "waiting_customer") && (
          <Button title="Walk away" variant="ghost" onPress={() => run(() => api.answerOffer(o.id, { action: "decline" }))} />
        )}
        {o.status === "waiting_store" && <Txt variant="small" style={{ textAlign: "center" }}>The store usually answers within a few hours. We&apos;ll let you know.</Txt>}
        {(o.status === "declined" || o.status === "expired") && (
          <Button title="See the product" variant="outline" onPress={() => router.replace({ pathname: "/product/[id]", params: { id: o.product.slug } })} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
