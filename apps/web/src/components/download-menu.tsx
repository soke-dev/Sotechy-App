"use client";
// The header's Download button: a small menu with the App Store (out now) and Google Play (coming soon)
import { useEffect, useRef, useState } from "react";
import { APP_STORE_URL, AppleLogo, PlayLogo } from "./store-logos";

export function DownloadMenu() {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className="pop inline-flex h-11 items-center rounded-full border-2 border-foreground bg-brand px-5 text-[15px] font-bold text-foreground"
      >
        Get the app
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[248px] rounded-2xl border border-line bg-white p-1.5 shadow-[0_24px_50px_-20px_rgba(23,18,14,0.35)]">
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-brand-soft"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground text-white">
              <AppleLogo size={20} />
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block text-[11px] font-medium text-muted">Download on the</span>
              <span className="block font-display text-base font-bold">App Store</span>
            </span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-muted">
              <path d="M7 17 17 7M8 7h9v9" />
            </svg>
          </a>
          <div aria-disabled className="flex cursor-default items-center gap-3 rounded-xl px-3 py-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f2ede6]">
              <PlayLogo size={20} />
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block text-[11px] font-medium text-muted">Coming soon on</span>
              <span className="block font-display text-base font-bold text-ink-2">Google Play</span>
            </span>
            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-strong">Soon</span>
          </div>
        </div>
      )}
    </div>
  );
}
