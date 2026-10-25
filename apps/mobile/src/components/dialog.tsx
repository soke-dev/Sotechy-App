// Custom in-app dialogs (no system alerts): illustrated card with our buttons.
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, Modal, Platform, Pressable, View } from "react-native";
import { colors, radius, space } from "@/lib/theme";
import { Illo, type IlloName } from "./illustrations";
import { Burst } from "./tab-icons";
import { Button, tap, Txt } from "./ui";

interface DialogOptions {
  title: string;
  message?: string;
  illo?: IlloName;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" makes the confirm button red, for destructive actions */
  tone?: "default" | "danger";
}

interface DialogApi {
  /** Resolves true when confirmed, false when cancelled or dismissed. */
  confirm: (o: DialogOptions) => Promise<boolean>;
  /** Information only: one button. */
  alert: (o: Omit<DialogOptions, "cancelLabel" | "tone">) => Promise<void>;
}

const DialogContext = createContext<DialogApi>({ confirm: async () => false, alert: async () => {} });
export const useDialog = () => useContext(DialogContext);

const useNative = Platform.OS !== "web";

export function DialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(DialogOptions & { kind: "confirm" | "alert" }) | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const anim = useRef(new Animated.Value(0)).current;

  const open = useCallback(
    (o: DialogOptions, kind: "confirm" | "alert") =>
      new Promise<boolean>((resolve) => {
        resolver.current = resolve;
        setState({ ...o, kind });
        anim.setValue(0);
        Animated.timing(anim, { toValue: 1, duration: 220, easing: Easing.out(Easing.back(1.4)), useNativeDriver: useNative }).start();
      }),
    [anim],
  );

  const close = (value: boolean) => {
    tap();
    Animated.timing(anim, { toValue: 0, duration: 140, useNativeDriver: useNative }).start(() => {
      setState(null);
      resolver.current?.(value);
      resolver.current = null;
    });
  };

  const api: DialogApi = {
    confirm: (o) => open(o, "confirm"),
    alert: async (o) => {
      await open(o, "alert");
    },
  };

  return (
    <DialogContext.Provider value={api}>
      {children}
      <Modal visible={!!state} transparent animationType="none" onRequestClose={() => close(false)} statusBarTranslucent>
        {state && (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: space.xl }}>
            <Animated.View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.overlay, opacity: anim }}>
              <Pressable style={{ flex: 1 }} onPress={() => close(false)} accessibilityLabel="Close" />
            </Animated.View>
            <Animated.View
              style={{
                width: "100%",
                maxWidth: 360,
                backgroundColor: colors.surface,
                borderRadius: radius.xl,
                borderWidth: 1,
                borderColor: colors.line,
                padding: space.xl,
                alignItems: "center",
                gap: space.md,
                opacity: anim,
                transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
              }}
            >
              <View style={{ width: 104, height: 104, alignItems: "center", justifyContent: "center" }}>
                <View style={{ position: "absolute" }}>
                  <Burst size={104} color={state.tone === "danger" ? colors.dangerSoft : colors.brandSoft} />
                </View>
                <Illo name={state.illo ?? (state.tone === "danger" ? "logout" : "chat")} size={58} />
              </View>
              <Txt variant="heading" style={{ textAlign: "center" }}>{state.title}</Txt>
              {state.message ? <Txt variant="small" style={{ textAlign: "center", fontSize: 14 }}>{state.message}</Txt> : null}
              <View style={{ flexDirection: "row", gap: space.sm, alignSelf: "stretch", marginTop: space.sm }}>
                {state.kind === "confirm" && <Button title={state.cancelLabel ?? "Cancel"} variant="outline" onPress={() => close(false)} style={{ flex: 1 }} />}
                <Button
                  title={state.confirmLabel ?? (state.kind === "alert" ? "OK" : "Confirm")}
                  variant={state.tone === "danger" ? "primary" : "dark"}
                  onPress={() => close(true)}
                  style={[{ flex: 1 }, state.tone === "danger" ? { backgroundColor: colors.danger } : null]}
                />
              </View>
            </Animated.View>
          </View>
        )}
      </Modal>
    </DialogContext.Provider>
  );
}
