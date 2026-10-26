// The signed-in person's @username and contact numbers, kept on their Sotechy account (so they follow
// them to every device, and stores and the merchant dashboard see the same details).
import { useEffect, useState, type ReactNode } from "react";
import { api } from "./api";
import { useAuth } from "./auth";

export interface AccountExtras {
  username: string;
  callNumber: string;
  whatsappNumber: string;
  /** One number for calls and WhatsApp */
  sameNumber: boolean;
  /** Has picked a username (the welcome step is done) */
  setupDone: boolean;
}

/** Same rules as the server, so people see problems as they type; the server has the final say */
export function usernameProblem(name: string): string | null {
  const n = name.trim().toLowerCase().replace(/^@/, "");
  if (!n) return "Pick a username";
  if (n.length < 3) return "At least 3 characters";
  if (n.length > 20) return "20 characters at most";
  if (!/^[a-z0-9._]+$/.test(n)) return "Only letters, numbers, dots and underscores";
  if (/^[._]|[._]$/.test(n)) return "Can't start or end with a dot or underscore";
  if (/[._]{2}/.test(n)) return "No two dots or underscores in a row";
  return null;
}

/** A suggestion from the person's name or email */
export function suggestUsername(fullName?: string | null, email?: string | null) {
  const base = (fullName || email?.split("@")[0] || "shopper")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 16);
  return base.length < 3 ? `${base || "shopper"}${Math.floor(10 + Math.random() * 89)}` : base;
}

/** Checks a username with the server as the person types (after a short pause) */
export function useUsernameCheck(name: string, current?: string | null) {
  const n = name.trim().toLowerCase().replace(/^@/, "");
  const local = usernameProblem(n);
  const [result, setResult] = useState<{ name: string; problem: string | null } | null>(null);

  useEffect(() => {
    if (local || n === current) return;
    let live = true;
    const t = setTimeout(() => {
      api
        .checkUsername(n)
        .then((r) => live && setResult({ name: n, problem: r.available ? null : (r.reason ?? `@${n} is taken`) }))
        .catch(() => live && setResult({ name: n, problem: null }));
    }, 350);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [n, local, current]);

  if (local) return { problem: local, checking: false };
  if (n === current) return { problem: null, checking: false };
  if (result?.name !== n) return { problem: null, checking: true };
  return { problem: result.problem, checking: false };
}

export function useAccountExtras() {
  const { user, updateProfile } = useAuth();
  const extras: AccountExtras = {
    username: user?.username ?? "",
    callNumber: user?.phone ?? "",
    whatsappNumber: user?.whatsappPhone ?? user?.phone ?? "",
    sameNumber: !user?.whatsappPhone,
    setupDone: !!user?.username,
  };
  const save = async (patch: Partial<AccountExtras>) => {
    const call = patch.callNumber ?? extras.callNumber;
    const same = patch.sameNumber ?? extras.sameNumber;
    const whatsapp = patch.whatsappNumber ?? extras.whatsappNumber;
    await updateProfile({
      ...(patch.username !== undefined && { username: patch.username }),
      ...((patch.callNumber !== undefined || patch.sameNumber !== undefined || patch.whatsappNumber !== undefined) && {
        phone: call || null,
        whatsappPhone: same || !whatsapp || whatsapp === call ? null : whatsapp,
      }),
    });
  };
  return { extras, loaded: !!user, save };
}

/** Kept so the provider in the root layout still works; the details now live on the account */
export function AccountExtrasProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
