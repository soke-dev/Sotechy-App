"use client";

// What customers see next to the store's name, by how it sells: a registered business is an "Official store"
// with the orange tick; a freelancer gets the blue tick.
import { BadgeCheck, HelpCircle } from "lucide-react";
import { useState } from "react";

export function BadgeHint() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-brand-strong hover:underline">
        <HelpCircle size={15} /> Which badge will I get?
      </button>
      {open && (
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 text-sm">
          <div className="flex items-start gap-3">
            <BadgeCheck size={22} className="shrink-0 fill-[#F7931E] text-white" />
            <span>
              <span className="block font-semibold">Registered business: orange badge</span>
              <span className="text-muted">Once Sotechy checks your business documents, customers see the orange tick and “Official store” on your store.</span>
            </span>
          </div>
          <div className="flex items-start gap-3">
            <BadgeCheck size={22} className="shrink-0 fill-[#2F6FB3] text-white" />
            <span>
              <span className="block font-semibold">Freelancer or individual: blue badge</span>
              <span className="text-muted">Once Sotechy checks your ID, customers see the blue tick and “Verified” on your store.</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
