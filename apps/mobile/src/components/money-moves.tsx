// Money Moves checkout: opens the provider's payment window, where the customer sends stablecoin or a
// bank transfer, and closes it by itself once the order is paid.
import Ionicons from "@expo/vector-icons/Ionicons";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useState, type ReactNode } from "react";
import { ActivityIndicator, Linking, Modal, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { formatNaira } from "@sotechy/shared";
import { api } from "@/lib/api";
import { useStoreConfig } from "@/lib/store-config";
import { colors, space } from "@/lib/theme";
import { Illo, type IlloName } from "./illustrations";
import { Sheet } from "./shop-filters";
import { Pill, tap, Txt, ui } from "./ui";

export type PayMethod = "stablecoin" | "bank";

// Both go through Money Moves: stablecoin on its checkout, bank transfer straight to our account (direct checkout)
const PAY_CHOICES: { id: PayMethod; illo: IlloName; title: string; subtitle: string }[] = [
  { id: "stablecoin", illo: "coin", title: "Pay with stablecoin", subtitle: "Pay with USDT or USDC through Money Moves" },
  { id: "bank", illo: "bank", title: "Pay with bank transfer", subtitle: "Send the exact amount from any Nigerian bank app" },
];

/** Bottom sheet of ways to pay; picking a live one calls `onPay` with it. `extra` sits above the choices (e.g. paying with tokens). */
export function PayChoiceSheet({ visible, amount, onClose, onPay, extra }: { visible: boolean; amount: number; onClose: () => void; onPay: (method: PayMethod) => void; extra?: ReactNode }) {
  // Bank transfer shows as coming soon until the API has its Money Moves direct key
  const bankOn = !!useStoreConfig().config?.bankTransfer;
  return (
    <Sheet visible={visible} title={`Pay ${formatNaira(amount)}`} onClose={onClose}>
      {extra}
      <View style={{ gap: space.md }}>
        {PAY_CHOICES.map((c) => {
          const live = c.id !== "bank" || bankOn;
          return (
            <Pressable
              key={c.id}
              disabled={!live}
              onPress={() => {
                tap();
                onClose();
                onPay(c.id);
              }}
              style={[ui.card, { flexDirection: "row", alignItems: "center", gap: space.md, opacity: live ? 1 : 0.55 }]}
            >
              <Illo name={c.illo} size={38} />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt variant="label">{c.title}</Txt>
                <Txt variant="small">{c.subtitle}</Txt>
              </View>
              {live ? <Ionicons name="chevron-forward" size={18} color={colors.ink2} /> : <Pill label="Coming soon" />}
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

interface Pending {
  order: { id: string; orderNumber: string; total: number };
}

/** Money Moves sends customers to the API's /payments/return page, which opens this app scheme (app.json "scheme"). */
const RETURN_SCHEME = "sotechy://";
/** How often the open payment window checks whether the order is paid */
const CHECK_EVERY_MS = 3000;

/** Paid, or further along: anything but waiting, failed or cancelled */
export async function isPaid(orderId: string) {
  try {
    // Asks Money Moves itself, so the order turns paid as soon as the payment is matched (not only on the webhook)
    const { status } = await api.checkOnlinePayment(orderId).catch(() => api.order(orderId));
    return !["pending_payment", "payment_failed", "cancelled", "refunded"].includes(status);
  } catch {
    return false;
  }
}

/** Android: Money Moves in a window inside the app, so it can close by itself once the payment lands */
function PayWindow({ url, onDone }: { url: string; onDone: (returned: boolean) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible animationType="slide" onRequestClose={() => onDone(false)} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.sm }}>
          <Ionicons name="lock-closed" size={15} color={colors.success} />
          <Txt variant="label" style={{ flex: 1 }}>Secure payment · Money Moves</Txt>
          <Pressable onPress={() => onDone(false)} hitSlop={10} accessibilityLabel="Close payment" style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="close" size={18} color={colors.ink} />
          </Pressable>
        </View>
        <WebView
          source={{ uri: url }}
          style={{ flex: 1 }}
          startInLoadingState
          renderLoading={() => (
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator color={colors.brand} />
            </View>
          )}
          onShouldStartLoadWithRequest={(req) => {
            // Back from Money Moves: close straight away
            if (req.url.startsWith(RETURN_SCHEME) || req.url.includes("/payments/return")) {
              onDone(true);
              return false;
            }
            // Wallet apps and other links that aren't web pages open outside
            if (!/^https?:/i.test(req.url)) {
              Linking.openURL(req.url).catch(() => {});
              return false;
            }
            return true;
          }}
        />
        <View style={{ height: insets.bottom, backgroundColor: colors.bg }} />
      </View>
    </Modal>
  );
}

/**
 * `pay(order, method)` opens Money Moves for an unpaid order. While it's open the app keeps checking the order, and
 * closes the payment window by itself once it's paid (no "Return to Sotechy" tap needed). Resolves true when paid.
 */
export function useMoneyMoves() {
  const [win, setWin] = useState<{ url: string; finish: (returned: boolean) => void } | null>(null);

  const pay = useCallback(async (order: Pending["order"], method: PayMethod = "stablecoin") => {
    const { checkoutUrl } = await api.startOnlinePayment(order.id, method);
    let paid = false;
    let open = true;

    if (Platform.OS === "ios") {
      // Checks while the payment sheet is up, and closes it the moment the order is paid
      const watch = (async () => {
        while (open) {
          await new Promise((r) => setTimeout(r, CHECK_EVERY_MS));
          if (open && (await isPaid(order.id))) {
            paid = true;
            try {
              WebBrowser.dismissAuthSession();
            } catch {}
            return;
          }
        }
      })();
      // An auth session also closes by itself when the page hands back to sotechy://.
      // Ephemeral skips iOS's "wants to use … to sign in" prompt (no cookies are shared, none are needed).
      await WebBrowser.openAuthSessionAsync(checkoutUrl, RETURN_SCHEME, { preferEphemeralSession: true });
      open = false;
      await watch.catch(() => {});
      return paid || (await isPaid(order.id));
    }

    // Android (a browser tab can't be closed by the app there): the in-app payment window
    return new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = async () => {
        if (settled) return;
        settled = true;
        open = false;
        setWin(null);
        resolve(paid || (await isPaid(order.id)));
      };
      setWin({ url: checkoutUrl, finish: () => void finish() });
      void (async () => {
        while (open) {
          await new Promise((r) => setTimeout(r, CHECK_EVERY_MS));
          if (open && (await isPaid(order.id))) {
            paid = true;
            return finish();
          }
        }
      })();
    });
  }, []);

  return { pay, sheet: win ? <PayWindow url={win.url} onDone={win.finish} /> : null };
}
