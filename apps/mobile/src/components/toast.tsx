import Ionicons from "@expo/vector-icons/Ionicons";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Keyboard, Platform, Pressable, Text, View } from "react-native";
import { FullWindowOverlay } from "react-native-screens";
import { colors, fonts, radius } from "@/lib/theme";
import type { IconName } from "./ui";

interface ToastOptions {
  icon?: IconName;
  action?: { label: string; onPress: () => void };
}

const ToastContext = createContext<(message: string, options?: ToastOptions) => void>(() => {});

/** Small dark toast that slides up above the tab bar. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string } & ToastOptions>({ message: "" });
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // With the keyboard open, the toast shows just above it instead of hidden behind it
  const [keyboard, setKeyboard] = useState(0);
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const shown = Keyboard.addListener(showEvent, (e) => setKeyboard(e.endCoordinates.height));
    const hidden = Keyboard.addListener(hideEvent, () => setKeyboard(0));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  const show = useCallback(
    (message: string, options: ToastOptions = {}) => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ message, ...options });
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start();
      timer.current = setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true }).start();
      }, 2200);
    },
    [anim],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      <Overlay>
        <Animated.View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: keyboard ? keyboard + 12 : 128,
            alignItems: "center",
            opacity: anim,
            transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
          }}
        >
          {toast.message ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.panel, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", borderRadius: radius.pill, paddingVertical: 12, paddingHorizontal: 18 }}>
              <Ionicons name={toast.icon ?? "checkmark-circle"} size={18} color={colors.brandYellow} />
              <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.white }}>{toast.message}</Text>
              {toast.action ? (
                <Pressable onPress={toast.action.onPress} hitSlop={8}>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.brand }}>{toast.action.label}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </Animated.View>
      </Overlay>
    </ToastContext.Provider>
  );
}

/** On iOS native screens sit above plain views, so the toast goes in a window-level overlay. */
function Overlay({ children }: { children: ReactNode }) {
  return Platform.OS === "ios" ? <FullWindowOverlay>{children}</FullWindowOverlay> : <>{children}</>;
}

export const useToast = () => useContext(ToastContext);
