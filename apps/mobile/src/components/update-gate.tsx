// A new version of the app (an over-the-air update): it downloads quietly, then this sheet asks to restart.
// The sheet can't be closed, swiped away or tapped past, so the app is used on the new version only.
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Updates from "expo-updates";
import { useEffect, useState } from "react";
import { ActivityIndicator, AppState, Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, radius, space } from "@/lib/theme";
import { useThemeMode } from "@/lib/theme-mode";
import { Txt } from "./ui";

/** Looks for a new update when the app opens and each time it comes back to the front, and downloads it */
function useUpdateCheck() {
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    let busy = false;
    const check = async () => {
      if (busy) return;
      busy = true;
      try {
        const found = await Updates.checkForUpdateAsync();
        if (found.isAvailable) await Updates.fetchUpdateAsync();
      } catch {
        // Offline, or the app is already fetching it: the next check tries again
      } finally {
        busy = false;
      }
    };
    void check();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void check();
    });
    return () => sub.remove();
  }, []);
}

/** `held` keeps the sheet back while the opening animation plays */
export function UpdateGate({ held }: { held?: boolean }) {
  useUpdateCheck();
  const { isUpdatePending } = Updates.useUpdates();
  const { resolved } = useThemeMode();
  const insets = useSafeAreaInsets();
  const [restarting, setRestarting] = useState(false);
  const dark = resolved === "dark";

  async function restart() {
    setRestarting(true);
    try {
      await Updates.reloadAsync();
    } catch {
      setRestarting(false);
    }
  }

  return (
    // Android's back button does nothing here: the only way on is to restart
    <Modal visible={isUpdatePending && !held} transparent animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: dark ? "rgba(0,0,0,0.62)" : "rgba(23,18,14,0.58)" }}>
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderTopWidth: dark ? 1 : 0,
            borderColor: colors.line,
            paddingTop: 28,
            paddingHorizontal: 24,
            paddingBottom: Math.max(insets.bottom, space.lg) + 10,
            alignItems: "center",
            gap: 18,
          }}
        >
          <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="refresh" size={32} color="#17120E" />
            </View>
            <Ionicons name="sparkles" size={18} color={colors.brandYellow} style={{ position: "absolute", top: 4, right: 2 }} />
            <Ionicons name="sparkles" size={11} color={colors.brand} style={{ position: "absolute", bottom: 10, left: 4 }} />
          </View>

          <View style={{ alignItems: "center", gap: 8 }}>
            <Txt variant="title" style={{ fontFamily: fonts.displayHeavy, fontSize: 25, lineHeight: 29, textAlign: "center" }}>
              {restarting ? "Restarting Sotechy…" : "A new update is ready"}
            </Txt>
            <Txt variant="body" color={colors.ink2} style={{ textAlign: "center", maxWidth: 300, lineHeight: 22 }}>
              {restarting ? "Hold on, the app opens again in a moment with the update." : "We've made Sotechy better. Restart the app to start using it. It only takes a few seconds."}
            </Txt>
          </View>

          <View style={{ alignSelf: "stretch", flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.bg, borderRadius: radius.lg, paddingVertical: 12, paddingHorizontal: 14 }}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.success} />
            <Txt variant="small" color={colors.ink2} style={{ flex: 1 }}>Your cart, orders and sign-in stay just as they are.</Txt>
          </View>

          <Pressable
            onPress={() => void restart()}
            disabled={restarting}
            accessibilityRole="button"
            style={({ pressed }) => ({
              alignSelf: "stretch",
              height: 56,
              borderRadius: radius.pill,
              backgroundColor: dark ? colors.brand : restarting ? "#3A322C" : "#17120E",
              opacity: pressed ? 0.88 : 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            })}
          >
            {restarting ? <ActivityIndicator color={dark ? "#17120E" : "#FFFFFF"} /> : <Ionicons name="refresh" size={20} color={dark ? "#17120E" : "#FFFFFF"} />}
            <Txt variant="label" color={dark ? "#17120E" : "#FFFFFF"} style={{ fontSize: 16, fontFamily: fonts.bold }}>{restarting ? "Restarting…" : "Restart now"}</Txt>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
