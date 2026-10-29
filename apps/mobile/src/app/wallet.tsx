// The customer's Sotechy wallet: token balances per store, pending tokens, sending by @username, activity.
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { formatNaira } from "@sotechy/shared";
import { Illo } from "@/components/illustrations";
import { Sheet } from "@/components/shop-filters";
import { openStore } from "@/components/store-bits";
import { router, Stack } from "expo-router";
import { useToast } from "@/components/toast";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button, Divider, Txt, ui, type IconName } from "@/components/ui";
import { UserAvatar } from "@/components/user-avatar";
import { ActivityRows } from "@/components/wallet-activity";
import { formatTokens, shortAddress, tokenNaira } from "@/lib/marketplace";
import { colors, fonts, gutter, radius, space } from "@/lib/theme";
import { useAsync } from "@/lib/use-async";
import { refreshHeldTokens } from "@/lib/held-tokens";

function ActionButton({ icon, label, onPress, primary }: { icon: IconName; label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        height: 46,
        borderRadius: radius.pill,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        backgroundColor: primary ? (pressed ? colors.inversePressed : colors.inverse) : pressed ? colors.surfaceAlt : colors.surface,
        borderWidth: primary ? 0 : 1,
        borderColor: colors.line,
      })}
    >
      <Ionicons name={icon} size={17} color={primary ? colors.onInverse : colors.ink} />
      <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: primary ? colors.onInverse : colors.ink }}>{label}</Text>
    </Pressable>
  );
}

