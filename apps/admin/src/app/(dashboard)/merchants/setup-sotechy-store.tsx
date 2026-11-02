"use client";

// Shown on Merchants until Sotechy's own store exists: makes it in one step for the account that will run it.
import { useState, useTransition } from "react";
import { usePasswordPrompt } from "@/components/password-prompt";
import { Card, ErrorNote, inputClass, primaryButtonClass } from "@/components/ui";
import { setupSotechyStore } from "./actions";

export function SetupSotechyStore() {
  const [email, setEmail] = useState("hello@sotechy.shop");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ newAccount: boolean } | null>(null);
  const [pending, start] = useTransition();
  const { ask, prompt } = usePasswordPrompt();

  if (done)
    return (
      <Card title="Sotechy's store is set up" className="mb-4">
        <p className="text-sm text-ink-2">
          <b>{email}</b> runs it at merchant.sotechy.shop. It&apos;s live in the app as <b>Sotechy</b>, an official store selling with $SOTECHY.
          {done.newAccount && (
            <>
              {" "}
              The account is new: sign in at merchant.sotechy.shop with <b>Continue with Google</b> on that email, or use <b>Forgot password</b> to set a password.
            </>
          )}
        </p>
      </Card>
    );

  return (
    <Card title="Set up Sotechy's own store" description="Sotechy sells in the app like any store, run from the merchant dashboard by the account below. It's named Sotechy, at /store/sotechy, sells with $SOTECHY, shows as an official store and goes live straight away." className="mb-4">
      {prompt}
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            setError(null);
            const password = await ask("Set up Sotechy's store?", `${email} will run it from the merchant dashboard.`);
            if (!password) return;
            const r = await setupSotechyStore(email, password);
            if ("error" in r) setError(r.error);
            else setDone({ newAccount: r.newAccount });
          });
        }}
      >
        <label className="flex min-w-72 flex-1 flex-col gap-1 text-sm">
          <span className="font-semibold">Account that runs it</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </label>
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "Setting up…" : "Set up Sotechy's store"}
        </button>
      </form>
      <ErrorNote error={error} />
    </Card>
  );
}
