"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { NIGERIAN_STATES } from "@sotechy/shared";
import { inputClass } from "./ui";

/** A Nigerian state: our own dropdown with search, instead of the phone's long native list */
export function StatePicker({ value, onChange }: { value: string; onChange: (state: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const listId = useId();
  const q = query.trim().toLowerCase();
  const shown = NIGERIAN_STATES.filter((s) => !q || s.toLowerCase().includes(q));

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | TouchEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [open]);

  const pick = (s: string) => {
    onChange(s);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={box} className="relative">
      <button type="button" aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} onClick={() => setOpen(!open)} className={`${inputClass} flex items-center justify-between text-left`}>
        <span className={value ? "" : "text-faint"}>{value || "Choose a state"}</span>
        <ChevronDown size={17} className={`text-muted transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full z-20 mt-1.5 overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_12px_32px_rgba(23,18,14,0.14)]">
          <div className="flex items-center gap-2 border-b border-line px-3">
            <Search size={15} className="text-faint" />
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && shown[0] && (e.preventDefault(), pick(shown[0]))} placeholder="Search states" className="h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
          </div>
          <ul id={listId} role="listbox" className="max-h-64 overflow-y-auto py-1">
            {shown.map((s) => (
              <li key={s} role="option" aria-selected={s === value}>
                <button type="button" onClick={() => pick(s)} className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-[15px] hover:bg-surface-alt ${s === value ? "font-semibold" : ""}`}>
                  {s}
                  {s === value && <Check size={15} className="text-brand-strong" />}
                </button>
              </li>
            ))}
            {shown.length === 0 && <li className="px-4 py-3 text-sm text-muted">No state matches “{query}”</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
