"use client";

import { AlertCircle, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { checkUsername } from "@/lib/session-actions";
import { Field, inputClass } from "./ui";

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">
      <AlertCircle size={16} className="mt-0.5 shrink-0" /> {message}
    </p>
  );
}

/** Same rules as the API, so problems show while typing; the API has the final say */
function usernameProblem(n: string) {
  if (n.length < 3) return "At least 3 characters";
  if (n.length > 20) return "20 characters at most";
  if (!/^[a-z0-9._]+$/.test(n)) return "Only letters, numbers, dots and underscores";
  if (/^[._]|[._]$/.test(n)) return "Can't start or end with a dot or underscore";
  if (/[._]{2}/.test(n)) return "No two dots or underscores in a row";
  return null;
}

/** @username with a live "is it free?" check */
export function UsernameField({ required, defaultValue = "" }: { required?: boolean; defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue);
  const n = value.trim().toLowerCase().replace(/^@/, "");
  const mine = !!n && n === defaultValue;
  const local = n ? usernameProblem(n) : null;
  const [result, setResult] = useState<{ name: string; problem: string | null } | null>(null);

  useEffect(() => {
    if (!n || local || mine) return;
    let live = true;
    const t = setTimeout(async () => {
      const r = await checkUsername(n);
      if (live) setResult({ name: n, problem: r && !r.available ? (r.reason ?? `@${n} is taken`) : null });
    }, 350);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [n, local, mine]);

  const checking = !!n && !local && !mine && result?.name !== n;
  const problem = local ?? (result?.name === n ? result.problem : null);

  return (
    <Field label="Username" required={required} hint={n ? undefined : "How customers and other stores find you. You can change it later."}>
      <span className="relative flex items-center">
        <span className="pointer-events-none absolute left-4 text-muted">@</span>
        <input
          name="username"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/^@/, ""))}
          required={required}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          className={`${inputClass} pl-8`}
          placeholder="ada.okafor"
        />
        {n && !mine && !problem && !checking && <Check size={18} className="absolute right-4 text-good" />}
      </span>
      {n && !mine && <span className={`text-xs ${problem ? "text-bad" : checking ? "text-muted" : "text-good"}`}>{problem ?? (checking ? "Checking…" : `@${n} is available`)}</span>}
    </Field>
  );
}

/** Optional referral code (someone's @username). Hidden behind a link unless it came in a ?ref= link. */
export function ReferralField({ defaultValue }: { defaultValue?: string }) {
  const [open, setOpen] = useState(!!defaultValue);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="-mt-1 self-start text-sm font-semibold text-brand-strong hover:underline">
        Have a referral code?
      </button>
    );
  }
  return (
    <Field label="Referral code" hint="Optional. The @username of whoever invited you.">
      <span className="relative flex items-center">
        <span className="pointer-events-none absolute left-4 text-muted">@</span>
        <input name="referralCode" defaultValue={defaultValue?.replace(/^@/, "")} autoFocus={!defaultValue} autoCapitalize="none" spellCheck={false} className={`${inputClass} pl-8`} placeholder="their.username" />
      </span>
    </Field>
  );
}

/** Nigerian mobile number with a fixed +234 */
export function PhoneField({ name, label, required, hint, defaultValue }: { name: string; label: string; required?: boolean; hint?: string; defaultValue?: string | null }) {
  return (
    <Field label={label} required={required} hint={hint}>
      <span className="flex items-stretch overflow-hidden rounded-2xl border border-line bg-surface focus-within:border-ink focus-within:ring-4 focus-within:ring-brand/15">
        <span className="flex shrink-0 items-center whitespace-nowrap border-r border-line bg-surface-alt px-3 text-[15px] font-semibold text-ink-2">+234</span>
        <input
          name={name}
          defaultValue={defaultValue?.replace(/^\+234/, "") ?? ""}
          required={required}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          className="min-h-12 w-full min-w-0 bg-transparent px-3 text-[15px] text-ink outline-none placeholder:text-faint"
          placeholder="803 555 0142"
        />
      </span>
    </Field>
  );
}
