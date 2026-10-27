"use client";

import { AlertCircle, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { checkStoreHandle, checkUsername } from "@/lib/session-actions";
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

/** What a username can be: lowercase letters, numbers, dots and underscores. A pasted email keeps the part before the @. */
const cleanHandle = (raw: string) =>
  raw
    .trim()
    .toLowerCase()
    .replace(/^@/, "")
    .split("@")[0]
    .replace(/[^a-z0-9._]/g, "")
    .slice(0, 20);

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
    <Field label="Your username" required={required} hint={n ? undefined : "Your personal @handle, the same one you use in the Sotechy app."}>
      <span className="relative flex items-center">
        <span className="pointer-events-none absolute left-4 text-muted">@</span>
        <input
          // Not "username": browsers would fill in the email address used to sign in
          name="handle"
          value={value}
          onChange={(e) => setValue(cleanHandle(e.target.value))}
          required={required}
          maxLength={20}
          autoComplete="off"
          data-1p-ignore
          data-lpignore="true"
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

/** "Kemi's Phones & More" → "kemis-phones-and-more": what a store username can be */
export const storeHandleFrom = (raw: string) =>
  raw
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, 30);

/**
 * The store's username, which is also its link. Follows the store name until the merchant edits it,
 * and checks with the server that it's free.
 */
export function StoreHandleField({ storeName }: { storeName: string }) {
  const [typed, setTyped] = useState<string | null>(null);
  const h = (typed ?? storeHandleFrom(storeName)).replace(/-+$/, "");
  const local = !h ? null : h.length < 3 ? "At least 3 characters" : null;
  const [result, setResult] = useState<{ handle: string; problem: string | null } | null>(null);

  useEffect(() => {
    if (!h || local) return;
    let live = true;
    const t = setTimeout(async () => {
      const r = await checkStoreHandle(h);
      if (live) setResult({ handle: h, problem: r && !r.available ? (r.reason ?? `@${h} is taken`) : null });
    }, 350);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [h, local]);

  const checking = !!h && !local && result?.handle !== h;
  const problem = local ?? (result?.handle === h ? result.problem : null);

  return (
    <Field label="Store username" required>
      <span className="relative flex items-center">
        <span className="pointer-events-none absolute left-4 text-muted">@</span>
        <input
          name="storeHandle"
          value={typed ?? storeHandleFrom(storeName)}
          onChange={(e) => setTyped(storeHandleFrom(e.target.value))}
          onBlur={() => typed !== null && setTyped(typed.replace(/-+$/, ""))}
          required
          minLength={3}
          maxLength={30}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          data-1p-ignore
          data-lpignore="true"
          className={`${inputClass} pl-8`}
          placeholder="xena-gadgets"
        />
        {h && !problem && !checking && <Check size={18} className="absolute right-4 text-good" />}
      </span>
      <span className={`text-xs ${problem ? "text-bad" : "text-muted"}`}>
        {problem ?? (checking ? "Checking…" : h ? <>Customers find your store at <b className="text-ink">sotechy.shop/{h}</b></> : "Customers find your store with this, at sotechy.shop/your-store")}
      </span>
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
        <input
          name="referralCode"
          defaultValue={defaultValue ? cleanHandle(defaultValue) : undefined}
          onChange={(e) => (e.target.value = cleanHandle(e.target.value))}
          maxLength={20}
          autoFocus={!defaultValue}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          className={`${inputClass} pl-8`}
          placeholder="their.username"
        />
      </span>
    </Field>
  );
}

/** The 10 digits after +234: "0803 555 0142", "+234 803…" and "803-555-0142" all become "8035550142" */
function localDigits(raw: string) {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("234") && d.length > 10) d = d.slice(3);
  return d.replace(/^0/, "").slice(0, 10);
}
const spaced = (d: string) => [d.slice(0, 3), d.slice(3, 6), d.slice(6)].filter(Boolean).join(" ");
const validMobile = (d: string) => /^[789]\d{9}$/.test(d);

/** Nigerian mobile number with a fixed +234: digits only, 10 of them, starting with 7, 8 or 9 */
export function PhoneField({ name, label, required, hint, defaultValue }: { name: string; label: string; required?: boolean; hint?: string; defaultValue?: string | null }) {
  const [digits, setDigits] = useState(localDigits(defaultValue ?? ""));
  const [left, setLeft] = useState(false);
  const wrong = digits.length > 0 && !validMobile(digits);
  return (
    <Field label={label} required={required} hint={left && wrong ? undefined : hint}>
      <span
        className={`flex items-stretch overflow-hidden rounded-2xl border bg-surface focus-within:ring-4 ${left && wrong ? "border-bad focus-within:ring-bad/15" : "border-line focus-within:border-ink focus-within:ring-brand/15"}`}
      >
        <span className="flex shrink-0 items-center whitespace-nowrap border-r border-line bg-surface-alt px-3 text-[15px] font-semibold text-ink-2">+234</span>
        <input
          value={spaced(digits)}
          onChange={(e) => setDigits(localDigits(e.target.value))}
          onBlur={() => setLeft(true)}
          required={required}
          // The browser won't submit until it's a real Nigerian mobile number
          pattern="[789][0-9]{2} [0-9]{3} [0-9]{4}"
          title="A Nigerian mobile number, like 803 555 0142"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          className="min-h-12 w-full min-w-0 bg-transparent px-3 text-[15px] tracking-wide text-ink outline-none placeholder:text-faint"
          placeholder="803 555 0142"
        />
      </span>
      <input type="hidden" name={name} value={digits ? `+234${digits}` : ""} />
      {left && wrong && (
        <span className="text-xs text-bad">
          {digits.length < 10 ? `That's ${digits.length} digits. Nigerian mobile numbers have 10 after +234.` : "Nigerian mobile numbers start with 7, 8 or 9 after +234."}
        </span>
      )}
    </Field>
  );
}
