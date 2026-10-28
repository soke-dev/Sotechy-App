import type { ReactNode } from "react";
import { Illo, type IlloName } from "./illustrations";
import { WhySell } from "./why-sell";

const PERKS: { illo: IlloName; title: string; body: string }[] = [
  { illo: "store", title: "Your own storefront", body: "Your brand, your colours, your products, inside the Sotechy app." },
  { illo: "coin", title: "Your own token", body: "Customers earn your $TOKEN on every order and come back to spend it." },
  { illo: "shield", title: "Verified stores only", body: "Every store is checked by Sotechy, so shoppers buy with confidence." },
];

/** A page heading with "Why sell on Sotechy?" beside it on computers (phones show it by the logo) */
export function AuthHeading({ children, whySell = true }: { children: ReactNode; whySell?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <h2 className="text-3xl font-extrabold">{children}</h2>
      {whySell && (
        <span className="mt-1 hidden lg:block">
          <WhySell tone="light" />
        </span>
      )}
    </div>
  );
}

/** Two-panel frame for sign-in, sign-up and invitations. */
export function AuthFrame({ children, whySell = true }: { children: ReactNode; whySell?: boolean }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-panel p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="relative flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/light-logo-small.png" alt="SoTechy" className="h-10" />
          <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sun">Merchant</span>
        </div>
        <div className="relative">
          <h1 className="max-w-md text-5xl font-extrabold leading-[1.05]">Sell on Sotechy.</h1>
          <p className="mt-3 max-w-md text-lg text-white/70">Open your store and reward every customer with your own token.</p>
          <ul className="mt-10 flex max-w-md flex-col gap-5">
            {PERKS.map((p) => (
              <li key={p.title} className="flex items-start gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                  <Illo name={p.illo} size={36} />
                </span>
                <div>
                  <p className="font-display text-lg font-bold">{p.title}</p>
                  <p className="text-sm text-white/65">{p.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/40">Businesses and freelancers welcome. Every merchant is verified by Sotechy.</p>
      </aside>
      <div className="flex items-start justify-center p-6 sm:p-10 lg:items-center">
        <div className="w-full max-w-md">
          {/* Phones: logo, with "Why sell on Sotechy?" on the same row */}
          <div className="mb-10 flex flex-wrap items-center justify-between gap-x-3 gap-y-3 lg:hidden">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/light-logo-small.png" alt="SoTechy" className="h-8" />
              <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-strong">Merchant</span>
            </div>
            {whySell && <WhySell tone="light" />}
          </div>
          {children}
        </div>
      </div>
    </main>
  );
}
