// Negotiating one product with its store: messages, offers, the store's counter-offers, and an agreed
// price that only this customer can use for the hours the store chose.
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatNaira } from "@sotechy/shared";
import { StoreLogo } from "@/components/store-bits";
import { ProductArt } from "@/components/store-brand";
import { useToast } from "@/components/toast";
import { Button, EmptyState, Pill, Txt, ui } from "@/components/ui";
import { findProduct, formatTokens, storeBySlug, tileColor, timeLeft, type MarketStore, type StoreProduct } from "@/lib/marketplace";
import { statusOf, useOffers, type OfferMessage, type OfferThread } from "@/lib/offers";
import { colors, fonts, gutter, radius, space } from "@/lib/theme";

const STATUS = {
  waiting_store: { label: "Waiting for the store", tone: "warning" as const },
  countered: { label: "Store replied", tone: "brand" as const },
  agreed: { label: "Deal agreed", tone: "success" as const },
  declined: { label: "Closed", tone: "neutral" as const },
  expired: { label: "Deal expired", tone: "neutral" as const },
};

const ago = (at: number) => {
  const m = Math.round((Date.now() - at) / 60_000);
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : `${Math.round(m / 60)}h ago`;
};

function Bubble({ m, product, store }: { m: OfferMessage; product: StoreProduct; store: MarketStore }) {
  const mine = m.from === "me";
  if (m.kind === "text") {
    return (
      <View style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "82%", borderRadius: 20, borderBottomRightRadius: mine ? 6 : 20, borderBottomLeftRadius: mine ? 20 : 6, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: mine ? colors.inverse : colors.surface, borderWidth: mine ? 0 : 1, borderColor: colors.line }}>
        <Txt variant="body" color={mine ? colors.onInverse : colors.ink}>{m.text}</Txt>
        <Txt variant="caption" color={mine ? colors.onInverse : colors.muted} style={{ opacity: mine ? 0.6 : 1, marginTop: 2 }}>{ago(m.at)}</Txt>
      </View>
    );
  }
  const label = m.kind === "offer" ? (mine ? "Your offer" : "Offer") : m.kind === "counter" ? `${store.name} offered` : m.kind === "accepted" ? "Deal agreed" : mine ? "You closed this" : "Declined";
  const tint = m.kind === "accepted" ? colors.successSoft : m.kind === "declined" ? colors.surfaceAlt : colors.brandSoft;
  const off = m.amount ? Math.round(((product.price - m.amount) / product.price) * 100) : 0;
  return (
    <View style={{ alignSelf: mine ? "flex-end" : "flex-start", width: "86%", borderRadius: radius.xl, padding: space.lg, backgroundColor: tint, gap: 4 }}>
      <Txt variant="overline">{label}</Txt>
      {m.amount ? (
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
          <Text style={{ fontFamily: fonts.displayHeavy, fontSize: 26, color: colors.ink, letterSpacing: -0.5 }}>{formatNaira(m.amount)}</Text>
          {off > 0 && m.kind !== "accepted" ? <Txt variant="label" color={colors.muted}>{off}% off</Txt> : null}
        </View>
      ) : null}
      {m.hours && m.kind !== "offer" ? <Txt variant="caption">{m.kind === "accepted" ? `Held for you for ${m.hours} hours` : `If you accept, it's held for you for ${m.hours} hours`}</Txt> : null}
      {m.text ? <Txt variant="body" style={{ marginTop: 4 }}>{m.text}</Txt> : null}
      <Txt variant="caption" style={{ marginTop: 2 }}>{ago(m.at)}</Txt>
    </View>
  );
}

function AmountInput({ value, onChange, product }: { value: string; onChange: (v: string) => void; product: StoreProduct }) {
  const n = Number(value.replace(/\D/g, "")) || 0;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", height: 60, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: space.lg }}>
        <Text style={{ fontFamily: fonts.displayHeavy, fontSize: 24, color: colors.muted }}>₦</Text>
        <TextInput
          value={n ? n.toLocaleString("en-NG") : ""}
          onChangeText={onChange}
          keyboardType="number-pad"
          placeholder={Math.round(product.price * 0.9).toLocaleString("en-NG")}
          placeholderTextColor={colors.faint}
          style={{ flex: 1, fontFamily: fonts.displayHeavy, fontSize: 24, color: colors.ink, marginLeft: 4 }}
        />
      </View>
      <Txt variant="caption">{n ? `${Math.round(((product.price - n) / product.price) * 100)}% below the price of ${formatNaira(product.price)}` : `The price is ${formatNaira(product.price)}`}</Txt>
    </View>
  );
}

