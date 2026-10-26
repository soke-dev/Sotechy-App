// The customer's Sotechy wallet: token balances per store, pending tokens, sending by @username, activity.
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { formatNaira } from "@sotechy/shared";
import { Illo } from "@/components/illustrations";
import { Sheet } from "@/components/shop-filters";
import { openStore, StoreLogo } from "@/components/store-bits";
import { useToast } from "@/components/toast";
import { Button, Chip, Divider, Pill, Txt, ui, type IconName } from "@/components/ui";
import { ago, formatTokens, shortAddress, storeByTicker, tokenNaira, wallet, walletActivity, type WalletEventKind } from "@/lib/marketplace";
import { colors, fonts, gutter, radius, space } from "@/lib/theme";

const EVENT: Record<WalletEventKind, { icon: IconName; tone: string; sign: "+" | "−" | "" }> = {
  earned: { icon: "arrow-down", tone: colors.success, sign: "+" },
  bonus: { icon: "star", tone: colors.brandPressed, sign: "+" },
  received: { icon: "arrow-down", tone: colors.success, sign: "+" },
  pending: { icon: "time-outline", tone: colors.warning, sign: "" },
  spent: { icon: "bag-handle-outline", tone: colors.ink2, sign: "−" },
  sent: { icon: "arrow-up", tone: colors.ink2, sign: "−" },
};

function ActionButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flex: 1, alignItems: "center", gap: 6, paddingVertical: space.md, borderRadius: radius.lg, backgroundColor: pressed ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.09)" })}>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={19} color={colors.white} />
      </View>
      <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: colors.white }}>{label}</Text>
    </Pressable>
  );
}

