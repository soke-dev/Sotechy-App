// Money Moves checkout: opens the provider's payment window, where the customer sends stablecoin or a
// bank transfer, and closes it by itself once the order is paid.
import Ionicons from "@expo/vector-icons/Ionicons";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useState, type ReactNode } from "react";
import { ActivityIndicator, Linking, Modal, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatNaira } from "@sotechy/shared";
import { api } from "@/lib/api";
import { useStoreConfig } from "@/lib/store-config";
import { colors, space } from "@/lib/theme";
import { Illo, type IlloName } from "./illustrations";
import { IntentsPayWindow } from "./intents-pay";
import { Sheet } from "./shop-filters";
import { Button, tap, Txt, ui } from "./ui";

/** stablecoin and bank go through the providers admin picks; intents is any coin through NEAR Intents */
export type PayMethod = "stablecoin" | "bank" | "intents";

// Stablecoin goes through Money Moves; bank transfer through Money Moves or Bachs, as admin chooses
const PAY_CHOICES: { id: PayMethod; illo: IlloName; title: string; subtitle: string }[] = [
  { id: "stablecoin", illo: "coin", title: "Pay with stablecoin", subtitle: "Pay with USDT or USDC" },
  { id: "bank", illo: "bank", title: "Pay with bank transfer", subtitle: "Send the exact amount from any Nigerian bank app" },
  { id: "intents", illo: "wallet", title: "Pay with crypto", subtitle: "USDT or USDC on 15 networks, or SOL, BTC, ETH, BNB, MON and more · NEAR Intents" },
];

/** Bottom sheet of ways to pay; picking one calls `onPay` with it. `extra` sits above the choices (e.g. paying with tokens). */
export function PayChoiceSheet({ visible, amount, onClose, onPay, extra }: { visible: boolean; amount: number; onClose: () => void; onPay: (method: PayMethod) => void; extra?: ReactNode }) {
  // Each way to pay shows only while admin has it switched on (stablecoin until the settings load)
  const config = useStoreConfig().config;
  const choices = PAY_CHOICES.filter((c) => (c.id === "bank" ? !!config?.bankTransfer : c.id === "intents" ? !!config?.intents : config?.stablecoin !== false));
  return (
    <Sheet visible={visible} title={`Pay ${formatNaira(amount)}`} onClose={onClose}>
      {extra}
      <View style={{ gap: space.md }}>
        {choices.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => {
              tap();
              onClose();
              onPay(c.id);
            }}
            style={[ui.card, { flexDirection: "row", alignItems: "center", gap: space.md }]}
          >
            <Illo name={c.illo} size={38} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="label">{c.title}</Txt>
              <Txt variant="small">{c.subtitle}</Txt>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.ink2} />
          </Pressable>
        ))}
        {choices.length === 0 && <Txt variant="small">Paying in the app is paused right now. Please contact us to pay another way.</Txt>}
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

// The in-app browser exists on phones only; loading it on the web fails
const WebView: typeof import("react-native-webview").WebView | null = Platform.OS === "web" ? null : require("react-native-webview").WebView;

/** Android: Money Moves in a window inside the app, so it can close by itself once the payment lands */
function PayWindow({ url, onDone }: { url: string; onDone: (returned: boolean) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible animationType="slide" onRequestClose={() => onDone(false)} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.sm }}>
          <Ionicons name="lock-closed" size={15} color={colors.success} />
          <Txt variant="label" style={{ flex: 1 }}>Secure payment</Txt>
          <Pressable onPress={() => onDone(false)} hitSlop={10} accessibilityLabel="Close payment" style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="close" size={18} color={colors.ink} />
          </Pressable>
        </View>
        {WebView && <WebView
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
        />}
        <View style={{ height: insets.bottom, backgroundColor: colors.bg }} />
      </View>
    </Modal>
  );
}

/** Web: Money Moves can't sit inside the page, so it opens in a new tab while this card waits.
 *  The tab closes by itself once the order is paid. */