export default function OfferScreen() {
  const params = useLocalSearchParams<{ id: string; store?: string; product?: string }>();
  const offers = useOffers();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const existing = params.id !== "new" ? offers.byId(params.id) : undefined;
  const storeSlug = existing?.store ?? params.store ?? "";
  const store = storeBySlug(storeSlug);
  const product = findProduct(storeSlug, existing?.productId ?? params.product ?? "");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [text, setText] = useState("");
  const [countering, setCountering] = useState(false);

  if (!store || !product) return <EmptyState illo="tag" title="Offer not found" message="It may have been closed." />;
  const value = Number(amount.replace(/\D/g, "")) || 0;
  const t: OfferThread | undefined = existing;
  const status = t ? statusOf(t) : null;
  const first = store.name;

  return (
    <KeyboardAvoidingView style={ui.screen} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <Stack.Screen options={{ title: t ? "Your offer" : "Make an offer" }} />
      <ScrollView contentContainerStyle={{ padding: gutter, gap: space.md, paddingBottom: space.xl }} keyboardShouldPersistTaps="handled">
        {/* What's being negotiated */}
        <View style={[ui.card, { flexDirection: "row", alignItems: "center", gap: space.md }]}>
          <View style={{ width: 64, height: 64, borderRadius: radius.lg, backgroundColor: tileColor(store.theme), alignItems: "center", justifyContent: "center" }}>
            <ProductArt product={product} store={store} scale={0.78} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="label" numberOfLines={2}>{product.name}</Txt>
            <Txt variant="small">Price {formatNaira(product.price)}</Txt>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <StoreLogo store={store} size={18} />
              <Txt variant="caption">{store.name}</Txt>
            </View>
          </View>
          {status && <Pill label={STATUS[status].label} tone={STATUS[status].tone} />}
        </View>

        {status === "agreed" && t?.expiresAt && t.agreedPrice ? (
          <View style={{ borderRadius: radius.xl, backgroundColor: colors.successSoft, padding: space.lg, gap: space.sm }}>
            <View style={ui.row}>
              <Ionicons name="time" size={18} color={colors.success} />
              <Txt variant="label" color={colors.success}>{timeLeft(new Date(t.expiresAt).toISOString())} to buy at this price</Txt>
            </View>
            <Txt variant="small" color={colors.ink2}>Only you can buy at {formatNaira(t.agreedPrice)}. After that it goes back to {formatNaira(product.price)}. You still earn {formatTokens(t.agreedPrice)} ${store.ticker}.</Txt>
            <Button title={`Buy at ${formatNaira(t.agreedPrice)}`} icon="bag-handle" onPress={() => toast("Sample store: buying opens when the marketplace goes live")} />
          </View>
        ) : null}

        {/* Conversation */}
        {t ? (
          <View style={{ gap: space.md, marginTop: space.sm }}>
            {t.messages.map((m) => (
              <Bubble key={m.id} m={m} product={product} store={store} />
            ))}
          </View>
        ) : (
          <View style={{ gap: space.md }}>
            <Txt variant="heading">How much would you pay?</Txt>
            <AmountInput value={amount} onChange={setAmount} product={product} />
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={`Add a message for ${first} (optional)`}
              placeholderTextColor={colors.faint}
              multiline
              style={{ minHeight: 80, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, padding: space.lg, fontFamily: fonts.body, fontSize: 15, color: colors.ink, textAlignVertical: "top" }}
            />
            <View style={{ flexDirection: "row", gap: space.sm, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt }}>
              <Ionicons name="information-circle-outline" size={18} color={colors.muted} />
              <Txt variant="caption" style={{ flex: 1 }}>
                If {first} agrees, the price is held for you only, for up to 24 hours. You&apos;ll hear back here, on WhatsApp and by email.
              </Txt>
            </View>
          </View>
        )}

        {/* The store's counter-offer is waiting for an answer */}
        {status === "countered" && !countering && (
          <View style={{ flexDirection: "row", gap: space.sm }}>
            <Button title="Accept" icon="checkmark" onPress={() => offers.acceptCounter(t!.id)} style={{ flex: 1 }} />
            <Button title="Offer again" variant="outline" onPress={() => setCountering(true)} style={{ flex: 1 }} />
          </View>
        )}
        {status === "countered" && countering && (
          <View style={{ gap: space.sm }}>
            <AmountInput value={amount} onChange={setAmount} product={product} />
            <View style={{ flexDirection: "row", gap: space.sm }}>
              <Button title="Cancel" variant="ghost" onPress={() => setCountering(false)} style={{ flex: 1 }} />
              <Button
                title="Send offer"
                disabled={!value || value >= product.price}
                onPress={() => {
                  offers.counter(t!.id, value);
                  setAmount("");
                  setCountering(false);
                }}
                style={{ flex: 1.4 }}
              />
            </View>
          </View>
        )}
        {status === "waiting_store" && <Txt variant="small" style={{ textAlign: "center" }}>{first} usually answers within a few hours. We&apos;ll tell you on WhatsApp and by email.</Txt>}
        {(status === "declined" || status === "expired") && (
          <Button title="Make a new offer" variant="outline" onPress={() => router.replace({ pathname: "/offer/[id]", params: { id: "new", store: store.slug, product: product.id } })} />
        )}
      </ScrollView>

      {/* Bottom bar: send the first offer, or message the store */}
      <View style={{ paddingHorizontal: gutter, paddingTop: space.sm, paddingBottom: insets.bottom + space.sm, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.bg }}>
        {t ? (
          status !== "declined" && status !== "expired" ? (
            <View style={{ flexDirection: "row", gap: space.sm, alignItems: "center" }}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={`Message ${first}…`}
                placeholderTextColor={colors.faint}
                style={{ flex: 1, height: 48, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: space.lg, fontFamily: fonts.body, fontSize: 15, color: colors.ink }}
              />
              <Pressable
                disabled={!text.trim()}
                onPress={() => {
                  offers.message(t.id, text.trim());
                  setText("");
                }}
                style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.inverse, alignItems: "center", justifyContent: "center", opacity: text.trim() ? 1 : 0.4 }}
              >
                <Ionicons name="send" size={18} color={colors.onInverse} />
              </Pressable>
            </View>
          ) : null
        ) : (
          <Button
            title={value ? `Send offer of ${formatNaira(value)}` : "Send offer"}
            icon="pricetag"
            disabled={!value || value >= product.price}
            onPress={() => {
              const id = offers.makeOffer(store.slug, product.id, value, note.trim() || undefined);
              router.replace({ pathname: "/offer/[id]", params: { id } });
            }}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
