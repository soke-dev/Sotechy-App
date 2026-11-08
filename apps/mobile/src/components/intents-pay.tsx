// Pay with crypto through NEAR Intents: pick a coin, give an address for refunds, then send the exact amount
// shown to a one-off deposit address. NEAR Intents swaps it and Sotechy receives the order's total as USDC on Base;
// this window follows the swap and closes by itself once the order is paid.
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Clipboard from "expo-clipboard";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatNaira, type IntentQuote, type IntentsAsset, type IntentSwapStatus } from "@sotechy/shared";
import { api } from "@/lib/api";
import { colors, space } from "@/lib/theme";
import { Button, Input, tap, Txt, ui } from "./ui";

const CHECK_EVERY_MS = 5000;

const STEP: Record<IntentSwapStatus, { text: string; tone: "wait" | "good" | "bad" }> = {
  PENDING_DEPOSIT: { text: "Waiting for your payment", tone: "wait" },
  KNOWN_DEPOSIT_TX: { text: "Payment seen, confirming it", tone: "wait" },
  PROCESSING: { text: "Converting it to USDC", tone: "wait" },
  SUCCESS: { text: "Paid. Your order is confirmed", tone: "good" },
  INCOMPLETE_DEPOSIT: { text: "Less than the amount shown arrived. Send the rest, or contact us", tone: "bad" },
  REFUNDED: { text: "It couldn't go through, so your coins were sent back to your refund address", tone: "bad" },
  FAILED: { text: "Something went wrong. Contact us and we'll sort it out", tone: "bad" },
};

const short = (a: string) => (a.length > 22 ? `${a.slice(0, 12)}…${a.slice(-8)}` : a);

function useCountdown(deadline: string | undefined) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!deadline) return null;
  const left = Math.max(0, new Date(deadline).getTime() - now);
  return `${Math.floor(left / 60_000)}:${String(Math.floor((left % 60_000) / 1000)).padStart(2, "0")}`;
}

