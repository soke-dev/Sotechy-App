// Pay with crypto through NEAR Intents, in two steps. First the customer picks a network and a coin (each a dropdown
// with logos) and gives an address for refunds. Then they send the exact amount shown to a one-off deposit address,
// and follow it from "waiting" to "paid". NEAR Intents swaps whatever they sent and Sotechy receives the order's total
// as USDC on Base; the window closes by itself once the order is paid.
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Clipboard from "expo-clipboard";
import { useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View, type ImageSourcePropType } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatNaira, type IntentQuote, type IntentsAsset, type IntentSwapStatus } from "@sotechy/shared";
import { api } from "@/lib/api";
import { colors, fonts, radius, space } from "@/lib/theme";
import { Sheet } from "./shop-filters";
import { Button, tap, Txt } from "./ui";

const CHECK_EVERY_MS = 3000;

const COIN_LOGO: Record<string, ImageSourcePropType> = {
  USDT: require("../../assets/crypto/coin-usdt.png"),
  USDC: require("../../assets/crypto/coin-usdc.png"),
  BTC: require("../../assets/crypto/coin-btc.png"),
  ETH: require("../../assets/crypto/coin-eth.png"),
  SOL: require("../../assets/crypto/coin-sol.png"),
  NEAR: require("../../assets/crypto/coin-near.png"),
};
const CHAIN_LOGO: Record<string, ImageSourcePropType> = {
  Base: require("../../assets/crypto/chain-base.png"),
  Ethereum: require("../../assets/crypto/chain-ethereum.png"),
  Solana: require("../../assets/crypto/chain-solana.png"),
  NEAR: require("../../assets/crypto/chain-near.png"),
  Tron: require("../../assets/crypto/chain-tron.png"),
  Arbitrum: require("../../assets/crypto/chain-arbitrum.png"),
  Bitcoin: require("../../assets/crypto/chain-bitcoin.png"),
  "BNB Chain": require("../../assets/crypto/chain-bnb.png"),
  TON: require("../../assets/crypto/chain-ton.png"),
  Polygon: require("../../assets/crypto/chain-polygon.png"),
  Optimism: require("../../assets/crypto/chain-optimism.png"),
  Avalanche: require("../../assets/crypto/chain-avalanche.png"),
  Aptos: require("../../assets/crypto/chain-aptos.png"),
  Sui: require("../../assets/crypto/chain-sui.png"),
  Stellar: require("../../assets/crypto/chain-stellar.png"),
  "XRP Ledger": require("../../assets/crypto/chain-xrp.png"),
  Dogecoin: require("../../assets/crypto/chain-dogecoin.png"),
  Litecoin: require("../../assets/crypto/chain-litecoin.png"),
  Cardano: require("../../assets/crypto/chain-cardano.png"),
  "Bitcoin Cash": require("../../assets/crypto/chain-bitcoin-cash.png"),
  Zcash: require("../../assets/crypto/chain-zcash.png"),
  Monad: require("../../assets/crypto/chain-monad.png"),
};
const COIN_NAME: Record<string, string> = {
  USDT: "Tether", USDC: "USD Coin", BTC: "Bitcoin", ETH: "Ether", SOL: "Solana", NEAR: "NEAR", BNB: "BNB", TRX: "TRON", XRP: "XRP",
  DOGE: "Dogecoin", LTC: "Litecoin", TON: "Toncoin", AVAX: "Avalanche", POL: "Polygon", SUI: "Sui", APT: "Aptos", ADA: "Cardano",
  XLM: "Stellar Lumens", BCH: "Bitcoin Cash", ZEC: "Zcash", MON: "Monad",
};
/** Native coins on their own network don't need a network badge (coins without a logo of their own use their
 *  network's, also without a badge) */
const NATIVE: Record<string, string> = { BTC: "Bitcoin", ETH: "Ethereum", SOL: "Solana", NEAR: "NEAR" };
/** What a refund address looks like on each network, as a hint in the field */
const ADDRESS_HINT: Record<string, string> = {
  Tron: "T…", Solana: "Your Solana address", Bitcoin: "bc1… or 1…", NEAR: "name.near or 64-character address", TON: "UQ… or EQ…",
  Stellar: "G…", "XRP Ledger": "r…", Dogecoin: "D…", Litecoin: "ltc1… or L…", Cardano: "addr1…", "Bitcoin Cash": "bitcoincash:q… or q…",
  Zcash: "t1…",
};

