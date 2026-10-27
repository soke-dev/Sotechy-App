// The customer's Sotechy wallet: token balances per store, pending tokens, sending by @username, activity.
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { ActivityIndicator, Image, Linking, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { formatNaira, type WalletActivity } from "@sotechy/shared";
import { Illo } from "@/components/illustrations";
import { Sheet } from "@/components/shop-filters";
import { openStore } from "@/components/store-bits";
import { Stack } from "expo-router";
import { useToast } from "@/components/toast";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button, Chip, Divider, Txt, ui, type IconName } from "@/components/ui";
import { formatTokens, shortAddress, tokenNaira } from "@/lib/marketplace";
import { colors, fonts, gutter, radius, space } from "@/lib/theme";
import { useAsync } from "@/lib/use-async";

const EVENT: Record<WalletActivity["kind"], { icon: IconName; tone: string; title: (e: WalletActivity) => string }> = {
  earned: { icon: "arrow-down", tone: colors.success, title: (e) => `Earned at ${e.store}${e.order ? ` · ${e.order}` : ""}` },
  bonus: { icon: "star", tone: colors.brandPressed, title: (e) => `$SOTECHY bonus${e.order ? ` · ${e.order}` : ""}` },
  received: { icon: "arrow-down", tone: colors.success, title: (e) => `From @${e.who ?? "someone"}` },
  spent: { icon: "bag-handle-outline", tone: colors.ink2, title: (e) => `Spent at ${e.store}` },
  sent: { icon: "arrow-up", tone: colors.ink2, title: (e) => `To @${e.who ?? "someone"}` },
  refunded: { icon: "return-up-back-outline", tone: colors.ink2, title: (e) => `Refunded order${e.order ? ` · ${e.order}` : ""}` },
};

