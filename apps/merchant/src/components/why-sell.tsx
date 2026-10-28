"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { Illo, type IlloName } from "./illustrations";
import { btn } from "./ui";

// The store token comes last: it's the reason customers keep coming back
const GAINS: { illo: IlloName; title: string; body: string }[] = [
  { illo: "store", title: "Your own storefront", body: "Your brand, colours and products inside the Sotechy app, with the verified badge shoppers look for." },
  {
    illo: "search",
    title: "Customers from every angle",
    body: "Shoppers find you through search, categories, deals and featured spots, and customers of other stores come to you too, because they earn on every order.",
  },
  {
    illo: "sparkle",
    title: "Room to grow",
    body: "We hand-pick and review every store, and keep too many stores selling the same thing in the same area from crowding each other out. More eyes stay on yours.",
  },
  {
    illo: "bag",
    title: "Sell anything",
    body: "Gadgets, fashion, beauty, food, home goods, crafts and more. If it's legal and you can deliver it, you can sell it on Sotechy.",
  },
  {
    illo: "shield",
    title: "Fast, protected payouts",
    body: "You're paid quickly, and every payment is handled by Sotechy. That protects you and the customer, so shoppers trust you from the first order.",
  },
  {
    illo: "home",
    title: "Everything in one dashboard",
    body: "Orders, customer notifications, price offers, promo codes, delivery areas and pickup points, payouts and featuring. Walk-in sales in your own shop are supported too.",
  },
  {
    illo: "coin",
    title: "Your own store token",
    body: "Customers earn your token on every order and can only spend it with you, so they come back. Holding it is a bragging right that makes them feel part of your business. It costs you nothing extra.",
  },
];

/** "Why sell on Sotechy?": what a store gains, and what the fee pays for */
/** Sotechy's official WhatsApp, for questions from would-be sellers */
const SOTECHY_WHATSAPP = "2348071473936";
const LEARN_MORE = `https://wa.me/${SOTECHY_WHATSAPP}?text=${encodeURIComponent("Hi Sotechy, I want to sell on Sotechy and I have a question.")}`;

function WhatsAppIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden className="text-[#25D366]" fill="currentColor">
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.75-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35M12.05 21.5h-.01a9.43 9.43 0 0 1-4.8-1.32l-.35-.2-3.57.93.95-3.48-.22-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.24-9.44 9.45-9.44 2.52 0 4.89.99 6.67 2.77a9.37 9.37 0 0 1 2.76 6.68c0 5.21-4.24 9.44-9.44 9.44m8.04-17.48A11.3 11.3 0 0 0 12.05.7C5.78.7.68 5.8.68 12.06c0 2 .52 3.96 1.52 5.68L.58 23.3l5.7-1.5a11.33 11.33 0 0 0 5.77 1.47h.01c6.26 0 11.36-5.1 11.36-11.36 0-3.04-1.18-5.89-3.33-8.04" />
    </svg>
  );
}

export function WhySell({ tone = "dark", className = "" }: { tone?: "dark" | "light"; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full py-1.5 pl-2 pr-3 text-[13px] font-semibold transition sm:text-sm ${tone === "dark" ? "bg-white/10 text-sun hover:bg-white/15" : "bg-brand-soft text-brand-strong hover:bg-brand-soft/70"} ${className}`}
      >
        <Illo name="store" size={20} /> Why sell on Sotechy?
      </button>
      {open && (
        <div className="backdrop-anim fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={() => setOpen(false)}>
          <div role="dialog" aria-label="Why sell on Sotechy?" onClick={(e) => e.stopPropagation()} className="sheet-anim max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-surface p-6 text-ink sm:rounded-3xl">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-extrabold">Why sell on Sotechy?</h2>
                <p className="mt-1 text-sm text-muted">What you get, and what our fee pays for.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-alt">
                <X size={17} />
              </button>
            </div>

            <ul className="flex flex-col gap-3">
              {GAINS.map((g) => (
                <li key={g.title} className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft">
                    <Illo name={g.illo} size={28} />
                  </span>
                  <div>
                    <p className="font-semibold">{g.title}</p>
                    <p className="text-sm text-ink-2">{g.body}</p>
                  </div>
                </li>
              ))}
            </ul>

            {/* The fee, and where it goes (no figures here: just that it's small and what it pays for) */}
            <div className="mt-6 rounded-2xl bg-surface-alt p-4">
              <p className="font-semibold">A small fee, only when you sell</p>
              <p className="mt-1 text-sm text-ink-2">Opening a store is free, with no monthly fee. A small fee comes out of each sale, and here&apos;s where it goes:</p>
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                <li className="flex gap-2">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                  <span>
                    <b>Half backs your token.</b> It goes into a reserve that pays you in naira whenever a customer spends your tokens, so a token sale never costs you.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ink" />
                  <span>
                    <b>The rest runs Sotechy:</b> safe payments, the app, checking every store, customer support and bringing shoppers to you.
                  </span>
                </li>
              </ul>
            </div>

            <p className="mt-4 text-xs text-muted">Tokens are rewards, not money or an investment. Customers can&apos;t cash them out.</p>
            <div className="mt-5 flex gap-2">
              <a href={LEARN_MORE} target="_blank" rel="noopener noreferrer" className={`${btn.outline} flex-1`}>
                <WhatsAppIcon /> Learn more
              </a>
              <button type="button" onClick={() => setOpen(false)} className={`${btn.primary} flex-1`}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
