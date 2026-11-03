"use client";

// Where a store's payouts go: pick the bank, enter the account number, and the bank tells us the name on
// the account. Payouts go out by themselves only to an account in the business's or the owner's name.
import { AlertTriangle, Check, ChevronDown, Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { Bank, PayoutAccount } from "@sotechy/shared";
import { listBanks, lookupPayoutAccount, savePayoutAccount } from "@/lib/market-actions";
import { Illo } from "./illustrations";
import { btn, Field, inputClass } from "./ui";

export interface SavedAccount {
  bankCode: string | null;
  bankName: string | null;
  accountNumber: string | null;
  accountName: string | null;
  match: "business" | "owner" | null;
}

const MATCH = { business: "Matches your business name", owner: "Matches your own name" } as const;

type Save = (input: { bankCode: string; accountNumber: string }) => Promise<{ ok: PayoutAccount } | { error: string }>;

/** `save`: where the account goes (setup's single account by default; Settings adds to the list instead).
 *  Picking a bank and typing the 10 digits asks the bank for the name; nothing is saved until you confirm it. */
export function PayoutAccountForm({ saved, onSaved, save = savePayoutAccount, submitLabel }: { saved: SavedAccount | null; onSaved?: (a: PayoutAccount) => void; save?: Save; submitLabel?: string }) {
  const router = useRouter();
  const [banks, setBanks] = useState<Bank[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bank, setBank] = useState<Bank | null>(saved?.bankCode && saved.bankName ? { code: saved.bankCode, name: saved.bankName } : null);
  const [accountNumber, setAccountNumber] = useState(saved?.accountNumber ?? "");
  // What's saved now, and the name the bank gave for what's typed (waiting for "Confirm")
  const [current, setCurrent] = useState<SavedAccount | null>(saved?.accountName ? saved : null);
  const [found, setFound] = useState<SavedAccount | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, start] = useTransition();

  useEffect(() => {
    listBanks().then((r) => ("ok" in r ? setBanks(r.ok) : setLoadError(r.error)));
  }, []);

  const same = (a: SavedAccount | null) => !!a && a.bankCode === bank?.code && a.accountNumber === accountNumber;
  const isSaved = same(current);
  const isFound = same(found);

  // Ask the bank as soon as a bank is picked and all 10 digits are in
  useEffect(() => {
    if (!bank || accountNumber.length !== 10 || isSaved || isFound) return;
    let live = true;
    const t = setTimeout(async () => {
      setChecking(true);
      setError(null);
      const r = await lookupPayoutAccount({ bankCode: bank.code, accountNumber });
      if (!live) return;
      setChecking(false);
      if ("error" in r) setError(r.error);
      else setFound(r.ok);
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [bank, accountNumber, isSaved, isFound]);

  const confirm = () =>
    start(async () => {
      if (!bank) return;
      setError(null);
      const r = await save({ bankCode: bank.code, accountNumber });
      if ("error" in r) return setError(r.error);
      setCurrent({ bankCode: r.ok.bankCode, bankName: r.ok.bankName, accountNumber: r.ok.accountNumber, accountName: r.ok.accountName, match: r.ok.match });
      setFound(null);
      onSaved?.(r.ok);
      router.refresh();
    });
  const shown = isSaved ? current : isFound ? found : null;
  const waiting = !!bank && accountNumber.length === 10;

  return (
    <div className="flex flex-col gap-4">
      <Field label="Bank" required>
        {loadError ? (
          <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{loadError}</p>
        ) : (
          <BankPicker
            banks={banks}
            value={bank}
            onChange={(b) => {
              setBank(b);
              setError(null);
            }}
          />
        )}
      </Field>
      <Field label="Account number" required>
        <input
          value={accountNumber}
          onChange={(e) => {
            setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10));
            setError(null);
          }}
          inputMode="numeric"
          autoComplete="off"
          className={`${inputClass} font-mono tracking-wider`}
          placeholder="10 digits"
        />
      </Field>

      {checking && !shown && (
        <p className="flex items-center gap-2 rounded-2xl bg-surface-alt px-4 py-3 text-sm text-muted">
          <Loader2 size={16} className="animate-spin" /> Checking with your bank…
        </p>
      )}
      {error && <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}

      {shown && (
        <div className={`flex items-start gap-4 rounded-2xl border p-4 ${isSaved ? "border-line bg-surface-alt" : "border-ink bg-surface"}`}>
          <Illo name="bank" size={44} />
          <div className="min-w-0 flex-1">
            {!isSaved && <p className="text-xs font-semibold uppercase tracking-wide text-muted">Is this your account?</p>}
            <p className="break-words font-semibold">{shown.accountName}</p>
            <p className="text-sm text-muted">
              {shown.bankName} · ••••{shown.accountNumber?.slice(-4)}
            </p>
            {shown.match ? (
              <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-good">
                <Check size={15} /> {MATCH[shown.match]}
              </p>
            ) : (
              <p className="mt-1 flex items-start gap-1.5 text-sm text-warn">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" /> This name doesn&apos;t match your business or your own name. You can still use it: we&apos;ll review it before paying you.
              </p>
            )}
          </div>
        </div>
      )}

      {isFound && !isSaved && (
        <button type="button" disabled={saving} onClick={confirm} className={btn.dark}>
          {saving ? "Saving…" : (submitLabel ?? "Confirm and save account")}
        </button>
      )}
      {!shown && !checking && !error && !waiting && (
        <p className="text-sm text-muted">Pick your bank and type the 10-digit account number. We&apos;ll show you the name on it to confirm.</p>
      )}
      <p className="text-xs text-muted">We ask your bank for the name on the account. It should be your business name or your own name, as on your ID.</p>
    </div>
  );
}

/** A bank list you can type to search */
function BankPicker({ banks, value, onChange }: { banks: Bank[] | null; value: Bank | null; onChange: (b: Bank) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const box = useRef<HTMLDivElement>(null);
  // When a bank was last picked: the list closing moves this box under the finger, and the tap's own
  // follow-up click must not open the list again
  const pickedAt = useRef(0);
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (banks ?? []).filter((b) => !term || b.name.toLowerCase().includes(term)).slice(0, 60);
  }, [banks, q]);

  // Taps outside close it (touch and mouse)
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  const pick = (b: Bank, at: number) => {
    pickedAt.current = at;
    setOpen(false);
    setQ("");
    // Close the phone keyboard the search box opened
    (document.activeElement as HTMLElement | null)?.blur();
    onChange(b);
  };

  return (
    <div ref={box} className="relative">
      <button type="button" disabled={!banks} onClick={(e) => e.timeStamp - pickedAt.current > 600 && setOpen(!open)} className={`${inputClass} flex items-center justify-between text-left disabled:opacity-60`} aria-haspopup="listbox" aria-expanded={open}>
        <span className={value ? "" : "text-faint"}>{banks ? (value?.name ?? "Choose your bank") : "Loading banks…"}</span>
        <ChevronDown size={17} className="text-muted" />
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_18px_40px_-18px_rgba(23,18,14,0.35)]">
          <label className="flex items-center gap-2 border-b border-line px-4 py-3">
            <Search size={16} className="text-muted" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search banks" className="w-full bg-transparent text-sm outline-none" />
          </label>
          <ul role="listbox" className="max-h-64 overflow-y-auto">
            {shown.map((b, i) => (
              <li key={`${b.code}-${i}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value?.code === b.code}
                  onClick={(e) => pick(b, e.timeStamp)}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-surface-alt ${value?.code === b.code ? "font-semibold" : ""}`}
                >
                  {b.name}
                  {value?.code === b.code && <Check size={15} />}
                </button>
              </li>
            ))}
            {!shown.length && <li className="px-4 py-3 text-sm text-muted">No bank matches &ldquo;{q}&rdquo;</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
