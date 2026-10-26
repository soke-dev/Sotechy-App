"use client";

import { ArrowDownUp, ArrowRight, ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckIcon, DocsBar, isWaiting, MerchantAvatar, waitedFor, waitedTooLong } from "@/components/merchant-bits";
import { EmptyState, PageHeader, Pill, SampleBadge, StatCard, Tabs } from "@/components/ui";
import { MERCHANT_STATUS, merchants, nairaShort, type Merchant, type MerchantStatus } from "@/lib/marketplace";

type Tab = "review" | "info" | "verified" | "suspended" | "all";

const STEPS = [
  { n: "01", title: "Documents", text: "CAC or business name for businesses, ID for freelancers, and proof of address." },
  { n: "02", title: "Identity and payout", text: "NIN and a selfie. The payout account must be in the business name or the owner's own name." },
  { n: "03", title: "Go live", text: "Their token is created, the storefront opens, and each delivery area waits for its own approval." },
];

function Identity({ m }: { m: Merchant }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <CheckIcon ok={m.idCheck.ok} />
      {m.idCheck.ok === null ? "Checking" : m.idCheck.ok ? "Matched" : "Needs a retry"}
    </span>
  );
}

function Waiting({ m }: { m: Merchant }) {
  if (!isWaiting(m)) return <span className="text-muted">—</span>;
  return <span className={`text-sm font-semibold ${waitedTooLong(m.appliedAt) ? "text-bad" : ""}`}>{waitedFor(m.appliedAt)}</span>;
}

export default function MerchantsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("review");
  const [q, setQ] = useState("");
  const [oldestFirst, setOldestFirst] = useState(true);
  const count = (s: MerchantStatus) => merchants.filter((m) => m.status === s).length;
  const term = q.trim().toLowerCase();
  const shown = merchants
    .filter((m) => tab === "all" || m.status === tab)
    .filter((m) => !term || `${m.name} ${m.owner} ${m.ticker}`.toLowerCase().includes(term))
    .sort((a, b) => (new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime()) * (oldestFirst ? 1 : -1));
  const waiting = merchants.filter((m) => m.status === "review").sort((a, b) => a.appliedAt.localeCompare(b.appliedAt));
  const live = merchants.filter((m) => m.status === "verified");

  return (
    <>
      <PageHeader
        illo="store"
        title="Merchants"
        badge={<SampleBadge />}
        description="Businesses and freelancers selling on Sotechy. Each one is checked before their store and token go live."
        actions={
          <label className="flex h-11 w-full items-center gap-2 rounded-full border border-line bg-surface px-4 focus-within:border-ink sm:w-72">
            <Search size={16} className="text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, owner or ticker" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </label>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
        <div className="relative overflow-hidden rounded-3xl bg-panel p-5 text-white sm:col-span-2 lg:col-span-1">
          <div className="absolute -right-10 -top-14 h-36 w-36 rounded-full bg-brand/90" />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-white/60">Waiting for review</p>
              <p className="font-display text-5xl font-extrabold text-sun">{waiting.length}</p>
              <p className="text-sm text-white/60">{waiting.length ? `Oldest was sent ${waitedFor(waiting[0].appliedAt)} ago` : "Nothing waiting"}</p>
            </div>
            {waiting.length > 0 && (
              <Link href={`/merchants/${waiting[0].id}`} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold hover:bg-brand-strong">
                Start reviewing <ArrowRight size={16} />
              </Link>
            )}
          </div>
        </div>
        <StatCard illo="store" label="Live merchants" value={live.length} hint="Selling on Sotechy" />
        <StatCard illo="wallet" label="Their sales, 30 days" value={nairaShort(live.reduce((n, m) => n + m.sales30d, 0))} hint={`Across ${live.length} merchants`} />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "review", label: "Needs review", count: count("review"), urgent: true },
            { id: "info", label: "Waiting on merchant", count: count("info") },
            { id: "verified", label: "Verified", count: count("verified") },
            { id: "suspended", label: "Suspended", count: count("suspended") },
            { id: "all", label: "All", count: merchants.length },
          ]}
        />
        <button onClick={() => setOldestFirst(!oldestFirst)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
          <ArrowDownUp size={15} /> {oldestFirst ? "Oldest first" : "Newest first"}
        </button>
      </div>

      {shown.length === 0 ? (
        <EmptyState illo="store" title="Nothing here" message={term ? `No merchant matches "${q}".` : tab === "review" ? "No applications waiting. New ones arrive here and by email." : "No merchants in this list."} />
      ) : (
        <>
          {/* Wide screens: a table */}
          <div className="hidden overflow-hidden rounded-3xl border border-line bg-surface md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-alt/60 text-xs font-semibold uppercase tracking-wide text-muted">
                  <th className="px-5 py-3">Merchant</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Documents</th>
                  <th className="px-3 py-3">Identity</th>
                  <th className="px-3 py-3">Waiting</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {shown.map((m) => (
                  <tr key={m.id} onClick={() => router.push(`/merchants/${m.id}`)} className="cursor-pointer border-b border-line/70 transition last:border-0 hover:bg-canvas">
                    <td className="px-5 py-3.5">
                      <Link href={`/merchants/${m.id}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-3">
                        <MerchantAvatar m={m} size={40} />
                        <span className="min-w-0">
                          <span className="block font-semibold">{m.name}</span>
                          <span className="block text-xs text-muted">
                            {m.owner} · {m.city} · <span className="font-semibold text-brand-strong">${m.ticker}</span>
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-3.5 text-ink-2">{m.kind}</td>
                    <td className="px-3 py-3.5"><DocsBar m={m} /></td>
                    <td className="px-3 py-3.5"><Identity m={m} /></td>
                    <td className="px-3 py-3.5"><Waiting m={m} /></td>
                    <td className="px-3 py-3.5"><Pill tone={MERCHANT_STATUS[m.status].tone}>{MERCHANT_STATUS[m.status].label}</Pill></td>
                    <td className="pr-4"><ChevronRight size={17} className="text-faint" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phones: cards */}
          <ul className="flex flex-col gap-3 md:hidden">
            {shown.map((m) => (
              <li key={m.id}>
                <Link href={`/merchants/${m.id}`} className={`flex flex-col gap-3 rounded-3xl border bg-surface p-4 ${m.status === "review" ? "border-brand/40" : "border-line"}`}>
                  <span className="flex items-center gap-3">
                    <MerchantAvatar m={m} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-lg font-bold leading-tight">{m.name}</span>
                      <span className="block truncate text-xs text-muted">
                        {m.owner} · {m.kind} · <span className="font-semibold text-brand-strong">${m.ticker}</span>
                      </span>
                    </span>
                    <ChevronRight size={17} className="shrink-0 text-faint" />
                  </span>
                  <span className="flex flex-wrap items-center justify-between gap-3">
                    <DocsBar m={m} />
                    <Identity m={m} />
                    <Pill tone={MERCHANT_STATUS[m.status].tone}>{MERCHANT_STATUS[m.status].label}</Pill>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <ol className="mt-8 grid grid-cols-1 gap-6 border-t border-line pt-6 sm:grid-cols-3">
        {STEPS.map((s) => (
          <li key={s.n}>
            <p className="font-display text-sm font-extrabold text-brand-strong">{s.n}</p>
            <p className="mt-1 font-bold">{s.title}</p>
            <p className="mt-1 text-sm text-muted">{s.text}</p>
          </li>
        ))}
      </ol>
    </>
  );
}
