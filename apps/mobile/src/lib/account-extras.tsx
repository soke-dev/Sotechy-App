// Account details the app keeps alongside the user: their @username and contact numbers for calls and
// WhatsApp. Saved on this device per account for now; the call number is also saved to the account.
// Moves to the server with the wallet (usernames are how customers send each other tokens).
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "./auth";

export interface AccountExtras {
  username: string;
  callNumber: string;
  whatsappNumber: string;
  /** One number for calls and WhatsApp */
  sameNumber: boolean;
  /** The welcome step (username, numbers) has been seen */
  setupDone: boolean;
}

const EMPTY: AccountExtras = { username: "", callNumber: "", whatsappNumber: "", sameNumber: true, setupDone: false };
const key = (userId: string) => `sotechy_account_${userId}`;

/** Usernames already in use (sample until the server checks) */
const TAKEN = ["sotechy", "admin", "support", "chidi", "amaka.n", "tunde", "xena", "help"];

export function usernameProblem(name: string): string | null {
  const n = name.trim().toLowerCase().replace(/^@/, "");
  if (!n) return "Pick a username";
  if (n.length < 3) return "At least 3 characters";
  if (n.length > 20) return "20 characters at most";
  if (!/^[a-z0-9._]+$/.test(n)) return "Only letters, numbers, dots and underscores";
  if (TAKEN.includes(n)) return `@${n} is taken`;
  return null;
}

/** A suggestion from the person's name or email */
export function suggestUsername(fullName?: string | null, email?: string | null) {
  const base = (fullName || email?.split("@")[0] || "shopper")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 16);
  return TAKEN.includes(base) || base.length < 3 ? `${base || "shopper"}${Math.floor(10 + Math.random() * 89)}` : base;
}

interface State {
  extras: AccountExtras;
  loaded: boolean;
  save: (patch: Partial<AccountExtras>) => Promise<void>;
}

const Ctx = createContext<State>({ extras: EMPTY, loaded: false, save: async () => {} });
export const useAccountExtras = () => useContext(Ctx);

export function AccountExtrasProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [extras, setExtras] = useState<AccountExtras>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    if (!user) {
      setExtras(EMPTY);
      return;
    }
    AsyncStorage.getItem(key(user.id))
      .then((v) => setExtras(v ? { ...EMPTY, ...JSON.parse(v) } : { ...EMPTY, callNumber: user.phone ?? "" }))
      .catch(() => setExtras(EMPTY))
      .finally(() => setLoaded(true));
  }, [user]);

  const save = useCallback(
    async (patch: Partial<AccountExtras>) => {
      if (!user) return;
      const next = { ...extras, ...patch };
      if (next.sameNumber) next.whatsappNumber = next.callNumber;
      setExtras(next);
      await AsyncStorage.setItem(key(user.id), JSON.stringify(next)).catch(() => {});
    },
    [user, extras],
  );

  return <Ctx.Provider value={{ extras, loaded, save }}>{children}</Ctx.Provider>;
}