function WebPayWindow({ url, popup, onOpen, onCheck, onDone }: { url: string; popup: boolean; onOpen: () => void; onCheck: () => Promise<boolean>; onDone: (returned: boolean) => void }) {
  const [checking, setChecking] = useState(false);
  const [notYet, setNotYet] = useState(false);
  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => onDone(false)}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: space.xl, backgroundColor: "rgba(23,18,14,0.5)" }}>
        <View style={{ width: 440, maxWidth: "100%", backgroundColor: colors.bg, borderRadius: 28, padding: space.xl, gap: space.md, alignItems: "center" }}>
          <Illo name="card" size={56} />
          <Txt variant="heading" style={{ textAlign: "center" }}>{popup ? "Finish paying in the new tab" : "Open the payment page"}</Txt>
          <Txt variant="small" style={{ textAlign: "center" }}>
            {popup
              ? "Your payment page opened in a new tab. Pay there, then come back: this closes by itself once your payment is confirmed."
              : "Your browser stopped the payment page from opening. Tap below to open it in a new tab."}
          </Txt>
          {popup && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ActivityIndicator color={colors.brand} />
              <Txt variant="caption">Waiting for your payment…</Txt>
            </View>
          )}
          <View style={{ alignSelf: "stretch", gap: space.sm, marginTop: space.sm }}>
            <Button title={popup ? "Open the payment page again" : "Open payment page"} icon="open-outline" variant={popup ? "outline" : "dark"} onPress={onOpen} />
            {popup && (
              <Button
                title="I've paid"
                icon="checkmark-circle-outline"
                variant="dark"
                loading={checking}
                onPress={async () => {
                  setChecking(true);
                  const paid = await onCheck();
                  setChecking(false);
                  setNotYet(!paid);
                }}
              />
            )}
            {notYet && <Txt variant="caption" color={colors.warning} style={{ textAlign: "center" }}>Not confirmed yet. Transfers can take a few minutes; this keeps checking.</Txt>}
            <Button title="Pay later" variant="ghost" onPress={() => onDone(false)} />
          </View>
          <Txt variant="caption" style={{ textAlign: "center" }}>{url.replace(/^https?:\/\//, "").split("/")[0]}</Txt>
        </View>
      </View>
    </Modal>
  );
}

/**
 * `pay(order, method)` opens Money Moves for an unpaid order. While it's open the app keeps checking the order, and
 * closes the payment window by itself once it's paid (no "Return to Sotechy" tap needed). Resolves true when paid.
 */
export function useMoneyMoves() {
  const [win, setWin] = useState<{ url: string; finish: (returned: boolean) => void; web?: { popup: boolean; open: () => void; check: () => Promise<boolean> } } | null>(null);
  const [intents, setIntents] = useState<{ order: Pending["order"]; finish: (paid: boolean) => void } | null>(null);

  const pay = useCallback(async (order: Pending["order"], method: PayMethod = "stablecoin") => {
    // Any coin through NEAR Intents: our own window, no provider page
    if (method === "intents") {
      return new Promise<boolean>((resolve) => {
        setIntents({
          order,
          finish: async (paid) => {
            setIntents(null);
            resolve(paid || (await isPaid(order.id)));
          },
        });
      });
    }
    const { checkoutUrl } = await api.startOnlinePayment(order.id, method);
    let paid = false;
    let open = true;

    if (Platform.OS === "web") {
      // A new tab; the card waits and checks, and closes the tab once the order is paid
      let tab: Window | null = null;
      const openTab = () => {
        tab = window.open(checkoutUrl, "_blank");
        return !!tab;
      };
      const opened = openTab();
      return new Promise<boolean>((resolve) => {
        let settled = false;
        const finish = async () => {
          if (settled) return;
          settled = true;
          open = false;
          try {
            tab?.close();
          } catch {}
          setWin(null);
          resolve(paid || (await isPaid(order.id)));
        };
        const check = async () => {
          if (await isPaid(order.id)) {
            paid = true;
            void finish();
            return true;
          }
          return false;
        };
        const reopen = () => {
          openTab();
          setWin((w) => (w?.web ? { ...w, web: { ...w.web, popup: true } } : w));
        };
        setWin({ url: checkoutUrl, finish: () => void finish(), web: { popup: opened, open: reopen, check } });
        void (async () => {
          while (open) {
            await new Promise((r) => setTimeout(r, CHECK_EVERY_MS));
            if (open && (await check())) return;
          }
        })();
      });
    }

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

  return {
    pay,
    sheet: intents ? (
      <IntentsPayWindow order={intents.order} onDone={intents.finish} />
    ) : !win ? null : win.web ? (
      <WebPayWindow url={win.url} popup={win.web.popup} onOpen={win.web.open} onCheck={win.web.check} onDone={win.finish} />
    ) : (
      <PayWindow url={win.url} onDone={win.finish} />
    ),
  };
}
