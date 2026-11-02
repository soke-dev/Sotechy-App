"use client";

import { BadgeHint } from "@/components/badge-hint";
import Link from "next/link";
import { useActionState, useState } from "react";
import { FormError, PhoneField, ReferralField, StoreHandleField } from "@/components/account-fields";
import { GoogleButton } from "@/components/google-button";
import { Illo } from "@/components/illustrations";
import { AuthHeading } from "@/components/auth-heading";
import { btn, Field, inputClass } from "@/components/ui";
import { openStore, signOut, signUp } from "@/lib/session-actions";

export function AccountStep({ referral }: { referral?: string }) {
  const [state, action, pending] = useActionState(signUp, null);
  return (
    <>
      <AuthHeading>Open your store</AuthHeading>
      <p className="mb-8 mt-1 text-muted">Set up in a few minutes. Explore your dashboard straight away, and start selling once Sotechy verifies your store.</p>
      <GoogleButton />
      <div className="my-6 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" /> or use email <span className="h-px flex-1 bg-line" />
      </div>
      <form action={action} className="flex flex-col gap-4">
        <Field label="Email" required>
          <input name="email" type="email" required autoComplete="email" className={inputClass} placeholder="you@yourstore.ng" />
        </Field>
        <Field label="Password" required hint="At least 8 characters.">
          <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
        </Field>
        <Field label="Confirm password" required>
          <input name="confirm" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
        </Field>
        <ReferralField defaultValue={referral} />
        <FormError message={state?.error} />
        <button disabled={pending} className={btn.dark}>{pending ? "Creating your account…" : "Create account"}</button>
      </form>
      <p className="mt-8 text-center text-sm text-muted">
        Already have a Sotechy account? <Link href="/login" className="font-semibold text-brand-strong hover:underline">Sign in</Link>
      </p>
    </>
  );
}

export function StoreStep({ firstName, askReferral, phone, referral }: { firstName: string | null; askReferral: boolean; phone: string | null; referral?: string }) {
  const [state, action, pending] = useActionState(openStore, null);
  const [kind, setKind] = useState<"individual" | "registered">("registered");
  const [same, setSame] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [name, setName] = useState("");

  return (
    <>
      <AuthHeading whySell={false}>{firstName ? `Hi ${firstName}, about your store` : "About your store"}</AuthHeading>
      <p className="mb-8 mt-1 text-muted">You can change these later in settings.</p>
      <form action={action} className="flex flex-col gap-5">
        <Field label="Store name" required>
          <input name="storeName" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={60} className={inputClass} placeholder="e.g. Sotechy Shop" />
        </Field>
        <StoreHandleField storeName={name} />
        {askReferral && <ReferralField defaultValue={referral} />}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-ink-2">You are selling as</span>
          <input type="hidden" name="sellerKind" value={kind} />
          {(
            [
              ["registered", "A registered business", "Business name, limited company or trustees (CAC)", "store"],
              ["individual", "A freelancer or individual", "Selling in your own name", "user"],
            ] as const
          ).map(([value, title, body, illo]) => (
            <button
              key={value}
              type="button"
              onClick={() => setKind(value)}
              className={`flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition ${kind === value ? "border-ink bg-surface" : "border-line hover:border-faint"}`}
            >
              <Illo name={illo} size={32} />
              <span>
                <span className="block text-[15px] font-semibold">{title}</span>
                <span className="text-sm text-muted">{body}</span>
              </span>
            </button>
          ))}
          <BadgeHint />
        </div>
        <PhoneField name="phone" label="Phone for orders" required defaultValue={phone} hint="We call or text this number about orders. Customers don't see it." />
        <label className="-mt-2 flex items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" name="sameNumber" checked={same} onChange={(e) => setSame(e.target.checked)} className="h-4 w-4 accent-[var(--color-brand)]" />
          Use this number for WhatsApp order alerts too
        </label>
        {!same && <PhoneField name="whatsapp" label="WhatsApp number" required />}
        <label className="flex items-start gap-3 text-sm text-ink-2">
          <input type="checkbox" required checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--color-brand)]" />
          <span>
            I agree to Sotechy&apos;s{" "}
            <Link href="/terms" target="_blank" className="font-semibold text-brand-strong underline">
              merchant terms
            </Link>
            .
          </span>
        </label>
        <FormError message={state?.error} />
        <button disabled={pending || !agreed} className={btn.primary}>{pending ? "Opening your store…" : "Continue to setup"}</button>
      </form>
      <form action={signOut} className="mt-6 text-center text-sm text-muted">
        Wrong account? <button className="font-semibold text-brand-strong hover:underline">Sign out</button>
      </form>
    </>
  );
}
