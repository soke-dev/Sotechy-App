// Shop settings from the admin dashboard (app switches, banners, contacts), loaded once and
// refreshed when the app comes back to the foreground, so switches reach customers quickly.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { DEFAULT_FEATURES, type AppFeatures, type StoreConfig } from "@sotechy/shared";
import { api } from "./api";

interface StoreConfigState {
  config: StoreConfig | null;
  /** Always defined: defaults until the first load (everything on, no maintenance) */
  features: AppFeatures;
  reload: () => Promise<void>;
}

const Ctx = createContext<StoreConfigState>({ config: null, features: DEFAULT_FEATURES, reload: async () => {} });

const REFRESH_MS = 60_000;

export function StoreConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const lastLoad = useRef(0);

  const reload = useCallback(async () => {
    try {
      setConfig(await api.storeConfig());
      lastLoad.current = Date.now();
    } catch {
      // Offline or API down: keep what we have.
    }
  }, []);

  useEffect(() => {
    reload();
    const timer = setInterval(reload, REFRESH_MS);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && Date.now() - lastLoad.current > 15_000) reload();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [reload]);

  return <Ctx.Provider value={{ config, features: { ...DEFAULT_FEATURES, ...config?.features }, reload }}>{children}</Ctx.Provider>;
}

export const useStoreConfig = () => useContext(Ctx);
export const useFeatures = () => useContext(Ctx).features;