/** The whole flow for one order; `onDone(paid)` closes it */
export function IntentsPayWindow({ order, onDone }: { order: { id: string; orderNumber: string; total: number }; onDone: (paid: boolean) => void }) {
  const insets = useSafeAreaInsets();
  const [assets, setAssets] = useState<IntentsAsset[] | null>(null);
  const [asset, setAsset] = useState<IntentsAsset | null>(null);
  // Pick a chain first (or see every coin), then a coin on it
  const [chain, setChain] = useState<string | null>(null);
  const [refundTo, setRefundTo] = useState("");
  const [quote, setQuote] = useState<IntentQuote | null>(null);
  const [swap, setSwap] = useState<IntentSwapStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const open = useRef(true);
  const left = useCountdown(quote?.deadline);

  useEffect(() => {
    api.intentsAssets().then((r) => setAssets(r.assets)).catch(() => setError("We couldn't load the coins. Check your connection and try again."));
    return () => {
      open.current = false;
    };
  }, []);

  // Follows the swap once there's a deposit address, and closes when the order is paid
  useEffect(() => {
    if (!quote) return;
    let stop = false;
    void (async () => {
      while (!stop && open.current) {
        try {
          const s = await api.intentsStatus(order.id);
          if (s.swap) setSwap(s.swap);
          if (s.swap === "SUCCESS" || !["pending_payment", "payment_failed"].includes(s.orderStatus)) {
            setSwap("SUCCESS");
            setTimeout(() => onDone(true), 1200);
            return;
          }
        } catch {}
        await new Promise((r) => setTimeout(r, CHECK_EVERY_MS));
      }
    })();
    return () => {
      stop = true;
    };
  }, [quote, order.id, onDone]);

  async function getQuote() {
    if (!asset) return;
    setBusy(true);
    setError(null);
    try {
      setQuote(await api.startIntentsPayment(order.id, asset.assetId, refundTo.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't get a price. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function copy(label: string, value: string) {
    tap();
    await Clipboard.setStringAsync(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  }

  const step = swap ? STEP[swap] : null;

  return (
    <Modal visible animationType="slide" onRequestClose={() => onDone(false)} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.sm }}>
          <Ionicons name="flash" size={16} color={colors.brand} />
          <Txt variant="label" style={{ flex: 1 }}>Pay with crypto</Txt>
          <Pressable onPress={() => onDone(false)} hitSlop={10} accessibilityLabel="Close" style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="close" size={18} color={colors.ink} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: insets.bottom + space.xl }} keyboardShouldPersistTaps="handled">
          <Txt variant="heading">Order {order.orderNumber} · {formatNaira(order.total)}</Txt>

          {!quote ? (
            <>
              <Txt variant="small">Pay with what you hold, on any of these chains. NEAR Intents converts it, and Sotechy receives your order&apos;s total in USDC.</Txt>
              {!assets && !error && <ActivityIndicator color={colors.brand} style={{ marginTop: space.lg }} />}
              {assets && (
                <>
                  <Txt variant="caption">Chain</Txt>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
                    {[null, ...Array.from(new Set(assets.map((a) => a.chain)))].map((c) => {
                      const on = chain === c;
                      return (
                        <Pressable
                          key={c ?? "all"}
                          onPress={() => {
                            tap();
                            setChain(c);
                            if (c && asset && asset.chain !== c) setAsset(null);
                          }}
                          style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 2, borderColor: on ? colors.ink : colors.line, backgroundColor: on ? colors.ink : colors.surface }}
                        >
                          <Txt variant="label" color={on ? colors.onInverse : colors.ink}>{c ?? "All chains"}</Txt>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                  <Txt variant="caption">Coin</Txt>
                </>
              )}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
                {assets?.filter((a) => !chain || a.chain === chain).map((a) => {
                  const on = asset?.assetId === a.assetId;
                  return (
                    <Pressable
                      key={a.assetId}
                      onPress={() => {
                        tap();
                        setAsset(a);
                      }}
                      style={[ui.card, { paddingVertical: 10, paddingHorizontal: 14, borderWidth: 2, borderColor: on ? colors.brand : "transparent", backgroundColor: on ? colors.brandSoft : colors.surface }]}
                    >
                      <Txt variant="label">{a.symbol}</Txt>
                      <Txt variant="caption">{a.chain}</Txt>
                    </Pressable>
                  );
                })}
              </View>
              {asset && (
                <>
                  <Input
                    label={`Your ${asset.chain} address, for a refund`}
                    placeholder={`The ${asset.chain} address you'll pay from`}
                    value={refundTo}
                    onChangeText={setRefundTo}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Txt variant="caption">If the payment can&apos;t go through, your {asset.symbol} goes straight back here.</Txt>
                  <Button title={`Get the ${asset.symbol} amount`} icon="arrow-forward" variant="dark" loading={busy} disabled={refundTo.trim().length < 10} onPress={() => void getQuote()} />
                </>
              )}
            </>
          ) : (
            <>
              <View style={[ui.card, { gap: space.sm }]}>
                <Txt variant="caption">Send exactly</Txt>
                <Pressable onPress={() => void copy("amount", quote.amountInFormatted)} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Txt variant="title" selectable>
                    {quote.amountInFormatted} {quote.symbol}
                  </Txt>
                  <Ionicons name={copied === "amount" ? "checkmark" : "copy-outline"} size={18} color={colors.brand} />
                </Pressable>
                <Txt variant="caption">on {quote.chain}, to this address:</Txt>
                <Pressable onPress={() => void copy("address", quote.depositAddress)} style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.surfaceAlt, borderRadius: 14, padding: 12 }}>
                  <Txt variant="label" selectable style={{ flex: 1 }}>{quote.depositAddress}</Txt>
                  <Ionicons name={copied === "address" ? "checkmark" : "copy-outline"} size={18} color={colors.brand} />
                </Pressable>
                {quote.depositMemo && (
                  <Pressable onPress={() => void copy("memo", quote.depositMemo!)} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Txt variant="small" style={{ flex: 1 }}>Memo (required): {quote.depositMemo}</Txt>
                    <Ionicons name={copied === "memo" ? "checkmark" : "copy-outline"} size={18} color={colors.brand} />
                  </Pressable>
                )}
                <Txt variant="caption">
                  Sotechy receives {quote.amountOutUsdc} USDC on Base. This price holds for {left ?? "a while"}. Refunds go to {short(refundTo)}.
                </Txt>
              </View>

              <View style={[ui.card, { flexDirection: "row", alignItems: "center", gap: space.md }]}>
                {step?.tone === "good" ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                ) : step?.tone === "bad" ? (
                  <Ionicons name="alert-circle" size={22} color={colors.danger} />
                ) : (
                  <ActivityIndicator color={colors.brand} />
                )}
                <Txt variant="small" style={{ flex: 1 }}>{step?.text ?? STEP.PENDING_DEPOSIT.text}</Txt>
              </View>
              <Txt variant="caption" style={{ textAlign: "center" }}>Powered by NEAR Intents · This closes by itself once your order is paid</Txt>
              <Button title="Pay later" variant="ghost" onPress={() => onDone(false)} />
            </>
          )}
          {error && <Txt variant="small" color={colors.danger}>{error}</Txt>}
        </ScrollView>
      </View>
    </Modal>
  );
}
