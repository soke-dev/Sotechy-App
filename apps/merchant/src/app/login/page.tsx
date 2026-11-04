"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormError } from "@/components/account-fields";
import { ArrowChip, AuthFrame } from "@/components/auth-frame";
import { AuthHeading } from "@/components/auth-heading";
import { GoogleButton } from "@/components/google-button";
import { btn, Field, inputClass } from "@/components/ui";
import { signIn } from "@/lib/session-actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, null);

  return (
    <AuthFrame
      title={["Your store", "is waiting."]}
      top={
        <a href="https://sotechy.shop" className="hidden lg:inline">
          Shopping instead? <b className="text-ink">sotechy.shop</b>
        </a>
      }
    >
      <AuthHeading>Welcome back.</AuthHeading>
      <p className="mb-7 mt-3 text-ink-2">Sign in to your store. It&apos;s the same account you use in the Sotechy app.</p>
      <GoogleButton />
      <div className="my-6 flex items-center gap-3 text-xs text-muted">
        <span className="h-0.5 flex-1 bg-line" /> or use your email <span className="h-0.5 flex-1 bg-line" />
      </div>
      <form action={action} className="flex flex-col gap-4">
        <Field label="Email or @username">
          <input name="email" required autoComplete="username" autoCapitalize="none" spellCheck={false} className={inputClass} placeholder="you@yourstore.ng" />
        </Field>
        <Field label="Password">
          <input name="password" type="password" required autoComplete="current-password" className={inputClass} />
        </Field>
        <Link href="/forgot" className="-mt-1 self-end text-sm font-bold text-brand-strong hover:underline">Forgot password?</Link>
        <FormError message={state?.error} />
        <button disabled={pending} className={btn.auth}>
          {pending ? "Signing in…" : "Sign in"}
          <ArrowChip />
        </button>
      </form>
      <div className="mt-8 flex items-center justify-between gap-3 rounded-[18px] border-[2.5px] border-dashed border-ink px-[18px] py-4">
        <span className="text-[15px] text-ink">New to Sotechy?</span>
        <Link href="/signup" className="display inline-flex items-center gap-2 text-[17px] tracking-normal text-ink">
          Open a store
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F27405" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>
    </AuthFrame>
  );
}
