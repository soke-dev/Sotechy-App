"use client";

// An address field with suggestions while typing (Nigeria only). Picking one fills the whole address;
// "Enter your address manually" hides the list so anything can be typed.
import { MapPin } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { AddressSuggestion } from "@sotechy/shared";
import { suggestAddresses } from "@/lib/market-actions";
import { inputClass } from "./ui";

export function AddressInput({ value, onChange, placeholder, required }: { value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean }) {
  const [results, setResults] = useState<AddressSuggestion[]>([]);
  const [manual, setManual] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  // Only look up what was typed, not what a pick filled in
  const typed = useRef(false);
  const listId = useId();

  useEffect(() => {
    const q = value.trim();
    if (!typed.current || manual || q.length < 3) return;
    let live = true;
    // Wait for a pause in typing before asking
    const t = setTimeout(() => {
      suggestAddresses(q).then((r) => {
        if (!live) return;
        setResults(r);
        setActive(-1);
      });
    }, 350);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [value, manual]);

  const shown = open && !manual && value.trim().length >= 3 && results.length > 0;
  const pick = (s: AddressSuggestion) => {
    typed.current = false;
    setResults([]);
    onChange(s.label);
  };

  return (
    <div className="relative">
      <input
        value={value}
        required={required}
        placeholder={placeholder}
        autoComplete="street-address"
        role="combobox"
        aria-expanded={shown}
        aria-controls={listId}
        aria-autocomplete="list"
        onChange={(e) => {
          typed.current = true;
          setOpen(true);
          onChange(e.target.value);
        }}
        onFocus={() => setOpen(true)}
        // Leave time for a click on a suggestion to land
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!shown) return;
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => (e.key === "ArrowDown" ? Math.min(results.length - 1, i + 1) : Math.max(0, i - 1)));
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            pick(results[active]);
          } else if (e.key === "Escape") setOpen(false);
        }}
        className={inputClass}
      />
      {shown && (
        <div id={listId} role="listbox" className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_18px_40px_-18px_rgba(23,18,14,0.35)]">
          {results.map((s, i) => (
            <button
              key={s.label}
              type="button"
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(s)}
              className={`flex w-full items-start gap-2.5 border-b border-line px-4 py-3 text-left text-sm transition last:border-b-0 ${i === active ? "bg-surface-alt" : "hover:bg-surface-alt"}`}
            >
              <MapPin size={16} className="mt-0.5 shrink-0 text-muted" />
              <span>{s.label}</span>
            </button>
          ))}
          <div className="flex items-center justify-between gap-3 bg-surface-alt px-4 py-2.5 text-sm text-muted">
            <span>
              Can&apos;t see your address?{" "}
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setManual(true)} className="font-semibold text-brand-strong hover:underline">
                Enter your address manually
              </button>
            </span>
            <span className="shrink-0 text-[11px]">Powered by Geoapify</span>
          </div>
        </div>
      )}
    </div>
  );
}
