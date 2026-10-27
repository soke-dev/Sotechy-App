"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormError } from "@/components/account-fields";
import { AuthFrame } from "@/components/auth-frame";
import { btn, Field, inputClass } from "@/components/ui";
import { resetPassword } from "@/lib/session-actions";

export default function ForgotPage() {
  const [state, action, pending] = useActionState(resetPassword, null);
  // Once a code is sent (or a code was wrong), the form asks for the code and a new password
  const email = state && "sent" in state ? state.sent : state && "email" in state ? state.email : undefined;

  return (
    <AuthFrame>
      <h2 className="text-3xl font-extrabold">{email ? "Check your email" : "Forgot your password?"}</h2>
      <p className="mb-8 mt-1 text-muted">
        {email ? (
          <>
            If <b className="text-ink">{email}</b> has a Sotechy account, we&apos;ve sent it a 6-digit code. It works for 15 minutes.
          </>
        ) : (
          "Enter your account's email and we'll send you a code to choose a new password."
        )}
      </p>
      <form action={action} key={email ?? "email"} className="flex flex-col gap-4">
        {email ? (
          <>
            <input type="hidden" name="email" value={email} />
            <Field label="Code" required>
              <input name="code" required inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} className={`${inputClass} text-lg tracking-[0.4em]`} placeholder="000000" />
            </Field>
            <Field label="New password" required hint="At least 8 characters.">
              <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
            </Field>
          </>
        ) : (
          <Field label="Email" required>
            <input name="email" type="email" required autoComplete="email" className={inputClass} placeholder="you@yourstore.ng" />
          </Field>
        )}
        <FormError message={state && "error" in state ? state.error : null} />
        <button disabled={pending} className={btn.dark}>{pending ? "Please wait…" : email ? "Save new password" : "Send code"}</button>
      </form>
      <p className="mt-8 text-center text-sm text-muted">
        Remembered it? <Link href="/login" className="font-semibold text-brand-strong hover:underline">Sign in</Link>
      </p>
    </AuthFrame>
  );
}
