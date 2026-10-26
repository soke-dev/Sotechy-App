"use client";

// Filter, sort and search controls that live in the URL, so server pages can read them
// and a filtered list can be shared or reloaded.
import { ChevronDown, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";

function useSetParam() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
}

/** A pill-shaped dropdown, e.g. Sort: Newest first */
export function UrlSelect({ param, label, options }: { param: string; label: string; options: { value: string; label: string }[] }) {
  const params = useSearchParams();
  const set = useSetParam();
  const value = params.get(param) ?? "";
  const active = value !== "" && value !== options[0]?.value;
  return (
    <label className={`relative inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border pl-4 pr-9 text-sm font-semibold ${active ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink-2"}`}>
      <span className={active ? "text-white/60" : "text-muted"}>{label}:</span>
      {options.find((o) => o.value === value)?.label ?? options[0]?.label}
      <ChevronDown size={15} className="pointer-events-none absolute right-3.5" />
      <select value={value} onChange={(e) => set(param, e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label={label}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

/** Search box that updates the URL as you type (after a short pause) */
export function UrlSearch({ param = "q", placeholder }: { param?: string; placeholder: string }) {
  const params = useSearchParams();
  const set = useSetParam();
  const [value, setValue] = useState(params.get(param) ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const change = (v: string) => {
    setValue(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => set(param, v.trim()), 350);
  };
  return (
    <label className="flex h-11 w-full items-center gap-2 rounded-full border border-line bg-surface px-4 focus-within:border-ink sm:w-72">
      <Search size={16} className="text-muted" />
      <input value={value} onChange={(e) => change(e.target.value)} placeholder={placeholder} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
      {value && (
        <button type="button" onClick={() => change("")} aria-label="Clear search" className="text-muted hover:text-ink">
          <X size={15} />
        </button>
      )}
    </label>
  );
}
