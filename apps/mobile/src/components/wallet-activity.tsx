// The wallet's token activity rows: earned, spent, sent and the rest. Tapping one opens its details and its record on chain.
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import type { WalletActivity } from "@sotechy/shared";
import { formatTokens } from "@/lib/marketplace";
import { colors, fonts, radius, space } from "@/lib/theme";
import { Sheet } from "./shop-filters";
import { useToast } from "./toast";
import { Button, Divider, Txt, type IconName } from "./ui";

const EVENT: Record<WalletActivity["kind"], { icon: IconName; tone: string; title: (e: WalletActivity) => string; what: string }> = {
  earned: { icon: "arrow-down", tone: colors.success, title: (e) => `Earned at ${e.store}${e.order ? ` · ${e.order}` : ""}`, what: "Earned on a delivered order" },
  bonus: { icon: "star", tone: colors.brandPressed, title: (e) => `$SOTECHY bonus${e.order ? ` · ${e.order}` : ""}`, what: "10% bonus for shopping at another store" },
  received: { icon: "arrow-down", tone: colors.success, title: (e) => `From @${e.who ?? "someone"}`, what: "Sent to you" },
  review: { icon: "chatbubble-ellipses-outline", tone: colors.brandPressed, title: (e) => `Review bonus${e.order ? ` · ${e.order}` : ""}`, what: "Bonus for reviewing what you bought" },
  walk_in: { icon: "storefront-outline", tone: colors.success, title: (e) => `Bought in store at ${e.store}`, what: "Earned buying in the store's shop" },
  spent: { icon: "bag-handle-outline", tone: colors.ink2, title: (e) => `Paid at ${e.store}${e.order ? ` · ${e.order}` : ""}`, what: "Paid at checkout" },
  returned: { icon: "return-up-back-outline", tone: colors.success, title: (e) => `Given back${e.order ? ` · ${e.order} cancelled` : ""}`, what: "Given back because the order was cancelled" },
  sent: { icon: "arrow-up", tone: colors.ink2, title: (e) => `To @${e.who ?? "someone"}`, what: "You sent them" },
  refunded: { icon: "return-up-back-outline", tone: colors.ink2, title: (e) => `Refunded order${e.order ? ` · ${e.order}` : ""}`, what: "Taken back because the order was refunded" },
};

const ago = (iso: string) => {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  return mins < 1 ? "just now" : mins < 60 ? `${mins} min ago` : mins < 60 * 24 ? `${Math.round(mins / 60)}h ago` : `${Math.round(mins / 60 / 24)}d ago`;
};

const when = (iso: string) => new Date(iso).toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

function Row({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.sm }}>
      <Txt variant="small" style={{ width: 96 }}>{label}</Txt>
      <Txt variant="medium" numberOfLines={1} style={{ flex: 1, fontSize: 14, textAlign: "right" }}>{value}</Txt>
      {onPress ? <Ionicons name="copy-outline" size={14} color={colors.muted} /> : null}
    </Pressable>
  );
}

/** One movement in full, with a button to its transaction on the blockchain */
function ActivitySheet({ item, visible, onClose }: { item: WalletActivity | null; visible: boolean; onClose: () => void }) {
  const toast = useToast();
  const e = item;
  const k = e ? EVENT[e.kind] : null;
  const hash = e?.txUrl?.split("/").pop() ?? null;
  const copyHash = async () => {
    if (!hash) return;
    await Clipboard.setStringAsync(hash);
    toast("Transaction hash copied");
  };
  return (
    <Sheet
      visible={visible && !!e}
      title="Transaction"
      onClose={onClose}
      footer={
        e ? (
          <Button
            title={e.txUrl ? "View transaction on chain" : "Being recorded on chain"}
            icon={e.txUrl ? "open-outline" : "time-outline"}
            variant="dark"
            disabled={!e.txUrl}
            onPress={() => e.txUrl && Linking.openURL(e.txUrl)}
          />
        ) : null
      }
    >
      {e && k ? (
        <>
          <View style={{ alignItems: "center", gap: space.sm }}>
            <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={k.icon} size={26} color={k.tone} />
            </View>
            <Text style={{ fontFamily: fonts.displayHeavy, fontSize: 30, letterSpacing: -0.5, color: k.tone }}>
              {e.amount > 0 ? "+" : "−"}
              {formatTokens(Math.abs(e.amount))} <Text style={{ fontSize: 20 }}>${e.ticker}</Text>
            </Text>
            <Txt variant="label" style={{ textAlign: "center" }}>{k.title(e)}</Txt>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: e.txUrl ? colors.successSoft : colors.surfaceAlt }}>
              <Ionicons name={e.txUrl ? "checkmark-circle" : "time-outline"} size={14} color={e.txUrl ? colors.success : colors.ink2} />
              <Txt variant="caption" color={e.txUrl ? colors.success : colors.ink2} style={{ fontFamily: fonts.semibold }}>
                {e.txUrl ? "Recorded on the blockchain" : "Being recorded, usually within minutes"}
              </Txt>
            </View>
          </View>
          <View style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: space.md, paddingVertical: space.xs }}>
            <Row label="What" value={k.what} />
            <Divider />
            <Row label="Token" value={`$${e.ticker}${e.store ? ` · ${e.ticker === "SOTECHY" ? "Sotechy" : e.store}` : ""}`} />
            {e.order ? (
              <>
                <Divider />
                <Row label="Order" value={e.order} />
              </>
            ) : null}
            {e.kind === "sent" || e.kind === "received" ? (
              <>
                <Divider />
                <Row label={e.kind === "sent" ? "To" : "From"} value={e.who ? `@${e.who}` : "A Sotechy user"} />
              </>
            ) : null}
            <Divider />
            <Row label="When" value={when(e.at)} />
            {hash ? (
              <>
                <Divider />
                <Row label="Transaction" value={`${hash.slice(0, 10)}…${hash.slice(-8)}`} onPress={copyHash} />
              </>
            ) : null}
          </View>
        </>
      ) : null}
    </Sheet>
  );
}

/** Activity rows inside a card; `empty` shows when there's none */
export function ActivityRows({ items, empty = "Tokens you earn and send show here." }: { items: WalletActivity[]; empty?: string }) {
  // The item stays set while the sheet slides away, so it doesn't empty mid-close
  const [open, setOpen] = useState<WalletActivity | null>(null);
  const [showing, setShowing] = useState(false);
  if (!items.length) return <Txt variant="small" style={{ paddingVertical: space.md }}>{empty}</Txt>;
  return (
    <>
      {items.map((e, i) => {
        const k = EVENT[e.kind];
        return (
          <View key={e.id}>
            {i > 0 && <Divider />}
            <Pressable onPress={() => {
                setOpen(e);
                setShowing(true);
              }} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md, opacity: pressed ? 0.6 : 1 })}>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={k.icon} size={17} color={k.tone} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="medium" numberOfLines={1} style={{ fontSize: 14 }}>{k.title(e)}</Txt>
                <Txt variant="caption">
                  {ago(e.at)}
                  {e.txUrl ? " · on chain" : " · being recorded"}
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
      <ActivitySheet item={open} visible={showing} onClose={() => setShowing(false)} />
    </>
  );
}