/** How soon a payment on each network usually shows up, without its transaction ID */
const ARRIVES: Record<string, string> = {
  Bitcoin: "10 to 30 minutes", "Bitcoin Cash": "a few minutes", Litecoin: "a few minutes", Dogecoin: "a few minutes", Zcash: "a few minutes",
  Cardano: "a few minutes", Ethereum: "1 to 3 minutes",
};

/** Where the swap is, as three steps; a failed or refunded swap is shown on its own */
const STAGE: Record<IntentSwapStatus, number> = { PENDING_DEPOSIT: 0, KNOWN_DEPOSIT_TX: 1, PROCESSING: 1, SUCCESS: 2, INCOMPLETE_DEPOSIT: 0, REFUNDED: -1, FAILED: -1 };
const STEPS = ["Waiting for your payment", "Payment received, converting", "Order paid"];

const short = (a: string, head = 8, tail = 6) => (a.length > head + tail + 1 ? `${a.slice(0, head)}…${a.slice(-tail)}` : a);
/** At most 4 decimals, rounded up so a customer never sends too little (any excess comes back to their refund
 *  address after the swap). Works on the exact decimal string. */
function upTo4(amount: string) {
  const [whole, frac = ""] = amount.split(".");
  const cut = frac.slice(0, 4).padEnd(4, "0");
  const up = /[1-9]/.test(frac.slice(4)) ? 1n : 0n;
  const n = BigInt(whole + cut) + up;
  const digits = n.toString().padStart(5, "0");
  const out = `${digits.slice(0, -4)}.${digits.slice(-4)}`.replace(/\.?0+$/, "");
  return out === "" ? "0" : out;
}
/** A rough amount for the coin list: 2 decimals from 1 up, otherwise at most 4, rounded up */
const trim = (n: number) => (n >= 1000 ? n.toLocaleString("en-US", { maximumFractionDigits: 2 }) : n >= 1 ? n.toFixed(2) : upTo4(n.toFixed(12)));

/** A coin's logo, with its network's logo as a small badge */
function CoinMark({ symbol, chain, size = 36 }: { symbol: string; chain?: string; size?: number }) {
  const badge = Math.round(size * 0.44);
  const showBadge = !!chain && !!CHAIN_LOGO[chain] && !!COIN_LOGO[symbol] && NATIVE[symbol] !== chain;
  return (
    <View style={{ width: size, height: size }}>
      <Image source={COIN_LOGO[symbol] ?? CHAIN_LOGO[chain ?? ""]} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceAlt }} />
      {showBadge && (
        <Image source={CHAIN_LOGO[chain!]} style={{ position: "absolute", right: -3, bottom: -3, width: badge, height: badge, borderRadius: badge / 2, borderWidth: 2, borderColor: colors.surface, backgroundColor: colors.surface }} />
      )}
    </View>
  );
}

function ChainMark({ chain, size = 32 }: { chain: string; size?: number }) {
  return <Image source={CHAIN_LOGO[chain]} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceAlt }} />;
}

/** A field that opens a list: label above, the choice (with its logo) and a chevron */
function Dropdown({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Txt variant="caption" color={colors.muted}>{label}</Txt>
      <Pressable
        onPress={() => {
          tap();
          onPress();
        }}
        style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 60, paddingHorizontal: space.md, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.line, backgroundColor: pressed ? colors.surfaceAlt : colors.surface })}
      >
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: space.md }}>{children}</View>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
    </View>
  );
}

/** One row in a dropdown's list */
function Option({ selected, onPress, left, title, subtitle, right }: { selected: boolean; onPress: () => void; left: ReactNode; title: string; subtitle?: string; right?: string }) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: 12, paddingHorizontal: space.md, borderRadius: radius.lg, backgroundColor: selected ? colors.brandSoft : pressed ? colors.surfaceAlt : "transparent" })}
    >
      {left}
      <View style={{ flex: 1 }}>
        <Txt variant="label">{title}</Txt>
        {subtitle ? <Txt variant="caption" color={colors.muted}>{subtitle}</Txt> : null}
      </View>
      {right ? <Txt variant="small" color={colors.muted}>{right}</Txt> : null}
      {selected && <Ionicons name="checkmark-circle" size={20} color={colors.brand} />}
    </Pressable>
  );
}

