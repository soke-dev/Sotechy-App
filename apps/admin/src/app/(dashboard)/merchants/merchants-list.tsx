"use client";

import { ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { RelTime } from "@/components/rel-time";
import { EmptyState, PageHeader, Pill, StatCard, Tabs } from "@/components/ui";
import { KYC, STAGE, stageOf, type AdminStore, type Stage } from "./store-types";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

export function StoreAvatar({ name, logo, size = 44, dark }: { name: string; logo?: string | null; size?: number; dark?: boolean }) {
  return (
    <span
      className={`font-display flex shrink-0 items-center justify-center overflow-hidden rounded-2xl font-extrabold ${dark ? "bg-brand text-white" : "bg-brand-soft text-brand-strong"}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}

export function MerchantsList({ stores }: { stores: AdminStore[] }) {
  const [tab, setTab] = useState<Stage | "all">("review");
  const [q, setQ] = useState("");
  const count = (s: Stage) => stores.filter((x) => stageOf(x) === s).length;
  const term = q.trim().toLowerCase();
  const shown = stores
    .filter((s) => tab === "all" || stageOf(s) === tab)
    .filter((s) => !term || `${s.name} ${s.slug} ${s.ticker} ${s.ownerName ?? ""} ${s.ownerEmail ?? ""}`.toLowerCase().includes(term))
    // Oldest waiting first, so nobody is forgotten
    .sort((a, b) => (tab === "review" ? (a.submittedAt ?? "").localeCompare(b.submittedAt ?? "") : b.createdAt.localeCompare(a.createdAt)));
  const zonesWaiting = stores.reduce((n, s) => n + s.pendingZones, 0);

  return (
    <>
      <PageHeader illo="store" title="Merchants" description="Stores selling on Sotechy. Check each one before it goes live, and approve every delivery area they add." />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard illo="doc" label="Needs review" value={count("review")} hint="Submitted their setup" tone={count("review") ? "warn" : "neutral"} />
        <StatCard illo="store" label="Live" value={count("live")} hint="Selling now" />
        <StatCard illo="bike" label="Delivery areas" value={zonesWaiting} hint="Waiting for approval" tone={zonesWaiting ? "warn" : "neutral"} />
        <StatCard illo="user" label="Still setting up" value={count("setup")} hint="Haven't submitted yet" />
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Tabs
          value={tab}
          onChange={setTab}
          className="lg:flex-1"
          tabs={[
            { id: "review", label: "Needs review", count: count("review") },
            { id: "setup", label: "Setting up", count: count("setup") },
            { id: "live", label: "Live", count: count("live") },
            { id: "suspended", label: "Suspended", count: count("suspended") },
            { id: "all", label: "All", count: stores.length },
          ]}
        />
        <div className="relative lg:w-72">
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search stores or owners" className="min-h-11 w-full rounded-full border border-line bg-surface pl-11 pr-4 text-sm outline-none focus:border-ink" />
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState illo="store" title={tab === "review" ? "Nothing waiting" : "No stores here"} message={tab === "review" ? "Stores show here once they submit their setup for review." : "Try another tab or search."} />
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((s) => {
            const stage = stageOf(s);
            const kyc = KYC[s.kycStatus];
            return (
              <li key={s.id}>
                <Link href={`/merchants/${s.id}`} className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-4 transition hover:shadow-[0_8px_24px_rgba(23,18,14,0.06)] sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <StoreAvatar name={s.name} logo={s.logoUrl} />
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-semibold">
                        {s.name} <span className="text-sm font-normal text-muted">${s.ticker}</span>
                      </p>
                      <p className="truncate text-sm text-muted">
                        {s.ownerName ?? s.ownerEmail ?? "No owner"} · {s.sellerKind === "registered" ? "Registered business" : "Individual"} ·{" "}
                        {stage === "review" && s.submittedAt ? (
                          <>
                            submitted <RelTime iso={s.submittedAt} />
                          </>
                        ) : (
                          <>
                            opened <RelTime iso={s.createdAt} />
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <Pill tone={kyc.ok ? "good" : kyc.ok === false ? "bad" : "neutral"} dot={false}>
                      {kyc.label}
                    </Pill>
                    {s.pendingZones > 0 && <Pill tone="warn">{s.pendingZones} area{s.pendingZones === 1 ? "" : "s"} to approve</Pill>}
                    <span className="text-xs text-muted">
                      {s.productCount} products · {s.orderCount} orders
                    </span>
                    <Pill tone={STAGE[stage].tone}>{STAGE[stage].label}</Pill>
                    <ChevronRight size={18} className="text-faint" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
