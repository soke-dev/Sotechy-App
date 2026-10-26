"use client";

// Paid featured placement: set the monthly price merchants pay, and see who's featured.
import { Check, X } from "lucide-react";
import { useState } from "react";
import { formatNaira } from "@sotechy/shared";
import { MerchantAvatar } from "@/components/merchant-bits";
import { RelTime } from "@/components/rel-time";
import { buttonClass, Card, dangerButtonClass, Field, inputClass, PageHeader, Pill, SampleBadge, secondaryButtonClass, StatCard } from "@/components/ui";
import { featuring, merchants } from "@/lib/marketplace";

const DAY = 86_400_000;
const fmtDate = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(iso));

export default function FeaturedStoresPage() {
  const [price, setPrice] = useState(featuring.pricePerMonth);
  const [savedPrice, setSavedPrice] = useState(featuring.pricePerMonth);
  const [slots, setSlots] = useState(featuring.maxStores);
  const [savedSlots, setSavedSlots] = useState(featuring.maxStores);
  const [list, setList] = useState(featuring.stores);
  const [now] = useState(() => Date.now());
  const changed = price !== savedPrice || slots !== savedSlots;

  return (
    <>
      <PageHeader
        illo="sparkle"
        title="Featured stores"
        badge={<SampleBadge />}
        description="Merchants pay to be shown first in the app: on Home, in Shop and in the Stores tab, with a Featured label. Set the price here."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard illo="sparkle" tone="brand" label="Featured now" value={`${list.length} of ${savedSlots}`} hint="Slots in use" />
        <StatCard illo="wallet" label="Price a month" value={formatNaira(savedPrice)} hint="Per store" />
        <StatCard illo="coin" tone="good" label="Earned this month" value={formatNaira(featuring.revenueThisMonth)} hint="From featured placements" />
        <StatCard illo="store" label="Can buy a slot" value={Math.max(0, savedSlots - list.length)} hint="Open slots" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.5fr]">
        <Card title="Price and slots" description="New purchases use these. Stores already featured keep what they paid for.">
          <div className="flex flex-col gap-4">
            <Field label="Price per month (₦)">
              <input type="number" min={0} step={500} value={price} onChange={(e) => setPrice(Number(e.target.value))} className={`${inputClass} w-full`} />
            </Field>
            <div className="flex flex-wrap gap-1.5">
              {[2_000, 5_000, 10_000, 20_000].map((p) => (
                <button key={p} onClick={() => setPrice(p)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${price === p ? "border-ink bg-ink text-white" : "border-line bg-surface hover:border-faint"}`}>
                  {formatNaira(p)}
                </button>
              ))}
            </div>
            <Field label="Most stores featured at once" hint="Fewer slots keep featured stores special.">
              <input type="number" min={1} max={50} value={slots} onChange={(e) => setSlots(Number(e.target.value))} className={`${inputClass} w-full`} />
            </Field>
            {changed ? (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setPrice(savedPrice);
                    setSlots(savedSlots);
                  }}
                  className={`${secondaryButtonClass} flex-1`}
                >
                  Undo
                </button>
                <button
                  onClick={() => {
                    featuring.pricePerMonth = price;
                    featuring.maxStores = slots;
                    setSavedPrice(price);
                    setSavedSlots(slots);
                  }}
                  className={`${buttonClass} flex-1`}
                >
                  Save
                </button>
              </div>
            ) : (
              <p className="flex items-center gap-2 text-sm text-good">
                <Check size={16} /> {formatNaira(savedPrice)} a month, {savedSlots} slots
              </p>
            )}
          </div>
        </Card>

        <Card title="Featured now" padded={false}>
          <ul className="flex flex-col divide-y divide-line px-5 pb-5">
            {list.map((f) => {
              const m = merchants.find((x) => x.id === f.merchantId);
              if (!m) return null;
              const days = Math.ceil((new Date(f.until).getTime() - now) / DAY);
              return (
                <li key={f.merchantId} className="flex items-center gap-3 py-3">
                  <MerchantAvatar m={m} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{m.name}</span>
                    <span className="block text-xs text-muted">
                      Since <RelTime iso={f.since} /> · until {fmtDate(f.until)} · paid {formatNaira(f.paid)}
                    </span>
                  </span>
                  <Pill tone={days <= 7 ? "warn" : "good"}>{days} days left</Pill>
                  <button onClick={() => setList(list.filter((x) => x.merchantId !== f.merchantId))} aria-label={`End ${m.name}'s feature`} title="End early" className={`${dangerButtonClass} min-h-9 px-3`}>
                    <X size={14} />
                  </button>
                </li>
              );
            })}
            {list.length === 0 && <li className="py-6 text-center text-sm text-muted">No stores featured right now.</li>}
          </ul>
        </Card>
      </div>
    </>
  );
}