const ago = (iso: string) => {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  return mins < 1 ? "just now" : mins < 60 ? `${mins} min ago` : mins < 60 * 24 ? `${Math.round(mins / 60)}h ago` : `${Math.round(mins / 60 / 24)}d ago`;
};

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
  const { data, loading, error, reload } = useAsync(() => api.wallet(), []);
  const wallet = data ?? { address: null, addressUrl: null, balances: [], activity: [] };
  const held = wallet.balances.filter((b) => b.amount > 0);
  const ticker = picked ?? held[0]?.ticker ?? "SOTECHY";

  const total = wallet.balances.reduce((n, b) => n + tokenNaira(b.amount), 0);
  const pending = wallet.balances.reduce((n, b) => n + b.pending, 0);
  const totalTokens = wallet.balances.reduce((n, b) => n + b.amount, 0);
  const balance = wallet.balances.find((b) => b.ticker === ticker)?.amount ?? 0;
  const value = Number(amount.replace(/\D/g, "")) || 0;
  const recipientOk = /^@?[a-z0-9._]{3,}$/i.test(to.trim());
  const copy = async () => {
    if (!wallet.address) return;
    await Clipboard.setStringAsync(wallet.address);
    toast("Wallet address copied");
  };
  const send = async () => {
    setSending(true);
    try {
      const r = await api.sendTokens({ to: to.trim(), ticker, amount: value });
      toast(`Sent ${formatTokens(r.amount)} $${r.ticker} to @${r.to}`);
      setSheet(null);
      setTo("");
      setAmount("");
      reload();
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
          <ActionButton icon="storefront-outline" label="Spend" onPress={() => toast("Paying with tokens at checkout is coming soon")} />
        </View>

        {/* Tokens */}
        <View style={{ gap: space.sm }}>
          <Txt variant="heading">By store</Txt>
          <View style={[ui.card, { paddingVertical: space.xs }]}>
            {wallet.balances.length === 0 && <Txt variant="small" style={{ paddingVertical: space.md }}>No tokens yet. You earn them on every order, once it&apos;s delivered.</Txt>}
            {wallet.balances.map((b, i) => {
              return (
                <View key={b.ticker}>
                  {i > 0 && <Divider />}
                  <Pressable onPress={() => b.slug && openStore(b.slug)} style={{ flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md }}>
                    {b.logoUrl ? <Image source={{ uri: b.logoUrl }} style={{ width: 38, height: 38, borderRadius: 11 }} /> : <Illo name="coin" size={38} />}
                    <View style={{ flex: 1, gap: 1 }}>
                      <Txt variant="label" color={colors.brandPressed} style={{ fontFamily: fonts.bold }}>${b.ticker}</Txt>
                      <Txt variant="caption">{b.ticker === "SOTECHY" ? "Sotechy's own token" : b.store}</Txt>
                      {b.pending > 0 && <Txt variant="caption" color={colors.warning}>+{formatTokens(b.pending)} pending</Txt>}
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

        {/* Activity */}
        <View style={{ gap: space.sm }}>
          <Txt variant="heading">Activity</Txt>
          <View style={[ui.card, { paddingVertical: space.xs }]}>
            {wallet.activity.length === 0 && <Txt variant="small" style={{ paddingVertical: space.md }}>Tokens you earn and send show here.</Txt>}
            {wallet.activity.map((e, i) => {
              const k = EVENT[e.kind];
              return (
                <View key={e.id}>
                  {i > 0 && <Divider />}
                  <Pressable disabled={!e.txUrl} onPress={() => e.txUrl && Linking.openURL(e.txUrl)} style={{ flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md }}>
                    <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name={k.icon} size={17} color={k.tone} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Txt variant="medium" numberOfLines={1} style={{ fontSize: 14 }}>{k.title(e)}</Txt>
                      <Txt variant="caption">
                        {ago(e.at)}
                        {e.txUrl ? " · on Monad" : " · being recorded"}
                      </Txt>
                    </View>
                    <Txt variant="label" color={k.tone}>
                      {e.amount > 0 ? "+" : "−"}
                      {formatTokens(Math.abs(e.amount))} ${e.ticker}
                    </Txt>
                  </Pressable>
                </View>
              );
            })}
          </View>
          <Pressable disabled={!wallet.addressUrl} onPress={() => wallet.addressUrl && Linking.openURL(wallet.addressUrl)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: space.sm }}>
            <Ionicons name="open-outline" size={15} color={colors.brandPressed} />
            <Txt variant="label" color={colors.brandPressed}>See every transaction on Monad</Txt>
          </Pressable>
        </View>
        <Txt variant="caption" style={{ textAlign: "center" }}>
          You earn 1 token per ₦1 at each store when your order is delivered, plus 10% in $SOTECHY at other stores. Every token and receipt is recorded on Monad.
        </Txt>
      </ScrollView>

      <Sheet
        visible={sheet === "send"}
        title="Send tokens"
        onClose={() => setSheet(null)}
        footer={
          <Button
            title={value ? `Send ${formatTokens(value)} $${ticker}` : "Send"}
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
            placeholder="@username"
            placeholderTextColor={colors.faint}
            style={{ height: 50, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: space.lg, fontFamily: fonts.medium, fontSize: 15, color: colors.ink }}
          />
          <Txt variant="caption">You can only send to people on Sotechy. Outside wallets can&apos;t receive store tokens.</Txt>
        </View>
        <View style={{ gap: space.sm }}>
          <Txt variant="label">Token</Txt>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
            {held.map((b) => (
              <Chip key={b.ticker} label={`$${b.ticker} · ${formatTokens(b.amount)}`} active={ticker === b.ticker} onPress={() => setTicker(b.ticker)} />
            ))}
          </View>
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
            {value > balance ? "More than you have" : `≈ ${formatNaira(Math.round(tokenNaira(value)))} · you have ${formatTokens(balance)} $${ticker}`}
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
              items: ["1 token for every ₦1 you spend at a store", "10% extra in $SOTECHY when you buy from other stores", "Released when your order is delivered", "Coming soon: up to 10% more for reviewing what you bought"],
            },
            {
              title: "What you can do with them",
              icon: "checkmark-circle-outline" as IconName,
              tone: colors.success,
              items: ["Send them to other Sotechy users by @username", "Coming soon: pay at the store that gave them, like cash", "Coming soon: mix tokens and money in one payment, and spend $SOTECHY at any Sotechy store"],
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
          <Text style={{ fontFamily: fonts.displayHeavy, fontSize: 30, color: colors.ink }}>{user?.username ? `@${user.username}` : "Your wallet"}</Text>
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
