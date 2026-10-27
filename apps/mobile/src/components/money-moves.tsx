// Money Moves checkout: opens the provider's payment window, where the customer pays by bank
// transfer, crypto or the Money Moves app.
import Ionicons from "@expo/vector-icons/Ionicons";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatNaira } from "@sotechy/shared";
import { api } from "@/lib/api";
import { colors, gutter, radius, space } from "@/lib/theme";
import { Illo, type IlloName } from "./illustrations";
import { Button, OptionRow, Pill, Txt } from "./ui";

export const PAY_OPTIONS: { key: string; label: string; subtitle: string; illo: IlloName }[] = [
  { key: "bank", label: "Bank transfer", subtitle: "Transfer from any Nigerian bank", illo: "bank" },
  { key: "crypto", label: "Crypto", subtitle: "$MOVE and other supported coins", illo: "coin" },
  { key: "app", label: "Money Moves app", subtitle: "Approve the payment in the app", illo: "wallet" },
];

/** "Bank transfer · Crypto · Money Moves app" line shown under payment buttons. */
export function PayOptionsLine() {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: space.md }}>
      {PAY_OPTIONS.map((o) => (
        <View key={o.key} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Illo name={o.illo} size={16} />
          <Txt variant="caption">{o.label}</Txt>
        </View>
      ))}
    </View>
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
    // An auth session closes by itself when the page hands back to sotechy://
    await WebBrowser.openAuthSessionAsync(checkoutUrl, RETURN_SCHEME);
    return false;
  }, []);

  return { pay, sheet: null };
}
