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
/** `short` labels it "Why Sotechy?" where space is tight (the phone logo row) */
export function WhySell({ tone = "dark", className = "", short = false }: { tone?: "dark" | "light"; className?: string; short?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full py-1.5 pl-2 pr-3.5 text-sm font-semibold transition ${tone === "dark" ? "bg-white/10 text-sun hover:bg-white/15" : "bg-brand-soft text-brand-strong hover:bg-brand-soft/70"} ${className}`}
      >
        <Illo name="store" size={22} /> {short ? "Why Sotechy?" : "Why sell on Sotechy?"}
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
            <button type="button" onClick={() => setOpen(false)} className={`${btn.primary} mt-5 w-full`}>
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
