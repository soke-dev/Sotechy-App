// Money Moves checkout: opens the provider's payment window, where the customer sends stablecoin.
import Ionicons from "@expo/vector-icons/Ionicons";
import * as WebBrowser from "expo-web-browser";
import { useCallback } from "react";
import { Pressable, View } from "react-native";
import { formatNaira } from "@sotechy/shared";
import { api } from "@/lib/api";
import { colors, space } from "@/lib/theme";
import { Illo, type IlloName } from "./illustrations";
import { Sheet } from "./shop-filters";
import { Pill, tap, Txt, ui } from "./ui";

// Stablecoin goes through Money Moves; bank transfer comes later
const PAY_CHOICES: { id: string; illo: IlloName; title: string; subtitle: string; live: boolean }[] = [
  { id: "stablecoin", illo: "coin", title: "Pay with stablecoin", subtitle: "Pay with USDT or USDC through Money Moves", live: true },
  { id: "bank", illo: "bank", title: "Bank transfer", subtitle: "Pay from any Nigerian bank", live: false },
];

/** Bottom sheet of ways to pay; picking a live one calls `onPay`. */
export function PayChoiceSheet({ visible, amount, onClose, onPay }: { visible: boolean; amount: number; onClose: () => void; onPay: () => void }) {
  return (
    <Sheet visible={visible} title={`Pay ${formatNaira(amount)}`} onClose={onClose}>
      <View style={{ gap: space.md }}>
        {PAY_CHOICES.map((c) => (
          <Pressable
            key={c.id}
            disabled={!c.live}
            onPress={() => {
              tap();
              onClose();
              onPay();
            }}
            style={[ui.card, { flexDirection: "row", alignItems: "center", gap: space.md, opacity: c.live ? 1 : 0.55 }]}
          >
            <Illo name={c.illo} size={38} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="label">{c.title}</Txt>
              <Txt variant="small">{c.subtitle}</Txt>
            </View>
            {c.live ? <Ionicons name="chevron-forward" size={18} color={colors.ink2} /> : <Pill label="Coming soon" />}
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}

interface Pending {
  order: { id: string; orderNumber: string; total: number };
}

/** Money Moves sends customers to the API's /payments/return page, which opens this app scheme (app.json "scheme"). */
const RETURN_SCHEME = "sotechy://";

/**
 * `pay(order)` opens Money Moves for an unpaid order. The order turns paid when Money Moves'
 * webhook arrives, so this resolves false and the order screen keeps checking.
 */
export function useMoneyMoves() {
  const pay = useCallback(async (order: Pending["order"]) => {
    const { checkoutUrl } = await api.startOnlinePayment(order.id);
    // An auth session closes by itself when the page hands back to sotechy://.
    // Ephemeral skips iOS's "wants to use … to sign in" prompt (no cookies are shared, none are needed).
    await WebBrowser.openAuthSessionAsync(checkoutUrl, RETURN_SCHEME, { preferEphemeralSession: true });
    return false;
  }, []);

  return { pay, sheet: null };
}