export default function WalletScreen() {
  const toast = useToast();
  const [sheet, setSheet] = useState<"send" | "receive" | null>(null);
  const [to, setTo] = useState("");
  const [ticker, setTicker] = useState(wallet.balances[0].ticker);
  const [amount, setAmount] = useState("");

  const total = wallet.balances.reduce((n, b) => n + tokenNaira(b.amount), 0);
  const pending = wallet.balances.reduce((n, b) => n + b.pending, 0);
  const balance = wallet.balances.find((b) => b.ticker === ticker)?.amount ?? 0;
  const value = Number(amount.replace(/\D/g, "")) || 0;
  const recipientOk = /^@?[a-z0-9._]{3,}$/i.test(to.trim()) || /^0x[0-9a-f]{40}$/i.test(to.trim());
  const copy = async () => {
    await Clipboard.setStringAsync(wallet.address);
    toast("Wallet address copied");
  };

  return (
    <View style={ui.screen}>
      <ScrollView contentContainerStyle={{ padding: gutter, paddingBottom: space.xxl * 2, gap: space.lg }}>
        {/* Balance */}
        <View style={{ borderRadius: radius.xl, backgroundColor: colors.panel, padding: space.lg, gap: space.lg, overflow: "hidden" }}>
          <View style={{ position: "absolute", right: -50, top: -60, width: 180, height: 180, borderRadius: 90, backgroundColor: colors.brand }} />
          <View style={{ gap: 4 }}>
            <Txt variant="small" color="rgba(255,255,255,0.65)">You can spend about</Txt>
            <Text style={{ fontFamily: fonts.displayHeavy, fontSize: 36, color: colors.white, letterSpacing: -0.8 }}>{formatNaira(Math.round(total))}</Text>
            <Pressable onPress={copy} style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" }}>
              <Txt variant="label" color={colors.brandYellow}>@{wallet.username}</Txt>
              <Txt variant="caption" color="rgba(255,255,255,0.55)">· {shortAddress(wallet.address)}</Txt>
              <Ionicons name="copy-outline" size={13} color="rgba(255,255,255,0.55)" />
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", gap: space.sm }}>
            <ActionButton icon="arrow-up" label="Send" onPress={() => setSheet("send")} />
            <ActionButton icon="arrow-down" label="Receive" onPress={() => setSheet("receive")} />
            <ActionButton icon="storefront-outline" label="Spend" onPress={() => openStore("sotechy")} />
          </View>
        </View>

        {pending > 0 && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.warningSoft }}>
            <Ionicons name="time" size={20} color={colors.warning} />
            <Txt variant="small" color={colors.ink2} style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.bold }}>{formatTokens(pending)} tokens pending.</Text> They&apos;re released to you when your orders are delivered.
            </Txt>
          </View>
        )}

        {/* Tokens */}
        <View style={{ gap: space.sm }}>
          <Txt variant="heading">Your tokens</Txt>
          <View style={[ui.card, { paddingVertical: space.xs }]}>
            {wallet.balances.map((b, i) => {
              const store = storeByTicker(b.ticker);
              return (
                <View key={b.ticker}>
                  {i > 0 && <Divider />}
                  <Pressable onPress={() => store && openStore(store.slug)} style={{ flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md }}>
                    {store ? <StoreLogo store={store} size={44} /> : <Illo name="coin" size={44} />}
                    <View style={{ flex: 1, gap: 1 }}>
                      <Txt variant="label" color={colors.brandPressed} style={{ fontFamily: fonts.bold }}>${b.ticker}</Txt>
                      <Txt variant="caption">{b.ticker === "SOTECHY" ? "Spend at any Sotechy store" : `Spend at ${store?.name ?? "the store"}`}</Txt>
                      {b.pending > 0 && <Pill label={`+${formatTokens(b.pending)} pending`} tone="warning" />}
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

        {/* How tokens work */}
        <View style={{ flexDirection: "row", gap: space.sm }}>
          {[
            { illo: "coin" as const, text: "1 token per ₦1 you spend" },
            { illo: "sparkle" as const, text: "+10% $SOTECHY at other stores" },
            { illo: "heart" as const, text: "Up to +10% for a review" },
          ].map((x) => (
            <View key={x.text} style={{ flex: 1, alignItems: "center", gap: 6, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.brandSoft }}>
              <Illo name={x.illo} size={30} />
              <Txt variant="caption" color={colors.ink2} style={{ textAlign: "center" }}>{x.text}</Txt>
            </View>
          ))}
        </View>

        {/* Activity */}
        <View style={{ gap: space.sm }}>
          <Txt variant="heading">Activity</Txt>
          <View style={[ui.card, { paddingVertical: space.xs }]}>
            {walletActivity.map((e, i) => {
              const k = EVENT[e.kind];
              return (
                <View key={e.id}>
                  {i > 0 && <Divider />}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md }}>
                    <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name={k.icon} size={17} color={k.tone} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Txt variant="medium" numberOfLines={1} style={{ fontSize: 14 }}>{e.title}</Txt>
                      <Txt variant="caption">{ago(e.minsAgo)}</Txt>
                    </View>
                    <Txt variant="label" color={k.tone}>
                      {k.sign}
                      {formatTokens(e.amount)} ${e.ticker}
                    </Txt>
                  </View>
                </View>
              );
            })}
          </View>
          <Pressable onPress={() => toast("Opens your wallet on the Monad explorer")} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: space.sm }}>
            <Ionicons name="open-outline" size={15} color={colors.brandPressed} />
            <Txt variant="label" color={colors.brandPressed}>See every transaction on Monad</Txt>
          </Pressable>
        </View>
        <Txt variant="caption" style={{ textAlign: "center" }}>Sample wallet · balances come from Monad once the marketplace launches</Txt>
      </ScrollView>

      <Sheet
        visible={sheet === "send"}
        title="Send tokens"
        onClose={() => setSheet(null)}
        footer={
          <Button
            title={value ? `Send ${formatTokens(value)} $${ticker}` : "Send"}
            icon="arrow-up"
            disabled={!recipientOk || !value || value > balance}
            onPress={() => {
              toast(`Sent ${formatTokens(value)} $${ticker} to ${to.trim().startsWith("0x") ? shortAddress(to.trim()) : `@${to.trim().replace(/^@/, "")}`}`);
              setSheet(null);
              setTo("");
              setAmount("");
            }}
          />
        }
      >
        <View style={{ gap: space.sm }}>
          <Txt variant="label">To</Txt>
          <TextInput
            value={to}
            onChangeText={setTo}
            autoCapitalize="none"
            placeholder="@username or Sotechy wallet address"
            placeholderTextColor={colors.faint}
            style={{ height: 50, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: space.lg, fontFamily: fonts.medium, fontSize: 15, color: colors.ink }}
          />
          <Txt variant="caption">You can only send to Sotechy wallets. Outside wallets can&apos;t receive store tokens.</Txt>
        </View>
        <View style={{ gap: space.sm }}>
          <Txt variant="label">Token</Txt>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
            {wallet.balances.map((b) => (
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

      <Sheet visible={sheet === "receive"} title="Receive tokens" onClose={() => setSheet(null)}>
        <View style={{ alignItems: "center", gap: space.md, paddingVertical: space.md }}>
          <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
            <Illo name="wallet" size={52} />
          </View>
          <Text style={{ fontFamily: fonts.displayHeavy, fontSize: 30, color: colors.ink }}>@{wallet.username}</Text>
          <Txt variant="small" style={{ textAlign: "center" }}>Other Sotechy users can send you tokens with your username or this address.</Txt>
          <Pressable onPress={copy} style={{ flexDirection: "row", alignItems: "center", gap: space.sm, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt }}>
            <Txt variant="caption" color={colors.ink2} style={{ fontFamily: fonts.medium }}>{wallet.address}</Txt>
            <Ionicons name="copy-outline" size={16} color={colors.ink2} />
          </Pressable>
        </View>
      </Sheet>
    </View>
  );
}
