"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { FormError, PhoneField, UsernameField } from "@/components/account-fields";
import { GoogleButton } from "@/components/google-button";
import { Illo } from "@/components/illustrations";
import { btn, Field, inputClass } from "@/components/ui";
import { openStore, signOut, signUp } from "@/lib/session-actions";

export function AccountStep() {
  const [state, action, pending] = useActionState(signUp, null);
  return (
    <>
      <h2 className="text-3xl font-extrabold">Open your store</h2>
      <p className="mb-8 mt-1 text-muted">Start in test mode right away. Sell for real once you&apos;re verified.</p>
      <GoogleButton />
      <div className="my-6 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" /> or use email <span className="h-px flex-1 bg-line" />
      </div>
      <form action={action} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" required><input name="firstName" required autoComplete="given-name" className={inputClass} /></Field>
          <Field label="Last name" required><input name="lastName" required autoComplete="family-name" className={inputClass} /></Field>
        </div>
        <Field label="Email" required>
          <input name="email" type="email" required autoComplete="email" className={inputClass} placeholder="you@yourstore.ng" />
        </Field>
        <UsernameField required />
        <Field label="Password" required hint="At least 8 characters.">
          <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
        </Field>
        <FormError message={state?.error} />
        <button disabled={pending} className={btn.dark}>{pending ? "Creating your account…" : "Create account"}</button>
      </form>
      <p className="mt-8 text-center text-sm text-muted">
        Already have a Sotechy account? <Link href="/login" className="font-semibold text-brand-strong hover:underline">Sign in</Link>
      </p>
    </>
  );
}

export function StoreStep({ firstName, needsUsername, phone }: { firstName: string | null; needsUsername: boolean; phone: string | null }) {
  const [state, action, pending] = useActionState(openStore, null);
  const [kind, setKind] = useState<"individual" | "registered">("registered");
  const [same, setSame] = useState(true);

  return (
    <>
      <h2 className="text-3xl font-extrabold">{firstName ? `Hi ${firstName}, about your store` : "About your store"}</h2>
      <p className="mb-8 mt-1 text-muted">You can change these later in settings.</p>
      <form action={action} className="flex flex-col gap-5">
        <Field label="Store name" required>
          <input name="storeName" required minLength={2} maxLength={60} className={inputClass} placeholder="e.g. Xena Gadgets" />
        </Field>
        {needsUsername && <UsernameField required />}
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
        </div>
        <PhoneField name="phone" label="Phone for orders" required defaultValue={phone} hint="We call or text this number about orders. Customers don't see it." />
        <label className="-mt-2 flex items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" name="sameNumber" checked={same} onChange={(e) => setSame(e.target.checked)} className="h-4 w-4 accent-[var(--color-brand)]" />
          Use this number for WhatsApp order alerts too
        </label>
        {!same && <PhoneField name="whatsapp" label="WhatsApp number" required />}
        <label className="flex items-start gap-3 text-sm text-ink-2">
          <input type="checkbox" required className="mt-0.5" /> I agree to Sotechy&apos;s merchant terms, including the fee and payout plan shown before I go live.
        </label>
        <FormError message={state?.error} />
        <button disabled={pending} className={btn.primary}>{pending ? "Opening your store…" : "Continue to setup"}</button>
      </form>
      <form action={signOut} className="mt-6 text-center text-sm text-muted">
        Wrong account? <button className="font-semibold text-brand-strong hover:underline">Sign out</button>
      </form>
    </>
  );
}
