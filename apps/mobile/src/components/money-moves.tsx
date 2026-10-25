// Money Moves checkout: opens the provider's payment window, where the customer pays by bank
// transfer, crypto or the Money Moves app. Demo mode has no provider page, so a stand-in opens.
import Ionicons from "@expo/vector-icons/Ionicons";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatNaira } from "@sotechy/shared";
import { api } from "@/lib/api";
import { completeDemoPayment, DEMO_CHECKOUT_URL } from "@/lib/mock-api";
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
  resolve: (paid: boolean) => void;
}

/** Money Moves sends customers to the API's /payments/return page, which opens this app scheme (app.json "scheme"). */
const RETURN_SCHEME = "sotechy://";

/**
 * `pay(order)` opens Money Moves for an unpaid order. It resolves true when the payment was
 * completed in the app (demo); with the real provider the order turns paid when its webhook arrives.
 */
export function useMoneyMoves() {
  const [pending, setPending] = useState<Pending | null>(null);

  const pay = useCallback(async (order: Pending["order"]) => {
    const { checkoutUrl } = await api.startOnlinePayment(order.id);
    if (checkoutUrl.startsWith(DEMO_CHECKOUT_URL)) {
      return new Promise<boolean>((resolve) => setPending({ order, resolve }));
    }
    // An auth session closes by itself when the page hands back to sotechy://
    await WebBrowser.openAuthSessionAsync(checkoutUrl, RETURN_SCHEME);
    return false;
  }, []);

  const finish = (paid: boolean) => {
    pending?.resolve(paid);
    setPending(null);
  };

  const sheet = <DemoCheckout pending={pending} onDone={finish} />;
  return { pay, sheet };
}

/** Stand-in for the Money Moves window in demo mode. No money is taken. */
function DemoCheckout({ pending, onDone }: { pending: Pending | null; onDone: (paid: boolean) => void }) {
  const insets = useSafeAreaInsets();
  const [choice, setChoice] = useState(PAY_OPTIONS[0].key);
  const [paying, setPaying] = useState(false);

  async function confirm() {
    if (!pending) return;
    setPaying(true);
    try {
      await completeDemoPayment(pending.order.id, PAY_OPTIONS.find((o) => o.key === choice)?.label ?? "demo");
      onDone(true);
    } finally {
      setPaying(false);
    }
  }

  return (
    <Modal visible={!!pending} transparent animationType="slide" onRequestClose={() => onDone(false)}>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.overlay }} onPress={() => onDone(false)} accessibilityLabel="Close" />
        {pending && (
          <View style={{ backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: gutter, paddingBottom: insets.bottom + space.lg, gap: space.lg }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
              <Illo name="wallet" size={30} />
              <Txt variant="heading" style={{ flex: 1 }}>Money Moves</Txt>
              <Pill label="Demo" tone="warning" />
              <Pressable onPress={() => onDone(false)} hitSlop={10} accessibilityLabel="Close" style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="close" size={18} color={colors.ink} />
              </Pressable>
            </View>

            <View style={{ backgroundColor: colors.panel, borderRadius: radius.lg, padding: space.lg, gap: 2 }}>
              <Txt variant="caption" color="#C9C0B6">Paying Sotechy Shop · {pending.order.orderNumber}</Txt>
              <Txt variant="title" color={colors.white}>{formatNaira(pending.order.total)}</Txt>
            </View>

            <View style={{ gap: space.sm }}>
              <Txt variant="label">How would you like to pay?</Txt>
              {PAY_OPTIONS.map((o) => (
                <OptionRow key={o.key} illo={o.illo} title={o.label} subtitle={o.subtitle} selected={choice === o.key} onPress={() => setChoice(o.key)} />
              ))}
            </View>

            <Button title={`Pay ${formatNaira(pending.order.total)}`} icon="lock-closed" variant="dark" loading={paying} onPress={confirm} />
            <Txt variant="caption" style={{ textAlign: "center" }}>Demo only: no money is taken. The real Money Moves window opens here once it&apos;s connected.</Txt>
          </View>
        )}
      </View>
    </Modal>
  );
}
