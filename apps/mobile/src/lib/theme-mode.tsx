// Light / dark / follow-device preference. Defaults to the device setting.
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SystemUI from "expo-system-ui";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useColorScheme, View } from "react-native";
import { applyTheme, colors, type ThemeName } from "./theme";

export type ThemePreference = "system" | "light" | "dark";

const KEY = "sotechy_theme";

interface ThemeModeState {
  preference: ThemePreference;
  resolved: ThemeName;
  setPreference: (p: ThemePreference) => void;
}

const ThemeModeContext = createContext<ThemeModeState>({ preference: "system", resolved: "light", setPreference: () => {} });
export const useThemeMode = () => useContext(ThemeModeContext);

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPref] = useState<ThemePreference>("system");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => {
        if (v === "light" || v === "dark" || v === "system") setPref(v);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const resolved: ThemeName = preference === "system" ? (system === "dark" ? "dark" : "light") : preference;
  // Swap the palette before anything below renders with it.
  applyTheme(resolved);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});
  }, [resolved]);

  const setPreference = (p: ThemePreference) => {
    setPref(p);
    AsyncStorage.setItem(KEY, p).catch(() => {});
  };

  if (!loaded) return null;
  return (
    <ThemeModeContext.Provider value={{ preference, resolved, setPreference }}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>{children}</View>
    </ThemeModeContext.Provider>
  );
}
