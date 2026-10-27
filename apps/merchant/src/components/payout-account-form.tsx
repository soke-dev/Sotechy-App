"use client";

// Where a store's payouts go: pick the bank, enter the account number, and the bank tells us the name on
// the account. Payouts go out by themselves only to an account in the business's or the owner's name.
import { AlertTriangle, Check, ChevronDown, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { Bank, PayoutAccount } from "@sotechy/shared";
import { listBanks, savePayoutAccount } from "@/lib/market-actions";
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

export function PayoutAccountForm({ saved, onSaved }: { saved: SavedAccount | null; onSaved?: (a: PayoutAccount) => void }) {
  const router = useRouter();
  const [banks, setBanks] = useState<Bank[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bank, setBank] = useState<Bank | null>(saved?.bankCode && saved.bankName ? { code: saved.bankCode, name: saved.bankName } : null);
  const [accountNumber, setAccountNumber] = useState(saved?.accountNumber ?? "");
  const [result, setResult] = useState<SavedAccount | null>(saved?.accountName ? saved : null);
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();

  useEffect(() => {
    listBanks().then((r) => ("ok" in r ? setBanks(r.ok) : setLoadError(r.error)));
  }, []);

  const unchanged = !!result && result.bankCode === bank?.code && result.accountNumber === accountNumber;
  const ready = !!bank && accountNumber.length === 10 && !unchanged;
  const check = () =>
    start(async () => {
      if (!bank) return;
      setError(null);
      const r = await savePayoutAccount({ bankCode: bank.code, accountNumber });
      if ("error" in r) return setError(r.error);
      setResult({ bankCode: r.ok.bankCode, bankName: r.ok.bankName, accountNumber: r.ok.accountNumber, accountName: r.ok.accountName, match: r.ok.match });
      onSaved?.(r.ok);
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-4">
      <Field label="Bank" required>
        {loadError ? (
          <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{loadError}</p>
        ) : (
          <BankPicker banks={banks} value={bank} onChange={(b) => setBank(b)} />
        )}
      </Field>
      <Field label="Account number" required>
        <input
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
          inputMode="numeric"
          autoComplete="off"
          className={`${inputClass} font-mono tracking-wider`}
          placeholder="10 digits"
        />
      </Field>

      {error && <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}

      {result && unchanged && (
        <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface-alt p-4">
          <Illo name="bank" size={44} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{result.accountName}</p>
            <p className="text-sm text-muted">
              {result.bankName} · ••••{result.accountNumber?.slice(-4)}
            </p>
            {result.match ? (
              <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-good">
                <Check size={15} /> {MATCH[result.match]}
              </p>
            ) : (
              <p className="mt-1 flex items-start gap-1.5 text-sm text-warn">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" /> This name doesn&apos;t match your business or your own name, so Sotechy checks it before sending you anything.
              </p>
            )}
          </div>
        </div>
      )}

      {!unchanged && (
        <button type="button" disabled={!ready || saving} onClick={check} className={btn.dark}>
          {saving ? "Checking with your bank…" : result ? "Check and use this account" : "Check and save account"}
        </button>
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
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (banks ?? []).filter((b) => !term || b.name.toLowerCase().includes(term)).slice(0, 60);
  }, [banks, q]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button type="button" disabled={!banks} onClick={() => setOpen(!open)} className={`${inputClass} flex items-center justify-between text-left disabled:opacity-60`} aria-haspopup="listbox" aria-expanded={open}>
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
            {shown.map((b) => (
              <li key={b.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value?.code === b.code}
                  onClick={() => {
                    onChange(b);
                    setOpen(false);
                    setQ("");
                  }}
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
