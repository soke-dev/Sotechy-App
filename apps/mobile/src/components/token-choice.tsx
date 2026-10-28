// Paying with tokens in the payment sheet: the store's token and $SOTECHY side by side, each with its amount.
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, View } from "react-native";
import { formatNaira, nairaToTokens, TOKEN_RULES, tokensToNaira, type WalletBalance } from "@sotechy/shared";
import { colors, radius, space } from "@/lib/theme";
import { tap, Txt } from "./ui";

export interface TokenPlanRow {
  ticker: string;
  balance: number;
  /** Tokens it pays with (0 when off) and what they cover */
  amount: number;
  value: number;
  /** The most it could cover here */
  most: number;
}

/** How tokens split an order: each switched-on token covers what it can, leaving at least ₦100 in money */
export function planTokens(balances: Pick<WalletBalance, "ticker" | "amount">[], total: number, on: Record<string, boolean>): TokenPlanRow[] {
  let room = Math.max(0, total - TOKEN_RULES.minCashPerOrder);
  return balances.map((b) => {
    const amount = on[b.ticker] ? Math.min(b.amount, nairaToTokens(room)) : 0;
    const value = tokensToNaira(amount);
    room -= value;
    return { ticker: b.ticker, balance: b.amount, amount, value, most: Math.min(b.amount, nairaToTokens(Math.max(0, total - TOKEN_RULES.minCashPerOrder))) };
  });
}

export function TokenChoice({ plan, on, onToggle }: { plan: TokenPlanRow[]; on: Record<string, boolean>; onToggle: (ticker: string) => void }) {
  if (!plan.length) return null;
  return (
    <View style={{ flexDirection: "row", gap: space.sm, marginBottom: space.lg }}>
      {plan.map((t) => {
        const active = !!on[t.ticker];
        return (
          <Pressable
            key={t.ticker}
            onPress={() => {
              tap();
              onToggle(t.ticker);
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: active }}
            accessibilityLabel={`Use $${t.ticker}`}
            style={{ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, paddingHorizontal: space.sm, borderRadius: radius.lg, borderWidth: active ? 1.5 : 1, borderColor: active ? colors.brand : colors.line, backgroundColor: active ? colors.brandSoft : colors.surface }}
          >
            <Ionicons name={active ? "checkmark-circle" : "ellipse-outline"} size={20} color={active ? colors.brand : colors.faint} />
            <Txt variant="label" numberOfLines={1} style={{ flex: 1, fontSize: 14 }}>${t.ticker}</Txt>
            <Txt variant="label" numberOfLines={1} color={active ? colors.success : colors.muted} style={{ fontSize: 13 }}>
              {active ? `−${formatNaira(t.value)}` : formatNaira(tokensToNaira(t.most))}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}
