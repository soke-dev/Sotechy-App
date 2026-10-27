"use client";

import { Check, ChevronDown, Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { STORE_KINDS } from "@/lib/categories";
import { inputClass } from "./ui";

const MAX = 3;

/** What a store sells: a dropdown to search and tick up to 3, or type your own under "Something else". */
export function SellsPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [own, setOwn] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const listId = useId();
  const full = value.length >= MAX;
  const q = query.trim().toLowerCase();
  const shown = STORE_KINDS.filter((k) => !q || k.toLowerCase().includes(q));

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const toggle = (k: string) => onChange(value.includes(k) ? value.filter((v) => v !== k) : full ? value : [...value, k]);
  const addOwn = () => {
    const text = own.trim().slice(0, 40);
    if (!text || full || value.some((v) => v.toLowerCase() === text.toLowerCase())) return;
    onChange([...value, text]);
    setOwn("");
  };

  return (
    <div ref={box} className="relative">
      <div
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") && (e.preventDefault(), setOpen(true))}
        className={`${inputClass} flex min-h-12 cursor-pointer flex-wrap items-center gap-1.5 py-2`}
      >
        {value.length === 0 && <span className="text-faint">Choose up to {MAX}</span>}
        {value.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full bg-surface-alt py-1 pl-3 pr-1.5 text-sm font-medium">
            {v}
            <button
              type="button"
              aria-label={`Remove ${v}`}
              onClick={(e) => {
                e.stopPropagation();
                onChange(value.filter((x) => x !== v));
              }}
              className="flex h-5 w-5 items-center justify-center rounded-full text-muted hover:bg-line hover:text-ink"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <ChevronDown size={17} className="ml-auto text-muted" />
      </div>

      {open && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_18px_40px_-18px_rgba(23,18,14,0.35)]">
          <label className="flex items-center gap-2 border-b border-line px-4 py-3">
            <Search size={16} className="text-muted" />
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search, e.g. phones, hair, food" className="w-full bg-transparent text-sm outline-none" />
          </label>
          <ul id={listId} role="listbox" aria-multiselectable className="max-h-64 overflow-y-auto py-1">
            {shown.map((k) => {
              const on = value.includes(k);
              return (
                <li key={k}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={on}
                    disabled={!on && full}
                    onClick={() => toggle(k)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-surface-alt disabled:opacity-40"
                  >
                    <span className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border ${on ? "border-ink bg-ink text-white" : "border-line"}`}>{on && <Check size={12} strokeWidth={3} />}</span>
                    {k}
                  </button>
                </li>
              );
            })}
            {!shown.length && <li className="px-4 py-3 text-sm text-muted">Nothing matches &ldquo;{query}&rdquo;. Add it below.</li>}
          </ul>
          <div className="flex items-center gap-2 border-t border-line bg-surface-alt px-3 py-2.5">
            <input
              value={own}
              maxLength={40}
              disabled={full}
              onChange={(e) => setOwn(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addOwn())}
              placeholder={full ? `You've picked ${MAX}` : "Something else? Type it, e.g. Ankara fabrics"}
              className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-ink disabled:opacity-50"
            />
            <button type="button" disabled={!own.trim() || full} onClick={addOwn} className="rounded-xl bg-ink px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">
              Add
            </button>
          </div>
        </div>
      )}
      <p className="mt-1.5 text-xs text-muted">
        {value.length} of {MAX} chosen. It helps shoppers find your store.
      </p>
    </div>
  );
}
