"use client";

// Paying to have the store featured: shown first on the Sotechy app's Home, in Shop and in Stores.
// The monthly price and how many stores can be featured at once are set by Sotechy.
import { Check, CreditCard } from "lucide-react";
import { useState, useTransition } from "react";
import type { IlloName } from "@/components/illustrations";
import { useAccount } from "@/components/account-context";
import { btn, Card, PageHeader, Pill, StatCard } from "@/components/ui";
import { buyFeaturing } from "@/lib/market-actions";
import { formatNaira } from "@/lib/money";

export interface Featuring {
  pricePerMonth: number;
  maxStores: number;
  spotsLeft: number;
  featuredUntil: string | null;
  purchases: { id: string; months: number; amount: number; paidAt: string | null; until: string | null }[];
}

const DAY = 86_400_000;
const BENEFITS: { illo: IlloName; title: string; text: string }[] = [
  { illo: "home", title: "Top of Home", text: "Your store leads the “Stores on Sotechy” row on the app's Home." },
  { illo: "bag", title: "First in Shop", text: "Your products lead the Shop grid and the store product rows." },
  { illo: "store", title: "First in Stores", text: "You're listed at the top of the Stores tab, with a Featured label." },
  { illo: "sparkle", title: "Featured label", text: "A gold ★ Featured tag on your store and products everywhere they appear." },
];
const fmtDate = (d: string | number) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(d));

export function FeaturedView({ data, justPaid }: { data: Featuring; justPaid: boolean }) {
  const { store } = useAccount();
  const [months, setMonths] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const [now] = useState(() => Date.now());
  const until = data.featuredUntil ? new Date(data.featuredUntil).getTime() : null;
  const active = until !== null && until > now;
  const daysLeft = active ? Math.ceil((until! - now) / DAY) : 0;
  const total = data.pricePerMonth * months;
  const newUntil = (active ? until! : now) + months * 30 * DAY;
  const full = !active && data.spotsLeft === 0;
  const approved = store.status === "approved";

  const pay = () =>
    start(async () => {
      setError(null);
      const r = await buyFeaturing(months);
      if ("error" in r) return setError(r.error);
      window.location.href = r.ok.checkoutUrl;
    });

  return (
    <>
      <PageHeader illo="sparkle" title="Get featured" description="Pay to be shown first in the Sotechy app: on Home, in Shop and in the Stores tab, with a Featured label." />
      {justPaid && (
        <p className="mb-4 flex items-center gap-2 rounded-2xl bg-good-soft px-4 py-3 text-sm font-semibold text-good">
          <Check size={16} /> Thanks! Your feature starts as soon as Money Moves confirms the payment, usually within a minute.
        </p>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1">
        <StatCard accent illo="sparkle" label="Status" value={active ? "Featured" : "Not featured"} hint={active ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left, until ${fmtDate(until!)}` : "Shown in normal order"} />
        <StatCard illo="wallet" label="Price a month" value={formatNaira(data.pricePerMonth)} hint="Set by Sotechy" />
        <StatCard illo="store" label="Spots left" value={`${data.spotsLeft} of ${data.maxStores}`} hint="Stores featured at once" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card title={active ? "Add more time" : "Feature your store"} description={active ? "Extra months start when your current feature ends." : "Starts as soon as your payment is confirmed."}>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((m) => (
                <button key={m} type="button" onClick={() => setMonths(m)} className={`rounded-2xl border p-3 text-left transition ${months === m ? "border-ink ring-1 ring-ink" : "border-line hover:border-faint"}`}>
                  <span className="block font-semibold">
                    {m} month{m === 1 ? "" : "s"}
                  </span>
                  <span className="block text-sm text-muted">{formatNaira(data.pricePerMonth * m)}</span>
                </button>
              ))}
            </div>
            <p className="text-sm text-muted">Featured until {fmtDate(newUntil)}</p>
            {error && <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}
            <button disabled={busy || full || !approved} onClick={pay} className={btn.primary}>
              <CreditCard size={16} /> {busy ? "Opening payment…" : `Pay ${formatNaira(total)}`}
            </button>
            {!approved && <p className="text-xs text-warn">You can be featured once Sotechy approves your store.</p>}
            {full && <p className="text-xs text-warn">All featured spots are taken right now. A spot opens when another store&apos;s feature ends.</p>}
            <p className="text-xs text-muted">Paid securely through Money Moves. Not refundable once it starts.</p>
          </div>
        </Card>

        <Card title="What you get">
          <ul className="flex flex-col gap-3">
            {BENEFITS.map((b) => (
              <li key={b.title} className="flex gap-3">
                <Check size={18} className="mt-0.5 shrink-0 text-good" />
                <span>
                  <span className="block font-semibold">{b.title}</span>
                  <span className="block text-sm text-muted">{b.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-6" title="Payments">
        {data.purchases.length ? (
          <ul className="flex flex-col divide-y divide-line">
            {data.purchases.map((h) => (
              <li key={h.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">
                    {h.months} month{h.months === 1 ? "" : "s"} featured
                  </span>
                  <span className="text-sm text-muted">
                    Paid {h.paidAt ? fmtDate(h.paidAt) : ""}
                    {h.until ? ` · until ${fmtDate(h.until)}` : ""}
                  </span>
                </span>
                <span className="font-display font-bold">{formatNaira(h.amount)}</span>
                <Pill tone="good">Paid</Pill>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No payments yet.</p>
        )}
      </Card>
    </>
  );
}
