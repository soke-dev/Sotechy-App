// The wallet's token activity rows: earned, spent, sent and the rest, each linking to its Monad record.
import Ionicons from "@expo/vector-icons/Ionicons";
import { Linking, Pressable, View } from "react-native";
import type { WalletActivity } from "@sotechy/shared";
import { formatTokens } from "@/lib/marketplace";
import { colors, space } from "@/lib/theme";
import { Divider, Txt, type IconName } from "./ui";

const EVENT: Record<WalletActivity["kind"], { icon: IconName; tone: string; title: (e: WalletActivity) => string }> = {
  earned: { icon: "arrow-down", tone: colors.success, title: (e) => `Earned at ${e.store}${e.order ? ` · ${e.order}` : ""}` },
  bonus: { icon: "star", tone: colors.brandPressed, title: (e) => `$SOTECHY bonus${e.order ? ` · ${e.order}` : ""}` },
  received: { icon: "arrow-down", tone: colors.success, title: (e) => `From @${e.who ?? "someone"}` },
  review: { icon: "chatbubble-ellipses-outline", tone: colors.brandPressed, title: (e) => `Review bonus${e.order ? ` · ${e.order}` : ""}` },
  walk_in: { icon: "storefront-outline", tone: colors.success, title: (e) => `Bought in store at ${e.store}` },
  spent: { icon: "bag-handle-outline", tone: colors.ink2, title: (e) => `Paid at ${e.store}${e.order ? ` · ${e.order}` : ""}` },
  returned: { icon: "return-up-back-outline", tone: colors.success, title: (e) => `Given back${e.order ? ` · ${e.order} cancelled` : ""}` },
  sent: { icon: "arrow-up", tone: colors.ink2, title: (e) => `To @${e.who ?? "someone"}` },
  refunded: { icon: "return-up-back-outline", tone: colors.ink2, title: (e) => `Refunded order${e.order ? ` · ${e.order}` : ""}` },
};

const ago = (iso: string) => {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  return mins < 1 ? "just now" : mins < 60 ? `${mins} min ago` : mins < 60 * 24 ? `${Math.round(mins / 60)}h ago` : `${Math.round(mins / 60 / 24)}d ago`;
};

/** Activity rows inside a card; `empty` shows when there's none */
export function ActivityRows({ items, empty = "Tokens you earn and send show here." }: { items: WalletActivity[]; empty?: string }) {
  if (!items.length) return <Txt variant="small" style={{ paddingVertical: space.md }}>{empty}</Txt>;
  return (
    <>
      {items.map((e, i) => {
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
    </>
  );
}
