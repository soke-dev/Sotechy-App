// Light / dark preference. Light by default; dark is opt-in from Account.
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SystemUI from "expo-system-ui";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { View } from "react-native";
import { applyTheme, colors, type ThemeName } from "./theme";

const KEY = "sotechy_theme";

interface ThemeModeState {
  resolved: ThemeName;
  setTheme: (t: ThemeName) => void;
}

const ThemeModeContext = createContext<ThemeModeState>({ resolved: "light", setTheme: () => {} });
export const useThemeMode = () => useContext(ThemeModeContext);

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [resolved, setResolved] = useState<ThemeName>("light");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => {
        if (v === "dark") setResolved("dark");
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  // Swap the palette before anything below renders with it.
  applyTheme(resolved);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});
  }, [resolved]);

  const setTheme = (t: ThemeName) => {
    setResolved(t);
    AsyncStorage.setItem(KEY, t).catch(() => {});
  };

  if (!loaded) return null;
  return (
    <ThemeModeContext.Provider value={{ resolved, setTheme }}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>{children}</View>
    </ThemeModeContext.Provider>
  );
}