function useCountdown(deadline: string | undefined) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!deadline) return null;
  // How long the deposit address takes payments: days or hours while there's plenty of time, a clock in the last hour
  const left = Math.max(0, new Date(deadline).getTime() - now);
  const hours = left / 3_600_000;
  const text =
    hours >= 48 ? `${Math.floor(hours / 24)} days` : hours >= 1 ? `${Math.floor(hours)}h` : `${Math.floor(left / 60_000)}:${String(Math.floor((left % 60_000) / 1000)).padStart(2, "0")}`;
  return { text, over: left === 0, soon: hours < 1 };
}

/** The whole flow for one order; `onDone(paid)` closes it */
export function IntentsPayWindow({ order, onDone }: { order: { id: string; orderNumber: string; total: number }; onDone: (paid: boolean) => void }) {
  const insets = useSafeAreaInsets();
  const [assets, setAssets] = useState<IntentsAsset[] | null>(null);
  const [usd, setUsd] = useState<number | null>(null);
  const [chain, setChain] = useState<string | null>(null);
  const [asset, setAsset] = useState<IntentsAsset | null>(null);
  const [picking, setPicking] = useState<"chain" | "coin" | null>(null);
  const [refundTo, setRefundTo] = useState("");
  const [quote, setQuote] = useState<IntentQuote | null>(null);
  /** When the deposit address was shown, so a reassuring note can follow if the payment takes a while */
  const [quotedAt, setQuotedAt] = useState<number | null>(null);
  const [swap, setSwap] = useState<IntentSwapStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [txHash, setTxHash] = useState("");
  const [sending, setSending] = useState(false);
  const [txNote, setTxNote] = useState<{ ok: boolean; text: string } | null>(null);
  const open = useRef(true);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const left = useCountdown(quote?.deadline);
  /** Brings a field near the bottom into view once the keyboard is up */
  const showField = () => setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 250);

  useEffect(() => {
    api
      .intentsAssets()
      .then((r) => {
        setAssets(r.assets);
        // Start on the first coin offered (USDC on Solana)
        if (r.assets[0]) {
          setAsset(r.assets[0]);
          setChain(r.assets[0].chain);
        }
      })
      .catch(() => setError("We couldn't load the coins. Check your connection and try again."));
    api
      .exchangeRate()
      .then((fx) => setUsd(order.total / fx.rate))
      .catch(() => {});
    return () => {
      open.current = false;
    };
  }, [order.total]);

  const chains = useMemo(() => (assets ? Array.from(new Set(assets.map((a) => a.chain))) : []), [assets]);
  const coinsOn = (c: string | null) => (assets ?? []).filter((a) => !c || a.chain === c);
  /** Roughly how much of a coin the order takes, before the real quote */
  const estimate = (a: IntentsAsset) => (usd && a.priceUsd > 0 ? `≈ ${trim((usd / a.priceUsd) * 1.005)}` : undefined);

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
            setTimeout(() => onDone(true), 1800);
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
      setQuotedAt(Date.now());
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
    setTimeout(() => setCopied(null), 1600);
  }

  async function paste(set: (v: string) => void) {
    tap();
    const text = (await Clipboard.getStringAsync()).trim();
    if (text) set(text);
  }

  /** Hands NEAR Intents the transaction ID, so the payment is picked up now rather than when it's spotted */
  async function submitTx() {
    setSending(true);
    setTxNote(null);
    try {
      const r = await api.submitIntentsTx(order.id, txHash.trim());
      if (r.swap) setSwap(r.swap);
      setTxNote({ ok: true, text: "Got it. Checking your payment now." });
    } catch (err) {
      setTxNote({ ok: false, text: err instanceof Error ? err.message : "That transaction couldn't be checked. Try again." });
    } finally {
      setSending(false);
    }
  }

  const stage = swap ? STAGE[swap] : 0;
  const failed = swap === "REFUNDED" || swap === "FAILED";

  return (
    <Modal visible animationType="slide" onRequestClose={() => onDone(false)} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md }}>
          <Pressable
            onPress={() => (quote && swap !== "SUCCESS" ? setQuote(null) : onDone(false))}
            hitSlop={10}
            accessibilityLabel={quote ? "Back" : "Close"}
            style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name={quote ? "arrow-back" : "close"} size={19} color={colors.ink} />
          </Pressable>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Txt variant="label">Pay with crypto</Txt>
            <Txt variant="caption" color={colors.muted}>Step {quote ? 2 : 1} of 2</Txt>
          </View>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView ref={scroll} contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xl }} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
          {/* What's being paid */}
          <View style={{ backgroundColor: colors.panel, borderRadius: radius.xl, padding: space.lg, gap: 4 }}>
            <Txt variant="caption" color="rgba(255,255,255,0.6)">Order {order.orderNumber}</Txt>
            <Txt style={{ fontFamily: fonts.displayHeavy, fontSize: 32, lineHeight: 36, color: colors.white }}>{formatNaira(order.total)}</Txt>
            <Txt variant="small" color="rgba(255,255,255,0.7)">
              {quote ? `Sotechy receives ${quote.amountOutUsdc} USDC` : usd ? `About $${usd.toFixed(2)} in crypto` : "Paid in crypto, settled in USDC"}
            </Txt>
          </View>

          {!quote ? (
            <>
              {!assets && !error && <ActivityIndicator color={colors.brand} style={{ marginTop: space.lg }} />}
              {assets && (
                <>
                  <Dropdown label="Network" onPress={() => setPicking("chain")}>
                    {chain ? (
                      <>
                        <ChainMark chain={chain} />
                        <View>
                          <Txt variant="label">{chain}</Txt>
                          <Txt variant="caption" color={colors.muted}>{coinsOn(chain).map((a) => a.symbol).join(", ")}</Txt>
                        </View>
                      </>
                    ) : (
                      <Txt variant="label" color={colors.muted}>Choose a network</Txt>
                    )}
                  </Dropdown>

                  <Dropdown label="Coin" onPress={() => setPicking("coin")}>
                    {asset ? (
                      <>
                        <CoinMark symbol={asset.symbol} chain={asset.chain} />
                        <View style={{ flex: 1 }}>
                          <Txt variant="label">{asset.symbol}</Txt>
                          <Txt variant="caption" color={colors.muted}>{COIN_NAME[asset.symbol] ?? asset.symbol} on {asset.chain}</Txt>
                        </View>
                        {estimate(asset) && <Txt variant="small" color={colors.muted}>{estimate(asset)}</Txt>}
                      </>
                    ) : (
                      <Txt variant="label" color={colors.muted}>Choose a coin</Txt>
                    )}
                  </Dropdown>

                  {asset && (
                    <View style={{ gap: 6 }}>
                      <Txt variant="caption" color={colors.muted}>Your {asset.chain} address, for refunds</Txt>
                      <View style={{ flexDirection: "row", alignItems: "center", minHeight: 56, paddingLeft: space.md, paddingRight: 6, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surface }}>
                        <TextInput
                          value={refundTo}
                          onChangeText={setRefundTo}
                          onFocus={showField}
                          placeholder={ADDRESS_HINT[asset.chain] ?? "0x…"}
                          placeholderTextColor={colors.faint}
                          autoCapitalize="none"
                          autoCorrect={false}
                          style={{ flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.ink, paddingVertical: 12 }}
                        />
                        <Pressable onPress={() => void paste(setRefundTo)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md, backgroundColor: colors.surfaceAlt }}>
                          <Txt variant="label">Paste</Txt>
                        </Pressable>
                      </View>
                      <Txt variant="caption" color={colors.muted}>The address you&apos;ll pay from. If the payment can&apos;t go through, your {asset.symbol} goes straight back to it.</Txt>
                    </View>
                  )}
                </>
              )}
              {error && <Txt variant="small" color={colors.danger}>{error}</Txt>}
            </>
          ) : (
            <>
              {/* What to send */}
              <View style={{ alignItems: "center", gap: space.sm, paddingVertical: space.sm }}>
                <CoinMark symbol={quote.symbol} chain={quote.chain} size={56} />
                <Txt variant="caption" color={colors.muted}>Send exactly</Txt>
                <Pressable onPress={() => void copy("amount", upTo4(quote.amountInFormatted))} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Txt style={{ fontFamily: fonts.displayHeavy, fontSize: 30, lineHeight: 34, color: colors.ink }} selectable>
                    {upTo4(quote.amountInFormatted)} {quote.symbol}
                  </Txt>
                  <Ionicons name={copied === "amount" ? "checkmark" : "copy-outline"} size={18} color={colors.brand} />
                </Pressable>
                <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: space.sm }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 5, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt }}>
                    <ChainMark chain={quote.chain} size={16} />
                    <Txt variant="caption">{quote.chain} network</Txt>
                  </View>
                  {left && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 5, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: left.over ? colors.dangerSoft : left.soon ? colors.warningSoft : colors.surfaceAlt }}>
                      <Ionicons name="time-outline" size={13} color={left.over ? colors.danger : left.soon ? colors.warning : colors.muted} />
                      <Txt variant="caption" color={left.over ? colors.danger : left.soon ? colors.warning : colors.ink}>{left.over ? "This address has expired" : `Send within ${left.text}`}</Txt>
                    </View>
                  )}
                </View>
              </View>

              {/* Where to send it */}
              <View style={{ backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1.5, borderColor: colors.line, padding: space.lg, gap: space.md }}>
                <Txt variant="caption" color={colors.muted}>To this {quote.chain} address</Txt>
                <Txt style={{ fontFamily: fonts.medium, fontSize: 15, lineHeight: 22, color: colors.ink }} selectable>{quote.depositAddress}</Txt>
                <Button title={copied === "address" ? "Copied" : "Copy address"} icon={copied === "address" ? "checkmark" : "copy-outline"} variant="dark" onPress={() => void copy("address", quote.depositAddress)} />
                {quote.depositMemo && (
                  <Pressable onPress={() => void copy("memo", quote.depositMemo!)} style={{ flexDirection: "row", alignItems: "center", gap: space.sm, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.warningSoft }}>
                    <Ionicons name="alert-circle" size={18} color={colors.warning} />
                    <View style={{ flex: 1 }}>
                      <Txt variant="label" color={colors.warning}>Include this memo</Txt>
                      <Txt variant="small" selectable>{quote.depositMemo}</Txt>
                    </View>
                    <Ionicons name={copied === "memo" ? "checkmark" : "copy-outline"} size={18} color={colors.warning} />
                  </Pressable>
                )}
              </View>

              {/* Where it is */}
              <View style={{ backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1.5, borderColor: colors.line, padding: space.lg, gap: space.md }}>
                {failed ? (
                  <View style={{ flexDirection: "row", gap: space.md }}>
                    <Ionicons name="alert-circle" size={22} color={colors.danger} />
                    <Txt variant="small" style={{ flex: 1 }}>
                      {swap === "REFUNDED" ? `The payment couldn't go through, so your ${quote.symbol} was sent back to ${short(refundTo)}.` : "Something went wrong with this payment. Contact us and we'll sort it out."}
                    </Txt>
                  </View>
                ) : (
                  STEPS.map((label, i) => {
                    const done = stage > i || swap === "SUCCESS";
                    const now = stage === i && swap !== "SUCCESS";
                    return (
                      <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                        <View style={{ width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: done ? colors.success : now ? colors.brandSoft : colors.surfaceAlt }}>
                          {done ? <Ionicons name="checkmark" size={15} color={colors.white} /> : now ? <ActivityIndicator size="small" color={colors.brand} /> : <Txt variant="caption" color={colors.faint}>{i + 1}</Txt>}
                        </View>
                        <Txt variant={now ? "label" : "small"} color={done || now ? colors.ink : colors.faint} style={{ flex: 1 }}>{label}</Txt>
                      </View>
                    );
                  })
                )}
                {swap === "INCOMPLETE_DEPOSIT" && <Txt variant="small" color={colors.warning}>Less than the amount shown arrived. Send the rest to the same address.</Txt>}
                {!failed && stage === 0 && swap !== "SUCCESS" && (quotedAt && Date.now() - quotedAt > 2 * 60_000 ? (
                  <View style={{ gap: 4, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.brandSoft }}>
                    <Txt variant="label">Already sent it? You&apos;re all good.</Txt>
                    <Txt variant="small">
                      Your money is safe. {quote.chain} sometimes takes a few minutes to confirm a payment, and we&apos;re watching for it the whole time. Your
                      order turns Paid by itself, even if you close this. If nothing shows after 30 minutes, message us from your order and we&apos;ll trace it for you.
                    </Txt>
                  </View>
                ) : (
                  <Txt variant="caption" color={colors.muted}>Payments on {quote.chain} usually show up in {ARRIVES[quote.chain] ?? "under a minute"}. We&apos;ll spot it as soon as it lands.</Txt>
                ))}
              </View>

              {/* Already sent: the transaction ID gets it picked up straight away */}
              {!failed && stage === 0 && swap !== "SUCCESS" && (
                <View style={{ gap: 6 }}>
                  <Txt variant="caption" color={colors.muted}>Sent it? Paste the transaction ID from your wallet</Txt>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 52, paddingLeft: space.md, paddingRight: 6, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surface }}>
                    <TextInput
                      value={txHash}
                      onChangeText={setTxHash}
                      onFocus={showField}
                      placeholder="Transaction ID (hash)"
                      placeholderTextColor={colors.faint}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={{ flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.ink, paddingVertical: 10 }}
                    />
                    {txHash.trim().length < 16 ? (
                      <Pressable onPress={() => void paste(setTxHash)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md, backgroundColor: colors.surfaceAlt }}>
                        <Txt variant="label">Paste</Txt>
                      </Pressable>
                    ) : (
                      <Pressable disabled={sending} onPress={() => void submitTx()} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md, backgroundColor: colors.ink }}>
                        {sending ? <ActivityIndicator size="small" color={colors.onInverse} /> : <Txt variant="label" color={colors.onInverse}>Confirm</Txt>}
                      </Pressable>
                    )}
                  </View>
                  {txNote && <Txt variant="caption" color={txNote.ok ? colors.success : colors.danger}>{txNote.text}</Txt>}
                </View>
              )}
              {!failed && swap !== "SUCCESS" && (
                <View style={{ flexDirection: "row", gap: space.sm, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.successSoft }}>
                  <Ionicons name="shield-checkmark" size={18} color={colors.success} />
                  <Txt variant="small" style={{ flex: 1 }}>
                    Paid already? You can close this. Your order turns Paid by itself once your payment arrives, even with the app closed.
                  </Txt>
                </View>
              )}
              <Txt variant="caption" color={colors.muted} style={{ textAlign: "center" }}>
                Refunds go to {short(refundTo)} · Powered by NEAR Intents
              </Txt>
            </>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={{ paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: insets.bottom + space.md, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.bg }}>
          {!quote ? (
            <Button title={asset ? `Continue with ${asset.symbol}` : "Continue"} icon="arrow-forward" variant="dark" loading={busy} disabled={!asset || refundTo.trim().length < 10} onPress={() => void getQuote()} />
          ) : swap === "SUCCESS" ? (
            <Button title="Paid. Back to your order" icon="checkmark-circle" variant="dark" onPress={() => onDone(true)} />
          ) : (
            <Button title={stage > 0 ? "Close. It'll confirm by itself" : "Close for now"} variant="ghost" onPress={() => onDone(false)} />
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Network list */}
      <Sheet visible={picking === "chain"} title="Choose a network" onClose={() => setPicking(null)}>
        <View style={{ gap: 2 }}>
          {chains.map((c) => (
            <Option
              key={c}
              selected={chain === c}
              left={<ChainMark chain={c} size={36} />}
              title={c}
              subtitle={coinsOn(c).map((a) => a.symbol).join(", ")}
              onPress={() => {
                setChain(c);
                if (!asset || asset.chain !== c) setAsset(coinsOn(c)[0] ?? null);
                setPicking(null);
              }}
            />
          ))}
        </View>
      </Sheet>

      {/* Coin list, on the chosen network */}
      <Sheet visible={picking === "coin"} title={chain ? `Coins on ${chain}` : "Choose a coin"} onClose={() => setPicking(null)}>
        <View style={{ gap: 2 }}>
          {coinsOn(chain).map((a) => (
            <Option
              key={a.assetId}
              selected={asset?.assetId === a.assetId}
              left={<CoinMark symbol={a.symbol} chain={a.chain} />}
              title={a.symbol}
              subtitle={`${COIN_NAME[a.symbol] ?? a.symbol} on ${a.chain}`}
              right={estimate(a)}
              onPress={() => {
                setAsset(a);
                setChain(a.chain);
                setPicking(null);
              }}
            />
          ))}
        </View>
      </Sheet>
    </Modal>
  );
}
