import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AuthResponse, User } from "@sotechy/shared";
import { api, setApiToken } from "./api";
import { tokenStore } from "./storage";

interface AuthState {
  user: User | null;
  loading: boolean;
  /** Resolves with the signed-in account (to see if it still needs a username) */
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (input: { email: string; password: string; fullName?: string; phone?: string }) => Promise<void>;
  /** Resolves true when the account was just created */
  signInWithGoogle: (idToken: string) => Promise<boolean>;
  updateProfile: (input: { fullName?: string; username?: string; phone?: string | null; whatsappPhone?: string | null; avatarStyle?: string | null }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await tokenStore.get();
      if (token) {
        setApiToken(token);
        try {
          setUser(await api.me());
        } catch {
          setApiToken(null);
          await tokenStore.clear();
        }
      }
      setLoading(false);
    })();
  }, []);

  async function accept(res: AuthResponse) {
    setApiToken(res.token);
    await tokenStore.set(res.token);
    setUser(res.user);
  }

  const value: AuthState = {
    user,
    loading,
    signIn: async (email, password) => {
      const res = await api.login({ email, password });
      await accept(res);
      return res.user;
    },
    signUp: async (input) => accept(await api.register(input)),
    signInWithGoogle: async (idToken) => {
      const res = await api.googleSignIn(idToken);
      await accept(res);
      return Date.now() - new Date(res.user.createdAt).getTime() < 60_000;
    },
    updateProfile: async (input) => setUser(await api.updateProfile(input)),
    signOut: async () => {
      // Loaded here so the auth module doesn't pull in notifications at startup
      await (await import("./push")).forgetPushDevice();
      setApiToken(null);
      await tokenStore.clear();
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
