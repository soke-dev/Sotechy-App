"use client";

// Asks for the admin's password before an action that moves money or opens a store.
// const { ask, prompt } = usePasswordPrompt(); … const password = await ask("Approve this store?"); render {prompt}
// Switched off for now: ask() answers straight away unless NEXT_PUBLIC_ADMIN_PASSWORD_CHECKS=on (and the API's
// ADMIN_PASSWORD_CHECKS=on) bring the check back.
import { Lock } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { inputClass, primaryButtonClass, Sheet } from "./ui";

export function usePasswordPrompt() {
  const [open, setOpen] = useState<{ title: string; detail?: ReactNode } | null>(null);
  const [password, setPassword] = useState("");
  const resolve = useRef<((v: string | null) => void) | null>(null);

  const finish = (v: string | null) => {
    resolve.current?.(v);
    resolve.current = null;
    setOpen(null);
    setPassword("");
  };
  const ask = (title: string, detail?: ReactNode) =>
    new Promise<string | null>((res) => {
      if (process.env.NEXT_PUBLIC_ADMIN_PASSWORD_CHECKS !== "on") return res("-");
      resolve.current = res;
      // Callers ask from inside startTransition, where React holds state updates back until the
      // transition ends; but it can't end until the password is given. Opening on the next tick
      // makes it an ordinary update, so the sheet shows straight away.
      setTimeout(() => setOpen({ title, detail }), 0);
    });

  const prompt = (
    <Sheet open={open !== null} onClose={() => finish(null)} title={open?.title ?? ""}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (password) finish(password);
        }}
        className="flex flex-col gap-4"
      >
        {open?.detail && <div className="text-sm text-ink-2">{open.detail}</div>}
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink-2">Your admin password</span>
          <input type="password" autoFocus autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
        </label>
        <button type="submit" disabled={!password} className={primaryButtonClass}>
          <Lock size={15} /> Confirm
        </button>
      </form>
    </Sheet>
  );
  return { ask, prompt };
}
