"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormError } from "@/components/account-fields";
import { AuthFrame, AuthHeading } from "@/components/auth-frame";
import { GoogleButton } from "@/components/google-button";
import { btn, Field, inputClass } from "@/components/ui";
import { signIn } from "@/lib/session-actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, null);

  return (
    <AuthFrame>
      <AuthHeading>Welcome back</AuthHeading>
      <p className="mb-8 mt-1 text-muted">Sign in to your store. It&apos;s the same account you use in the Sotechy app.</p>
      <form action={action} className="flex flex-col gap-4">
        <Field label="Email or @username">
          <input name="email" required autoComplete="username" autoCapitalize="none" spellCheck={false} className={inputClass} placeholder="you@yourstore.ng" />
        </Field>
        <Field label="Password">
          <input name="password" type="password" required autoComplete="current-password" className={inputClass} />
        </Field>
        <Link href="/forgot" className="-mt-1 self-end text-sm font-semibold text-brand-strong hover:underline">Forgot password?</Link>
        <FormError message={state?.error} />
        <button disabled={pending} className={btn.dark}>{pending ? "Signing in…" : "Sign in"}</button>
      </form>
      <div className="my-6 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>
      <GoogleButton />
      <p className="mt-8 text-center text-sm text-muted">
        New to Sotechy? <Link href="/signup" className="font-semibold text-brand-strong hover:underline">Open a store</Link>
      </p>
    </AuthFrame>
  );
}
