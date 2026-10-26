"use client";

import { useState } from "react";
import { btn, inputClass } from "./ui";

/** The emailed 6-digit code step used by sign-in and sign-up. */
export function CodeStep({ email, title, onDone, onBack }: { email: string; title: string; onDone: () => void; onBack: () => void }) {
  const [code, setCode] = useState("");
  return (
    <>
      <h2 className="text-3xl font-extrabold">{title}</h2>
      <p className="mb-8 mt-1 text-muted">We sent a 6-digit code to <b className="text-ink">{email || "your email"}</b>.</p>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          onDone();
        }}
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          className={`${inputClass} text-center font-display text-3xl font-bold tracking-[0.5em]`}
          placeholder="••••••"
        />
        <button disabled={code.length < 6} className={btn.dark}>Verify</button>
      </form>
      <div className="mt-6 flex justify-between text-sm">
        <button onClick={onBack} className="font-semibold text-muted hover:text-ink">Back</button>
        <button className="font-semibold text-brand-strong hover:underline">Send a new code</button>
      </div>
    </>
  );
}
