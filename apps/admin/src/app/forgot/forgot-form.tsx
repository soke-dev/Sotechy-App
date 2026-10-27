"use client";

import { useActionState } from "react";
import { Field, inputClass, primaryButtonClass } from "@/components/ui";
import { resetPassword, type ResetState } from "../login/actions";

export function ForgotForm() {
  const [state, action, pending] = useActionState(resetPassword, { step: "email" } as ResetState);
  return (
    <form action={action} className="flex flex-col gap-4">
      {state.step === "email" ? (
        <Field label="Email">
          <input name="email" type="email" required autoComplete="email" placeholder="you@sotechy.shop" className={inputClass} />
        </Field>
      ) : (
        <>
          <p className="rounded-xl bg-brand-soft px-3 py-2.5 text-sm text-ink-2">
            If <b className="text-ink">{state.email}</b> has an account, we&apos;ve emailed it a 6-digit code. It works for 15 minutes.
          </p>
          <Field label="Code from the email">
            <input name="code" required inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} placeholder="000000" className={`${inputClass} text-center text-lg tracking-[0.5em]`} />
          </Field>
          <Field label="New password" hint="At least 8 characters.">
            <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
          </Field>
          <Field label="Confirm new password">
            <input name="confirm" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
          </Field>
        </>
      )}
      <button disabled={pending} className={`${primaryButtonClass} w-full`}>
        {pending ? "Please wait…" : state.step === "email" ? "Send code" : "Save new password"}
      </button>
      {state.error && <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{state.error}</p>}
    </form>
  );
}
