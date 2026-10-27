"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, inputClass, primaryButtonClass } from "@/components/ui";
import { login, type LoginState } from "./actions";

export function LoginForm({ reset }: { reset?: boolean }) {
  const [state, action, pending] = useActionState(login, { step: "password" } as LoginState);
  return (
    <form action={action} className="flex flex-col gap-4">
      {state.step === "password" ? (
        <>
          {reset && <p className="rounded-xl bg-good-soft px-3 py-2 text-sm text-good">Password changed. Sign in with your new one.</p>}
          <Field label="Email">
            <input name="email" type="email" required autoComplete="email" placeholder="you@sotechy.shop" className={inputClass} />
          </Field>
          <Field label="Password">
            <input name="password" type="password" required autoComplete="current-password" className={inputClass} />
          </Field>
          <Link href="/forgot" className="-mt-1 self-end text-sm font-semibold text-brand-strong hover:underline">Forgot password?</Link>
        </>
      ) : (
        <>
          <p className="rounded-xl bg-brand-soft px-3 py-2.5 text-sm text-ink-2">
            We emailed a 6-digit code to <b className="text-ink">{state.email}</b>. It works for 10 minutes.
          </p>
          <Field label="Code from the email">
            <input name="code" required autoFocus inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} placeholder="000000" className={`${inputClass} text-center text-lg tracking-[0.5em]`} />
          </Field>
        </>
      )}
      <button disabled={pending} className={`${primaryButtonClass} w-full`}>
        {pending ? "Please wait…" : state.step === "password" ? "Continue" : "Sign in"}
      </button>
      {state.error && <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{state.error}</p>}
      {state.step === "code" && (
        <a href="/login" className="text-center text-sm font-semibold text-muted hover:text-ink">Use a different account, or get a new code</a>
      )}
    </form>
  );
}
