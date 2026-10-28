// Live screens: while the app is open and signed in, ask the API every few seconds whether anything of
// the customer's changed (orders, offers, chat, tokens). Screens loaded with useAsync(..., { live: true })
// fetch again, quietly, when it moves.
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { api } from "./api";
import { useAuth } from "./auth";
import { refreshHeldTokens } from "./held-tokens";

const PulseContext = createContext(0);
const EVERY_MS = 6000;

export function PulseProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tick, setTick] = useState(0);
  const last = useRef<string | null>(null);
  useEffect(() => {
    last.current = null;
    if (!user) return;
    let active = AppState.currentState === "active";
    const check = async () => {
      if (!active) return;
      const v = await api
        .pulse()
        .then((r) => r.v)
        .catch(() => null);
      if (!v) return;
      if (last.current && v !== last.current) {
        setTick((n) => n + 1);
        void refreshHeldTokens();
      }
      last.current = v;
    };
    void check();
    const t = setInterval(check, EVERY_MS);
    // Coming back to the app checks straight away
    const sub = AppState.addEventListener("change", (s) => {
      active = s === "active";
      if (active) void check();
    });
    return () => {
      clearInterval(t);
      sub.remove();
    };
  }, [user]);
  return <PulseContext.Provider value={tick}>{children}</PulseContext.Provider>;
}

/** Goes up by one each time something of the customer's changes */
export const usePulse = () => useContext(PulseContext);
