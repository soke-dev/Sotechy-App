"use client";

import { Check, Search, X } from "lucide-react";
import { useState } from "react";
import { STORE_KINDS } from "@/lib/categories";
import { inputClass } from "./ui";

const MAX = 3;

/** What a store sells: search, pick up to 3, or choose "Other" and type it. */
export function SellsPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [query, setQuery] = useState("");
  const [otherOpen, setOtherOpen] = useState(value.some((v) => !STORE_KINDS.includes(v)));
  const custom = value.find((v) => !STORE_KINDS.includes(v)) ?? "";
  const picked = value.filter((v) => STORE_KINDS.includes(v));
  const q = query.trim().toLowerCase();
  const shown = STORE_KINDS.filter((k) => !q || k.toLowerCase().includes(q));
  const full = value.length >= MAX;

  const toggle = (k: string) => onChange(picked.includes(k) ? value.filter((v) => v !== k) : full ? value : [...value, k]);
  const setCustom = (text: string) => onChange([...picked, ...(text.trim() ? [text.slice(0, 40)] : [])]);

  return (
    <div className="flex flex-col gap-3">
      <span className="relative flex items-center">
        <Search size={17} className="pointer-events-none absolute left-4 text-muted" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} className={`${inputClass} pl-11`} placeholder="Search, e.g. phones, hair, food" />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-3 flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-alt">
            <X size={16} />
          </button>
        )}
      </span>
      <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto pr-1">
        {shown.map((k) => {
          const on = picked.includes(k);
          return (
            <button
              key={k}
              type="button"
              onClick={() => toggle(k)}
              disabled={!on && full}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition disabled:opacity-40 ${on ? "border-ink bg-ink font-semibold text-on-inverse" : "border-line bg-surface text-ink-2 hover:border-faint"}`}
            >
              {on && <Check size={14} />} {k}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            if (otherOpen) setCustom("");
            setOtherOpen(!otherOpen);
          }}
          disabled={!otherOpen && full}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition disabled:opacity-40 ${otherOpen ? "border-ink bg-ink font-semibold text-on-inverse" : "border-dashed border-faint text-ink-2 hover:border-ink"}`}
        >
          {otherOpen && <Check size={14} />} Other
        </button>
        {!shown.length && !otherOpen && <p className="text-sm text-muted">Nothing matches. Choose &ldquo;Other&rdquo; and type it.</p>}
      </div>
      {otherOpen && (
        <input value={custom} onChange={(e) => setCustom(e.target.value)} autoFocus maxLength={40} className={inputClass} placeholder="What do you sell? e.g. Phone repairs, Ankara fabrics" />
      )}
      <p className="text-xs text-muted">{value.length ? `${value.length} of ${MAX} chosen. ` : ""}Pick up to {MAX}. It helps shoppers find your store.</p>
    </div>
  );
}