export default function WalletScreen() {
  const { user } = useAuth();
  const toast = useToast();
  const [sheet, setSheet] = useState<"send" | "receive" | "help" | null>(null);
  const [to, setTo] = useState("");
  const [picked, setTicker] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [choosingToken, setChoosingToken] = useState(false);
  // Who the typed @username is, looked up as they type
  const [recipient, setRecipient] = useState<{ state: "idle" | "looking" | "found" | "missing"; who?: Awaited<ReturnType<typeof api.walletRecipient>>; message?: string }>({ state: "idle" });
  useEffect(() => {
    const name = to.trim().replace(/^@/, "");
    // An @username, or a Sotechy wallet address (0x and 40 characters)
    if (!/^[a-z0-9._]{3,}$/i.test(name) && !/^0x[0-9a-f]{40}$/i.test(name)) {
      setRecipient({ state: "idle" });
      return;
    }
    setRecipient({ state: "looking" });
    let live = true;
    const t = setTimeout(() => {
      api
        .walletRecipient(name)
        .then((who) => live && setRecipient({ state: "found", who }))
        .catch((err) => live && setRecipient({ state: "missing", message: err instanceof Error ? err.message : "No one on Sotechy matches that" }));
    }, 400);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [to]);
  const { data, loading, error, reload } = useAsync(() => api.wallet(), [], { live: true });
  const wallet = data ?? { address: null, addressUrl: null, balances: [], activity: [] };
  const held = wallet.balances.filter((b) => b.amount > 0);
  // Nothing is picked until the customer chooses a token
  const ticker = picked;

  const total = wallet.balances.reduce((n, b) => n + tokenNaira(b.amount), 0);
  const pending = wallet.balances.reduce((n, b) => n + b.pending, 0);
  const totalTokens = wallet.balances.reduce((n, b) => n + b.amount, 0);
  const balance = wallet.balances.find((b) => b.ticker === ticker)?.amount ?? 0;
  const value = Number(amount.replace(/\D/g, "")) || 0;
  const recipientOk = recipient.state === "found" && !recipient.who?.isYou;
  const chosen = held.find((b) => b.ticker === ticker);
  const copy = async () => {
    if (!wallet.address) return;
    await Clipboard.setStringAsync(wallet.address);
    toast("Wallet address copied");
  };
  const copyUsername = async () => {
    if (!user?.username) return;
    await Clipboard.setStringAsync(`@${user.username}`);
    toast("Username copied");
  };
  const send = async () => {
    setSending(true);
    try {
      if (!ticker) return;
      const r = await api.sendTokens({ to: to.trim(), ticker, amount: value });
      toast(`Sent ${formatTokens(r.amount)} $${r.ticker} to ${r.to ? `@${r.to}` : "their wallet"}`);
      setSheet(null);
      setTo("");
      setAmount("");
      setTicker(null);
      reload();
      void refreshHeldTokens();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't send the tokens");
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={ui.screen}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => setSheet("help")} hitSlop={8} accessibilityLabel="What are tokens?" style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="help" size={19} color={colors.ink} />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ padding: gutter, paddingBottom: space.xxl * 2, gap: space.lg }} refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={reload} />}>
        {!data && loading && <ActivityIndicator color={colors.ink} style={{ marginTop: space.xl }} />}
        {error && <Txt variant="small" color={colors.danger}>{error}</Txt>}
        {/* Balance */}
        <View style={{ gap: 2, paddingTop: space.sm }}>
          <Txt variant="small">Your tokens</Txt>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <Text style={{ fontFamily: fonts.displayHeavy, fontSize: 38, color: colors.ink, letterSpacing: -1 }}>{formatTokens(totalTokens)}</Text>
            <Txt variant="label" color={colors.muted}>tokens</Txt>
          </View>
          <Txt variant="label" color={colors.ink2}>≈ {formatNaira(Math.round(total))} to spend</Txt>
          <Pressable onPress={copy} hitSlop={6} style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" }}>
            {user?.username ? <Txt variant="caption" color={colors.ink2}>@{user.username}</Txt> : null}
            {wallet.address && <Txt variant="caption">{shortAddress(wallet.address)}</Txt>}
            {wallet.address && <Ionicons name="copy-outline" size={13} color={colors.muted} />}
          </Pressable>
          {pending > 0 && (
            <Txt variant="caption" style={{ marginTop: 6 }}>
              <Ionicons name="time-outline" size={12} color={colors.muted} /> {formatTokens(pending)} more tokens arrive when your orders are delivered
            </Txt>
          )}
        </View>
        <View style={{ flexDirection: "row", gap: space.sm }}>
          <ActionButton primary icon="arrow-up" label="Send" onPress={() => (held.length ? setSheet("send") : toast("You don't have tokens to send yet"))} />
          <ActionButton icon="arrow-down" label="Receive" onPress={() => setSheet("receive")} />
          <ActionButton icon="storefront-outline" label="Spend" onPress={() => router.push("/stores")} />
        </View>

        {/* Tokens */}
        <View style={{ gap: space.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Txt variant="heading">Store balance</Txt>
            <Pressable
              onPress={() => router.push("/wallet-activity")}
              hitSlop={6}
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 5, height: 34, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: pressed ? colors.surfaceAlt : colors.surface, borderWidth: 1, borderColor: colors.line })}
            >
              <Ionicons name="time-outline" size={15} color={colors.ink} />
              <Txt variant="label" style={{ fontSize: 13 }}>Activity</Txt>
            </Pressable>
          </View>
          <View style={[ui.card, { paddingVertical: space.xs }]}>
            {wallet.balances.length === 0 && <Txt variant="small" style={{ paddingVertical: space.md }}>No tokens yet. You earn them on every order, once it&apos;s delivered.</Txt>}
            {wallet.balances.map((b, i) => {
              return (
                <View key={b.ticker}>
                  {i > 0 && <Divider />}
                  <Pressable onPress={() => b.slug && openStore(b.slug)} style={{ flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md }}>
                    <Illo name="coin" size={38} />
                    <View style={{ flex: 1, gap: 1 }}>
                      <Txt variant="label" numberOfLines={1}>
                        <Text style={{ fontFamily: fonts.bold, color: colors.brandPressed }}>${b.ticker}</Text>
                        <Text style={{ fontFamily: fonts.medium, color: colors.ink2 }}> · {b.ticker === "SOTECHY" ? "Sotechy" : b.store}</Text>
                      </Txt>
                      {(b.earned ?? 0) > 0 && <Txt variant="caption">{formatTokens(b.earned!)} earned all time</Txt>}
                      {b.pending > 0 && <Txt variant="caption" color={colors.warning}>+{formatTokens(b.pending)} pending</Txt>}
                      {(b.held ?? 0) > 0 && <Txt variant="caption" color={colors.ink2}>{formatTokens(b.held!)} held for an order you haven&apos;t paid yet</Txt>}
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Txt variant="price">{formatTokens(b.amount)}</Txt>
                      <Txt variant="caption">≈ {formatNaira(Math.round(tokenNaira(b.amount)))}</Txt>
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>

        {/* The last 10 movements; the rest are under Activity */}
        <View style={{ gap: space.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Txt variant="heading">Recent activity</Txt>
            {wallet.activity.length > 10 && (
              <Pressable onPress={() => router.push("/wallet-activity")} hitSlop={8}>
                <Txt variant="label" color={colors.brandPressed}>See all</Txt>
              </Pressable>
            )}
          </View>
          <View style={[ui.card, { paddingVertical: space.xs }]}>
            <ActivityRows items={wallet.activity.slice(0, 10)} />
          </View>
          <Pressable disabled={!wallet.addressUrl} onPress={() => wallet.addressUrl && Linking.openURL(wallet.addressUrl)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: space.sm }}>
            <Ionicons name="open-outline" size={15} color={colors.brandPressed} />
            <Txt variant="label" color={colors.brandPressed}>See every transaction on Monad</Txt>
          </Pressable>
        </View>
        <Txt variant="caption" style={{ textAlign: "center" }}>
          You earn 1 token per ₦1 at each store when your order is delivered, plus 10% in $SOTECHY at other stores and a bonus for reviews. Spend them at checkout. Every token and receipt is recorded on Monad.
        </Txt>
      </ScrollView>

      <Sheet
        visible={sheet === "send"}
        title="Send tokens"
        onClose={() => setSheet(null)}
        footer={
          <Button
            title={value && ticker ? `Send ${formatTokens(value)} $${ticker}` : "Send"}
            icon="arrow-up"
            disabled={!recipientOk || !value || value > balance || sending}
            onPress={send}
          />
        }
      >
        <View style={{ gap: space.sm }}>
          <Txt variant="label">To</Txt>
          <TextInput
            value={to}
            onChangeText={setTo}
            autoCapitalize="none"
            placeholder="Username or Sotechy wallet address"
            placeholderTextColor={colors.faint}
            style={{ height: 50, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: space.lg, fontFamily: fonts.medium, fontSize: 15, color: colors.ink }}
          />
          {recipient.state === "looking" && <Txt variant="caption">Looking them up…</Txt>}
          {recipient.state === "missing" && <Txt variant="caption" color={colors.danger}>{recipient.message}</Txt>}
          {recipient.state === "found" && recipient.who && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md, borderRadius: radius.lg, backgroundColor: recipient.who.isYou ? colors.dangerSoft : colors.successSoft }}>
              <UserAvatar seed={recipient.who.seed} preset={recipient.who.avatarStyle} size={40} />
              <View style={{ flex: 1 }}>
                <Txt variant="label">{recipient.who.name ?? (recipient.who.username ? `@${recipient.who.username}` : "Sotechy user")}</Txt>
                <Txt variant="caption">{recipient.who.isYou ? "That's you. Pick someone else." : `${recipient.who.username ? `@${recipient.who.username}` : "Sotechy wallet"} · on Sotechy`}</Txt>
              </View>
              <Ionicons name={recipient.who.isYou ? "close-circle" : "checkmark-circle"} size={22} color={recipient.who.isYou ? colors.danger : colors.success} />
            </View>
          )}
          {recipient.state === "idle" && <Txt variant="caption">You can only send to people on Sotechy. Outside wallets can&apos;t receive store tokens.</Txt>}
        </View>
        <View style={{ gap: space.sm }}>
          <Txt variant="label">Token</Txt>
          <Pressable
            onPress={() => setChoosingToken(!choosingToken)}
            style={{ flexDirection: "row", alignItems: "center", gap: space.md, height: 56, borderRadius: radius.lg, borderWidth: 1, borderColor: choosingToken ? colors.ink : colors.line, backgroundColor: colors.surface, paddingHorizontal: space.md }}
          >
            <Illo name="coin" size={32} />
            {chosen ? (
              <View style={{ flex: 1 }}>
                <Txt variant="label" numberOfLines={1}>
                  <Text style={{ fontFamily: fonts.bold, color: colors.brandPressed }}>${chosen.ticker}</Text>
                  <Text style={{ fontFamily: fonts.medium, color: colors.ink2 }}> · {chosen.ticker === "SOTECHY" ? "Sotechy" : chosen.store}</Text>
                </Txt>
                <Txt variant="caption">You have {formatTokens(balance)}</Txt>
              </View>
            ) : (
              <Txt variant="label" color={colors.muted} style={{ flex: 1 }}>Select token</Txt>
            )}
            <Ionicons name={choosingToken ? "chevron-up" : "chevron-down"} size={18} color={colors.ink2} />
          </Pressable>
          {choosingToken && (
            <View style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, overflow: "hidden" }}>
              {held.map((b, i) => (
                <Pressable
                  key={b.ticker}
                  onPress={() => {
                    setTicker(b.ticker);
                    setChoosingToken(false);
                  }}
                  style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.md, paddingVertical: space.md, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line, backgroundColor: pressed || b.ticker === ticker ? colors.surfaceAlt : colors.surface })}
                >
                  <Illo name="coin" size={28} />
                  <Txt variant="label" numberOfLines={1} style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.bold, color: colors.brandPressed }}>${b.ticker}</Text>
                    <Text style={{ fontFamily: fonts.medium, color: colors.ink2 }}> · {b.ticker === "SOTECHY" ? "Sotechy" : b.store}</Text>
                  </Txt>
                  <Txt variant="label">{formatTokens(b.amount)}</Txt>
                  {b.ticker === ticker && <Ionicons name="checkmark" size={18} color={colors.success} />}
                </Pressable>
              ))}
            </View>
          )}
        </View>
        <View style={{ gap: space.sm }}>
          <View style={ui.between}>
            <Txt variant="label">Amount</Txt>
            <Pressable onPress={() => setAmount(String(balance))}>
              <Txt variant="label" color={colors.brandPressed}>Max</Txt>
            </Pressable>
          </View>
          <TextInput
            value={amount ? Number(amount.replace(/\D/g, "")).toLocaleString("en-NG") : ""}
            onChangeText={setAmount}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.faint}
            style={{ height: 60, borderRadius: radius.lg, borderWidth: 1, borderColor: value > balance ? colors.danger : colors.line, backgroundColor: colors.surface, paddingHorizontal: space.lg, fontFamily: fonts.displayHeavy, fontSize: 26, color: colors.ink }}
          />
          <Txt variant="caption" color={value > balance ? colors.danger : colors.muted}>
            {!chosen ? "Select a token first" : value > balance ? "More than you have" : `≈ ${formatNaira(Math.round(tokenNaira(value)))} · you have ${formatTokens(balance)} $${chosen.ticker}`}
          </Txt>
        </View>
      </Sheet>

      <Sheet visible={sheet === "help"} title="What are tokens?" onClose={() => setSheet(null)}>
        <View style={{ gap: space.lg }}>
          <Txt variant="body" color={colors.ink2}>
            Tokens are store credit you earn when you shop on Sotechy. Each store has its own, like $XENA from Xena Gadgets, and Sotechy&apos;s is $SOTECHY.
          </Txt>
          {[
            {
              title: "How you get them",
              icon: "add-circle-outline" as IconName,
              tone: colors.success,
              items: ["1 token for every ₦1 you spend at a store", "10% extra in $SOTECHY when you buy from other stores", "Released when your order is delivered", "5% more for reviewing what you bought, 10% with a photo", "Buying in a store's own shop too, when they reward you with your @username"],
            },
            {
              title: "What you can do with them",
              icon: "checkmark-circle-outline" as IconName,
              tone: colors.success,
              items: ["Pay at the store that gave them, at checkout", "Mix tokens and money in one payment (at least ₦100 in money)", "Spend $SOTECHY at any Sotechy store", "Send them to other Sotechy users by @username"],
            },
            {
              title: "What they are not",
              icon: "close-circle-outline" as IconName,
              tone: colors.danger,
              items: ["Not money: you can't withdraw them to a bank", "Not tradeable for now: you can't sell or swap them", "Can't be sent to wallets outside Sotechy", "Not an investment: their value doesn't go up", "Only spendable at the store that issued them ($SOTECHY at Sotechy stores)"],
            },
          ].map((g) => (
            <View key={g.title} style={{ gap: space.sm }}>
              <Txt variant="label">{g.title}</Txt>
              {g.items.map((it) => (
                <View key={it} style={{ flexDirection: "row", gap: space.sm, alignItems: "flex-start" }}>
                  <Ionicons name={g.icon} size={17} color={g.tone} style={{ marginTop: 1 }} />
                  <Txt variant="small" color={colors.ink2} style={{ flex: 1, fontSize: 14 }}>{it}</Txt>
                </View>
              ))}
            </View>
          ))}
          <View style={{ flexDirection: "row", gap: space.sm, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt }}>
            <Ionicons name="time-outline" size={17} color={colors.ink2} style={{ marginTop: 1 }} />
            <Txt variant="small" color={colors.ink2} style={{ flex: 1, fontSize: 14 }}>
              <Text style={{ fontFamily: fonts.semibold }}>In the future, </Text>a store may choose to make its token tradeable. It&apos;s each store&apos;s decision, so some may and others may not. We&apos;ll tell you before anything changes.
            </Txt>
          </View>
          <Txt variant="caption">About ₦{(Math.round(tokenNaira(1000) * 100) / 100).toFixed(2)} of spending per 1,000 tokens. Your tokens live in your Sotechy wallet on the Monad network, so every movement can be checked.</Txt>
        </View>
      </Sheet>

      <Sheet visible={sheet === "receive"} title="Receive tokens" onClose={() => setSheet(null)}>
        <View style={{ alignItems: "center", gap: space.md, paddingVertical: space.md }}>
          <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
            <Illo name="wallet" size={52} />
          </View>
          {user?.username ? (
            <Pressable onPress={copyUsername} hitSlop={6} style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
              <Text style={{ fontFamily: fonts.displayHeavy, fontSize: 30, color: colors.ink }}>@{user.username}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt }}>
                <Ionicons name="copy-outline" size={14} color={colors.ink2} />
                <Txt variant="caption" color={colors.ink2}>Copy</Txt>
              </View>
            </Pressable>
          ) : (
            <Text style={{ fontFamily: fonts.displayHeavy, fontSize: 30, color: colors.ink }}>Your wallet</Text>
          )}
          <Txt variant="small" style={{ textAlign: "center" }}>Other Sotechy users send you tokens with your username. This is your wallet&apos;s address on Monad, where your tokens are recorded.</Txt>
          <Pressable onPress={copy} style={{ flexDirection: "row", alignItems: "center", gap: space.sm, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt }}>
            <Txt variant="caption" color={colors.ink2} style={{ fontFamily: fonts.medium }}>{wallet.address ?? ""}</Txt>
            <Ionicons name="copy-outline" size={16} color={colors.ink2} />
          </Pressable>
        </View>
      </Sheet>
    </View>
  );
}
