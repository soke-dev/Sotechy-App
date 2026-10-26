"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthFrame } from "@/components/auth-frame";
import { Illo } from "@/components/illustrations";
import { btn, Field, inputClass } from "@/components/ui";
import { CodeStep } from "@/components/code-step";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<"account" | "code" | "store">("account");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [kind, setKind] = useState<"individual" | "registered">("registered");

  return (
    <AuthFrame>
      <div className="mb-8 flex gap-1.5">
        {["account", "code", "store"].map((s, i) => (
          <span key={s} className={`h-1.5 flex-1 rounded-full ${["account", "code", "store"].indexOf(step) >= i ? "bg-brand" : "bg-line"}`} />
        ))}
      </div>

      {step === "account" && (
        <>
          <h2 className="text-3xl font-extrabold">Open your store</h2>
          <p className="mb-8 mt-1 text-muted">Start in test mode right away. Sell for real once you&apos;re verified.</p>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              setStep("code");
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name"><input required className={inputClass} /></Field>
              <Field label="Last name"><input required className={inputClass} /></Field>
            </div>
            <Field label="Work email">
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className={inputClass} placeholder="you@yourstore.ng" />
            </Field>
            <Field label="Password" hint="At least 10 characters.">
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required minLength={10} className={inputClass} />
            </Field>
            <button className={btn.dark}>Create account</button>
          </form>
          <p className="mt-8 text-center text-sm text-muted">
            Already selling? <Link href="/login" className="font-semibold text-brand-strong hover:underline">Sign in</Link>
          </p>
        </>
      )}

      {step === "code" && <CodeStep email={email} title="Confirm your email" onDone={() => setStep("store")} onBack={() => setStep("account")} />}

      {step === "store" && (
        <>
          <h2 className="text-3xl font-extrabold">About your store</h2>
          <p className="mb-8 mt-1 text-muted">You can change these during setup.</p>
          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              router.push("/onboarding");
            }}
          >
            <Field label="Store name">
              <input required className={inputClass} placeholder="e.g. Xena Gadgets" />
            </Field>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-ink-2">You are selling as</span>
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
                  className={`flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition ${kind === value ? "border-ink bg-surface" : "border-line hover:border-faint"}`}
                >
                  <Illo name={illo} size={36} />
                  <span>
                    <span className="block font-semibold">{title}</span>
                    <span className="text-sm text-muted">{body}</span>
                  </span>
                </button>
              ))}
            </div>
            <label className="flex items-start gap-3 text-sm text-ink-2">
              <input type="checkbox" required className="mt-0.5" /> I agree to Sotechy&apos;s merchant terms, including the 2% fee and the 50/50 payout terms.
            </label>
            <button className={btn.primary}>Continue to setup</button>
          </form>
        </>
      )}
    </AuthFrame>
  );
}
