import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AuthResponse, User } from "@sotechy/shared";
import { api, setApiToken } from "./api";
import { tokenStore } from "./storage";

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: { email: string; password: string; fullName?: string; phone?: string }) => Promise<void>;
  /** Resolves true when the account was just created */
  signInWithGoogle: (idToken: string) => Promise<boolean>;
  updateProfile: (input: { fullName?: string; phone?: string; avatarStyle?: string | null }) => Promise<void>;
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
    signIn: async (email, password) => accept(await api.login({ email, password })),
    signUp: async (input) => accept(await api.register(input)),
    signInWithGoogle: async (idToken) => {
      const res = await api.googleSignIn(idToken);
      await accept(res);
      return Date.now() - new Date(res.user.createdAt).getTime() < 60_000;
    },
    updateProfile: async (input) => setUser(await api.updateProfile(input)),
    signOut: async () => {
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
