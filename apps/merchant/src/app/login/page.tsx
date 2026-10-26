"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthFrame } from "@/components/auth-frame";
import { CodeStep } from "@/components/code-step";
import { btn, Field, inputClass } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"password" | "code">("password");
  const [email, setEmail] = useState("");

  return (
    <AuthFrame>
      {step === "password" ? (
        <>
          <h2 className="text-3xl font-extrabold">Welcome back</h2>
          <p className="mb-8 mt-1 text-muted">Sign in to your store.</p>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              setStep("code");
            }}
          >
            <Field label="Email">
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required autoComplete="email" className={inputClass} placeholder="you@yourstore.ng" />
            </Field>
            <Field label="Password">
              <input type="password" required autoComplete="current-password" className={inputClass} />
            </Field>
            <Link href="#" className="-mt-1 self-end text-sm font-semibold text-brand-strong hover:underline">Forgot password?</Link>
            <button className={btn.dark}>Continue</button>
          </form>
          <div className="my-6 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>
          <button className={`${btn.outline} w-full`}>
            <span className="font-display text-lg font-bold text-[#4285F4]">G</span> Continue with Google
          </button>
          <p className="mt-8 text-center text-sm text-muted">
            New to Sotechy? <Link href="/signup" className="font-semibold text-brand-strong hover:underline">Open a store</Link>
          </p>
        </>
      ) : (
        <CodeStep email={email} title="Check your email" onDone={() => router.push("/")} onBack={() => setStep("password")} />
      )}
    </AuthFrame>
  );
}
