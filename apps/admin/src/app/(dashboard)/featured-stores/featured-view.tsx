"use client";

// Paid featuring, in two kinds: Featured, and Pro (featured plus the store's own dark row on Home). Prices and
// spots, who's featured now, payments, and featuring a store by hand.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatNaira } from "@sotechy/shared";
import { usePasswordPrompt } from "@/components/password-prompt";
import { buttonClass, Card, Field, inputClass, PageHeader, Pill, secondaryButtonClass, StatCard } from "@/components/ui";
import { StoreAvatar } from "../merchants/merchants-list";
import type { AdminStore } from "../merchants/store-types";
import { featureStore, saveFeaturingSettings } from "./actions";

export interface AdminFeaturing {
  settings: { pricePerMonth: number; maxStores: number; maxPerStore?: number; proPricePerMonth?: number; maxPro?: number };
  featured: { id: string; name: string; slug: string; ticker: string; logoUrl: string | null; featuredUntil: string; proUntil: string | null }[];
  purchases: { id: string; months: number; amount: number; tier?: "standard" | "pro"; paidAt: string | null; until: string | null; storeName: string; storeId: string }[];
  revenueThisMonth: number;
}

const fmtDate = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));

export function FeaturedView({ data, stores }: { data: AdminFeaturing; stores: AdminStore[] }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [price, setPrice] = useState(data.settings.pricePerMonth);
  const [slots, setSlots] = useState(data.settings.maxStores);
  const [perStore, setPerStore] = useState(data.settings.maxPerStore ?? 2);
  const [proPrice, setProPrice] = useState(data.settings.proPricePerMonth ?? 10_000);
  const [proSlots, setProSlots] = useState(data.settings.maxPro ?? 2);
  const [storeId, setStoreId] = useState("");
  const [days, setDays] = useState(30);
  const [handTier, setHandTier] = useState<"standard" | "pro">("standard");
  const { ask, prompt } = usePasswordPrompt();
  const changed =
    price !== data.settings.pricePerMonth ||
    slots !== data.settings.maxStores ||
    perStore !== (data.settings.maxPerStore ?? 2) ||
    proPrice !== (data.settings.proPricePerMonth ?? 10_000) ||
    proSlots !== (data.settings.maxPro ?? 2);
  const now = Date.now();
  const proNow = data.featured.filter((s) => s.proUntil && new Date(s.proUntil).getTime() > now);
  const maxPro = data.settings.maxPro ?? 2;

  const run = (title: string, fn: (password: string) => Promise<{ ok: true } | { error: string }>, after?: () => void) =>
    start(async () => {
      setError(null);
      const password = await ask(title);
      if (!password) return;
      const r = await fn(password);
      if ("error" in r) return setError(r.error);
      after?.();
      router.refresh();
    });

  return (
    <>
      {prompt}
      <PageHeader
        illo="sparkle"
        title="Featured stores"
        description="Featured: shown first in the app (Home, Shop, Stores) with a ★ and a Home banner. Pro: all of that plus the store's own dark row of products on Home."
      />
      {error && <p className="mb-5 rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard illo="sparkle" tone="brand" label="Featured now" value={`${data.featured.length} of ${data.settings.maxStores}`} hint="Spots in use" />
        <StatCard illo="wallet" label="Price a month" value={formatNaira(data.settings.pricePerMonth)} hint="Per store" />
        <StatCard illo="coin" tone="good" label="Earned this month" value={formatNaira(data.revenueThisMonth)} hint="From featuring" />
        <StatCard illo="store" label="Pro now" value={`${proNow.length} of ${maxPro}`} hint={`${Math.max(0, data.settings.maxStores - data.featured.length)} featured spots open`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.5fr]">
        <div className="flex flex-col gap-6">
          <Card title="Price and spots" description="New purchases use these. Stores already featured keep what they paid for.">
            <div className="flex flex-col gap-4">
              <Field label="Price per month (₦)">
                <input type="number" min={0} step={500} value={price} onChange={(e) => setPrice(Math.max(0, Number(e.target.value)))} className={`${inputClass} w-full`} />
              </Field>
              <Field label="Most stores featured at once" hint="Pro stores count here too.">
                <input type="number" min={1} max={1000} value={slots} onChange={(e) => setSlots(Math.max(1, Number(e.target.value)))} className={`${inputClass} w-full`} />
              </Field>
              <Field label="Features one store can hold at a time" hint="Running or waiting to start. Each is one paid feature with its own banner.">
                <input type="number" min={1} max={12} value={perStore} onChange={(e) => setPerStore(Math.max(1, Number(e.target.value)))} className={`${inputClass} w-full`} />
              </Field>
              <Field label="Pro price per month (₦)">
                <input type="number" min={0} step={500} value={proPrice} onChange={(e) => setProPrice(Math.max(0, Number(e.target.value)))} className={`${inputClass} w-full`} />
              </Field>
              <Field label="Pro stores at once" hint="Each gets its own row on Home, so keep it small (0 turns Pro off).">
                <input type="number" min={0} max={6} value={proSlots} onChange={(e) => setProSlots(Math.min(6, Math.max(0, Number(e.target.value))))} className={`${inputClass} w-full`} />
              </Field>
              <div className="flex gap-2">
                <button disabled={!changed || busy} onClick={() => { setPrice(data.settings.pricePerMonth); setSlots(data.settings.maxStores); setPerStore(data.settings.maxPerStore ?? 2); setProPrice(data.settings.proPricePerMonth ?? 10_000); setProSlots(maxPro); }} className={`${secondaryButtonClass} flex-1`}>
                  Undo
                </button>
                <button disabled={!changed || busy} onClick={() => run("Save featuring price and spots?", (pw) => saveFeaturingSettings({ pricePerMonth: price, maxStores: slots, maxPerStore: perStore, proPricePerMonth: proPrice, maxPro: proSlots }, pw))} className={`${buttonClass} flex-1`}>
                  Save
                </button>
              </div>
            </div>
          </Card>

          <Card title="Feature a store by hand" description="Free of charge, e.g. to launch a new partner. Adds days from the end of any current feature.">
            <div className="flex flex-col gap-3">
              <select value={storeId} onChange={(e) => setStoreId(e.target.value)} className={`${inputClass} w-full`}>
                <option value="">Choose a store</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (${s.ticker})
                  </option>
                ))}
              </select>
              <select value={handTier} onChange={(e) => setHandTier(e.target.value === "pro" ? "pro" : "standard")} className={`${inputClass} w-full`}>
                <option value="standard">Featured</option>
                <option value="pro">Featured Pro (its own row on Home)</option>
              </select>
              <div className="flex gap-2">
                <input type="number" min={1} max={365} value={days} onChange={(e) => setDays(Math.max(1, Math.round(Number(e.target.value))))} className={`${inputClass} w-24`} />
                <span className="self-center text-sm text-muted">days</span>
                <button disabled={!storeId || busy} onClick={() => run(handTier === "pro" ? "Give this store Pro?" : "Feature this store?", (pw) => featureStore(storeId, days, pw, handTier), () => setStoreId(""))} className={`${buttonClass} ml-auto`}>
                  Feature
                </button>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card title="Featured now" padded={false}>
            {data.featured.length === 0 ? (
              <p className="p-5 text-sm text-muted">No store is featured right now.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {data.featured.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                    <StoreAvatar name={s.name} logo={s.logoUrl} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 font-semibold">
                        {s.name} {s.proUntil && new Date(s.proUntil).getTime() > now && <Pill tone="brand">Pro until {fmtDate(s.proUntil)}</Pill>}
                      </span>
                      <span className="block text-xs text-muted">Featured until {fmtDate(s.featuredUntil)}</span>
                    </span>
                    {s.proUntil && new Date(s.proUntil).getTime() > now && (
                      <button disabled={busy} onClick={() => run(`End Pro for ${s.name}? It stays featured.`, (pw) => featureStore(s.id, 0, pw, "pro"))} className={`${secondaryButtonClass} min-h-9 px-3 text-sm`}>
                        End Pro
                      </button>
                    )}
                    <button disabled={busy} onClick={() => run(`Stop featuring ${s.name}?`, (pw) => featureStore(s.id, 0, pw))} className={`${secondaryButtonClass} min-h-9 px-3 text-sm`}>
                      End
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Payments" padded={false}>
            {data.purchases.length === 0 ? (
              <p className="p-5 text-sm text-muted">No featuring payments yet.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {data.purchases.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{p.storeName}</span>
                      <span className="block text-xs text-muted">
                        {p.tier === "pro" ? "Pro · " : ""}
                        {p.months} month{p.months === 1 ? "" : "s"}
                        {p.paidAt ? ` · paid ${fmtDate(p.paidAt)}` : ""}
                        {p.until ? ` · until ${fmtDate(p.until)}` : ""}
                      </span>
                    </span>
                    <span className="font-display font-bold">{formatNaira(p.amount)}</span>
                    <Pill tone="good">Paid</Pill>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
