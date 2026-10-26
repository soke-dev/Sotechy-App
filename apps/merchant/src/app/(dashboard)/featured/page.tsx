"use client";

// Paying to have the store featured: shown first on the Sotechy app's Home, in Shop and in Stores.
// The monthly price is set by Sotechy in admin (sample here until the backend exists).
import { Check, CreditCard, X } from "lucide-react";
import { useState } from "react";
import { Illo, type IlloName } from "@/components/illustrations";
import { btn, Card, PageHeader, Pill, StatCard } from "@/components/ui";
import { Sheet } from "@/components/zone-form";
import { formatNaira } from "@/lib/money";
import { featured, store } from "@/lib/mock";

const MONTHS = [1, 3, 6, 12];
const DAY = 86_400_000;

const BENEFITS: { illo: IlloName; title: string; text: string }[] = [
  { illo: "home", title: "Top of Home", text: "Your store leads the 'Stores on Sotechy' row on the app's Home." },
  { illo: "bag", title: "First in Shop", text: "Your products lead the Shop grid and the store product rows." },
  { illo: "store", title: "First in Stores", text: "You're listed at the top of the Stores tab, with a Featured label." },
  { illo: "sparkle", title: "Featured label", text: "A gold ★ Featured tag on your store and products everywhere they appear." },
];

const fmtDate = (ms: number) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(ms));

export default function FeaturedPage() {
  const [until, setUntil] = useState(featured.until);
  const [history, setHistory] = useState(featured.history);
  const [months, setMonths] = useState(1);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const active = until !== null && until > now;
  const total = featured.pricePerMonth * months;
  const daysLeft = active ? Math.ceil((until! - now) / DAY) : 0;
  const startFrom = active ? until! : now;
  const newUntil = startFrom + months * 30 * DAY;

  return (
    <>
      <PageHeader illo="sparkle" title="Get featured" description="Pay to be shown first in the Sotechy app: on Home, in Shop and in the Stores tab, with a Featured label." />

      {paid && (
        <p className="mb-4 flex items-center gap-2 rounded-2xl bg-good-soft px-4 py-3 text-sm font-semibold text-good">
          <Check size={16} /> {paid}
          <button onClick={() => setPaid(null)} aria-label="Dismiss" className="ml-auto">
            <X size={16} />
          </button>
        </p>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1">
        <StatCard accent illo="sparkle" label="Status" value={active ? "Featured" : "Not featured"} hint={active ? `${daysLeft} days left` : "Shown in normal order"} />
        <StatCard illo="wallet" label="Price a month" value={formatNaira(featured.pricePerMonth)} hint="Set by Sotechy" />
        <StatCard illo="user" label="Visits while featured" value={featured.visits.toLocaleString()} hint={`${featured.visitsLift} more than before`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card title={active ? "Add more time" : "Feature your store"} description={active ? "Extra months start when your current feature ends." : "Starts as soon as you pay."}>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-4 gap-2">
              {MONTHS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMonths(m)}
                  className={`flex flex-col items-center rounded-2xl border-2 px-2 py-3 transition ${months === m ? "border-brand bg-brand-soft" : "border-line hover:border-faint"}`}
                >
                  <span className="font-display text-xl font-bold">{m}</span>
                  <span className="text-xs text-muted">month{m === 1 ? "" : "s"}</span>
                </button>
              ))}
            </div>
            <div className="flex items-baseline justify-between rounded-2xl bg-surface-alt px-4 py-3">
              <span className="text-sm text-muted">
                {months} × {formatNaira(featured.pricePerMonth)}
                <br />
                Featured until {fmtDate(newUntil)}
              </span>
              <span className="font-display text-2xl font-extrabold">{formatNaira(total)}</span>
            </div>
            <button onClick={() => setPaying(true)} className={btn.primary}>
              <CreditCard size={16} /> Pay {formatNaira(total)}
            </button>
            <p className="text-xs text-muted">Paid through Money Moves: bank transfer, crypto or the Money Moves app. Not refundable once it starts.</p>
          </div>
        </Card>

        <Card title="What you get">
          <ul className="flex flex-col gap-4">
            {BENEFITS.map((b) => (
              <li key={b.title} className="flex gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft">
                  <Illo name={b.illo} size={28} />
                </span>
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
        {history.length ? (
          <ul className="flex flex-col divide-y divide-line">
            {history.map((h) => (
              <li key={h.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">
                    {h.months} month{h.months === 1 ? "" : "s"} featured
                  </span>
                  <span className="text-sm text-muted">
                    {fmtDate(h.from)} – {fmtDate(h.to)}
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

      <Sheet open={paying} onClose={() => setPaying(false)} title="Pay with Money Moves">
        <div className="flex flex-col gap-4 text-sm">
          <p>
            Feature <b>{store.name}</b> for {months} month{months === 1 ? "" : "s"}, until {fmtDate(newUntil)}.
          </p>
          <p className="font-display text-3xl font-extrabold">{formatNaira(total)}</p>
          <p className="rounded-2xl bg-surface-alt px-3 py-2.5 text-muted">Sample: this opens Money Moves checkout once payments for merchants are connected.</p>
          <button
            onClick={() => {
              setHistory([{ id: `f${Date.now()}`, months, from: startFrom, to: newUntil, amount: total }, ...history]);
              setUntil(newUntil);
              setPaying(false);
              setPaid(`Paid ${formatNaira(total)}. ${store.name} is featured until ${fmtDate(newUntil)}.`);
            }}
            className={btn.primary}
          >
            I&apos;ve paid {formatNaira(total)}
          </button>
        </div>
      </Sheet>
    </>
  );
}
