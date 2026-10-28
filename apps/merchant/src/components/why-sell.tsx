"use client";

import { Sparkles, X } from "lucide-react";
import { useState } from "react";
import { DEFAULT_PAYOUT_SETTINGS, TOKEN_RULES } from "@sotechy/shared";
import { Illo, type IlloName } from "./illustrations";
import { btn } from "./ui";
import { formatNaira } from "@/lib/money";

const fee = DEFAULT_PAYOUT_SETTINGS.feeRate;
const pct = (n: number) => `${Math.round(n * 1000) / 10}%`;
const example = 100_000;

const GAINS: { illo: IlloName; title: string; body: string }[] = [
  { illo: "store", title: "Your own storefront", body: "Your brand, colours and products inside the Sotechy app, in front of shoppers looking for verified stores." },
  {
    illo: "coin",
    title: "Your own token",
    body: `Customers earn 1 of your tokens for every ₦1 they spend with you, and can only spend them at your store, so they come back. It costs you nothing extra.`,
  },
  {
    illo: "bank",
    title: "Paid fast",
    body: `${DEFAULT_PAYOUT_SETTINGS.standard.firstPercent}% (plus the delivery fee) when you accept an order, the rest when the customer confirms delivery, or ${DEFAULT_PAYOUT_SETTINGS.finalAfterHours / 24} days after you mark it delivered.`,
  },
  { illo: "bike", title: "Your delivery, your prices", body: "Set home delivery areas and up to 5 pickup points per area, each with its own price." },
  { illo: "tag", title: "Tools to sell more", body: "Price offers, promo codes, walk-in sales that still earn customers your token, and featured spots on the app." },
  { illo: "shield", title: "No monthly fee", body: "Opening a store is free. You only pay when you sell." },
];

/** "Why sell on Sotechy?": what a store gains, and what the fee pays for */
export function WhySell({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${tone === "dark" ? "bg-white/10 text-sun hover:bg-white/15" : "bg-brand-soft text-brand-strong hover:bg-brand-soft/70"}`}
      >
        <Sparkles size={15} /> Why sell on Sotechy?
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

            {/* The fee, and where it goes */}
            <div className="mt-6 rounded-2xl bg-surface-alt p-4">
              <p className="font-semibold">One fee: {pct(fee)} of each sale</p>
              <p className="mt-1 text-sm text-ink-2">It&apos;s taken from what you&apos;re paid, nothing up front. It&apos;s split in two:</p>
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                <li className="flex gap-2">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                  <span>
                    <b>{pct(fee * TOKEN_RULES.reserveShare)} backs your token.</b> It goes into a reserve that pays you in naira whenever a customer spends your tokens, so a token sale never costs you.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ink" />
                  <span>
                    <b>{pct(fee * (1 - TOKEN_RULES.reserveShare))} runs Sotechy:</b> payments, the app, checking every store, customer support and bringing shoppers to you.
                  </span>
                </li>
              </ul>
              <div className="mt-4 flex flex-col gap-1 border-t border-line pt-3 text-sm">
                <p className="flex justify-between"><span className="text-muted">On a {formatNaira(example)} sale</span><span /></p>
                <p className="flex justify-between"><span>Fee ({pct(fee)})</span><span>−{formatNaira(example * fee)}</span></p>
                <p className="flex justify-between font-semibold"><span>You receive</span><span>{formatNaira(example * (1 - fee))}</span></p>
              </div>
              <p className="mt-3 text-xs text-muted">Walk-in sales in your own shop: {pct(TOKEN_RULES.walkInFeeRate)}, and all of it backs your token. Sotechy keeps none.</p>
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
