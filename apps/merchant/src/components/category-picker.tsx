"use client";

import { Check, ChevronDown, PenLine, Search } from "lucide-react";
import { useState } from "react";
import { inputClass } from "./ui";
import { Sheet } from "./zone-form";
import { CATEGORY_GROUPS, isStandardCategory } from "@/lib/categories";

/**
 * Searchable category list. "Other" lets the merchant name their own category,
 * which then shows as a category on their storefront like any other.
 */
export function CategoryPicker({ value, onChange, yours = [] }: { value: string; onChange: (c: string) => void; yours?: string[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [custom, setCustom] = useState(value && !isStandardCategory(value) ? value : "");
  const [typing, setTyping] = useState(false);

  const q = query.trim().toLowerCase();
  const matches = (s: string) => s.toLowerCase().includes(q);
  const groups = [
    ...(yours.length ? [{ group: "Your categories", items: yours }] : []),
    ...CATEGORY_GROUPS,
  ]
    .map((g) => ({ group: g.group, items: q && !matches(g.group) ? g.items.filter(matches) : g.items }))
    .filter((g) => g.items.length);

  const pick = (c: string) => {
    onChange(c);
    setOpen(false);
    setQuery("");
    setTyping(false);
  };
  const close = () => {
    setOpen(false);
    setTyping(false);
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${inputClass} flex items-center justify-between gap-2 text-left`}>
        <span className={`truncate ${value ? "" : "text-faint"}`}>{value || "Choose a category"}</span>
        <ChevronDown size={17} className="shrink-0 text-muted" />
      </button>
      {value && !isStandardCategory(value) && <span className="text-xs text-muted">Your own category. It shows on your storefront for customers to browse.</span>}

      <Sheet open={open} onClose={close} title={typing ? "Name your category" : "Category"}>
        {typing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (custom.trim()) pick(custom.trim());
            }}
            className="flex flex-col gap-3"
          >
            <input autoFocus value={custom} onChange={(e) => setCustom(e.target.value)} maxLength={40} className={inputClass} placeholder="e.g. Phone repair tools" />
            <p className="text-sm text-muted">Customers will see this as a category on your storefront. Keep it short and clear.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setTyping(false)} className="min-h-12 flex-1 rounded-full border border-line font-semibold">Back</button>
              <button disabled={!custom.trim()} className="min-h-12 flex-1 rounded-full bg-inverse font-semibold text-on-inverse disabled:opacity-40">Use this category</button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <label className="flex min-h-12 items-center gap-2 rounded-2xl border border-line bg-surface px-4 focus-within:border-ink">
              <Search size={17} className="text-muted" />
              <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} className="min-w-0 flex-1 bg-transparent text-[15px] outline-none" placeholder="Search: lipstick, laptop, inverter…" />
            </label>

            <div className="-mx-2 flex max-h-[50vh] flex-col gap-4 overflow-y-auto px-2">
              {groups.map((g) => (
                <section key={g.group}>
                  <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted">{g.group}</p>
                  <div className="flex flex-wrap gap-2">
                    {g.items.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => pick(c)}
                        className={`inline-flex items-center gap-1 rounded-full border px-3.5 py-2 text-sm font-semibold transition ${value === c ? "border-inverse bg-inverse text-on-inverse" : "border-line hover:border-ink"}`}
                      >
                        {value === c && <Check size={14} />} {c}
                      </button>
                    ))}
                  </div>
                </section>
              ))}
              {groups.length === 0 && <p className="text-sm text-muted">No category called &ldquo;{query}&rdquo; yet.</p>}
            </div>

            <button
              type="button"
              onClick={() => {
                if (q && !custom) setCustom(query.trim());
                setTyping(true);
              }}
              className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-line p-3 text-left hover:border-brand"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft"><PenLine size={17} className="text-brand-strong" /></span>
              <span className="min-w-0">
                <span className="block font-semibold">Other</span>
                <span className="block text-xs text-muted">{q && groups.length === 0 ? `Use "${query.trim()}" as your own category` : "Not listed? Name your own category."}</span>
              </span>
            </button>
          </div>
        )}
      </Sheet>
    </>
  );
}
