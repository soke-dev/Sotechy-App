"use client";

import { Check, CircleHelp, ExternalLink, Mail, MapPin, Phone, X } from "lucide-react";
import { useState } from "react";
import { formatNaira } from "@sotechy/shared";
import { Illo } from "@/components/illustrations";
import { RelTime } from "@/components/rel-time";
import { buttonClass, Card, dangerButtonClass, EmptyState, inputClass, PageHeader, Pill, primaryButtonClass, SampleBadge, secondaryButtonClass, Sheet, StatCard, Tabs } from "@/components/ui";
import { MERCHANT_STATUS, merchants as initial, type Merchant, type MerchantStatus } from "@/lib/marketplace";

type Tab = "review" | "info" | "verified" | "suspended" | "all";

function Check3({ ok }: { ok: boolean | null }) {
  if (ok === null) return <CircleHelp size={18} className="shrink-0 text-warn" />;
  return ok ? <Check size={18} className="shrink-0 text-good" /> : <X size={18} className="shrink-0 text-bad" />;
}

function Logo({ m, size = 48 }: { m: Merchant; size?: number }) {
  return (
    <span className="flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand" style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={m.logo} alt="" className="h-[78%] w-[78%] object-contain" />
    </span>
  );
}

export default function MerchantsPage() {
  const [list, setList] = useState(initial);
  const [tab, setTab] = useState<Tab>("review");
  const [openId, setOpenId] = useState<string | null>(null);
  const [mode, setMode] = useState<null | "info" | "reject" | "suspend">(null);
  const [reason, setReason] = useState("");
  const open = list.find((m) => m.id === openId) ?? null;
  const count = (s: MerchantStatus) => list.filter((m) => m.status === s).length;
  const shown = tab === "all" ? list : list.filter((m) => m.status === tab);

  const decide = (status: MerchantStatus, note?: string) => {
    setList(list.map((m) => (m.id === openId ? { ...m, status, note: note ?? m.note } : m)));
    setMode(null);
    setReason("");
    setOpenId(null);
  };
  const close = () => {
    setOpenId(null);
    setMode(null);
    setReason("");
  };

  return (
    <>
      <PageHeader illo="store" title="Merchants" badge={<SampleBadge />} description="Businesses and freelancers selling on Sotechy. Check each one before their store and $TICKER token go live." />

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard illo="store" tone="brand" label="Live merchants" value={count("verified")} hint="Selling now" />
        <StatCard illo="shield" tone="warn" label="Need review" value={count("review")} hint="New applications" />
        <StatCard illo="mail" tone="info" label="Waiting on merchant" value={count("info")} hint="Asked for more" />
        <StatCard illo="wallet" label="Their sales, 30 days" value={formatNaira(list.reduce((n, m) => n + m.sales30d, 0))} />
      </div>

      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "review", label: "Needs review", count: count("review"), urgent: true },
          { id: "info", label: "Waiting on merchant", count: count("info") },
          { id: "verified", label: "Verified", count: count("verified") },
          { id: "suspended", label: "Suspended", count: count("suspended") },
          { id: "all", label: "All", count: list.length },
        ]}
      />

      {shown.length === 0 ? (
        <EmptyState illo="store" title="Nothing here" message={tab === "review" ? "No applications waiting. New ones arrive here and by email." : "No merchants in this list."} />
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {shown.map((m) => (
            <li key={m.id} className="min-w-0">
              <button onClick={() => setOpenId(m.id)} className={`flex w-full items-center gap-4 rounded-3xl border bg-surface p-4 text-left transition hover:shadow-[0_8px_24px_rgba(23,18,14,0.06)] ${m.status === "review" ? "border-brand/40" : "border-line"}`}>
                <Logo m={m} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-lg font-bold">{m.name}</span>
                    <span className="text-sm font-semibold text-brand-strong">${m.ticker}</span>
                  </span>
                  <span className="block truncate text-sm text-muted">
                    {m.kind} · {m.city} · {m.status === "verified" ? `${m.products} products · ${formatNaira(m.sales30d)} in 30 days` : <>applied <RelTime iso={m.appliedAt} /></>}
                  </span>
                  {m.note && <span className="mt-1 block truncate text-xs text-muted">{m.note}</span>}
                  <span className="mt-1.5 block sm:hidden">
                    <Pill tone={MERCHANT_STATUS[m.status].tone}>{MERCHANT_STATUS[m.status].label}</Pill>
                  </span>
                </span>
                <span className="hidden sm:block">
                  <Pill tone={MERCHANT_STATUS[m.status].tone}>{MERCHANT_STATUS[m.status].label}</Pill>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={open !== null} onClose={close} title={open ? open.name : ""} wide>
        {open && (
          <div className="flex flex-col gap-5 text-sm">
            <div className="flex items-center gap-4">
              <Logo m={open} size={64} />
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2">
                  <Pill tone={MERCHANT_STATUS[open.status].tone}>{MERCHANT_STATUS[open.status].label}</Pill>
                  <span className="font-semibold text-brand-strong">${open.ticker}</span>
                </p>
                <p className="mt-1 font-semibold">
                  {open.owner} · {open.kind}
                </p>
                <p className="text-muted">
                  Applied <RelTime iso={open.appliedAt} />
                </p>
              </div>
            </div>

            <div className="grid gap-2 rounded-2xl bg-surface-alt p-4 sm:grid-cols-3">
              <p className="flex items-center gap-2"><Mail size={15} className="text-muted" /> <span className="truncate">{open.email}</span></p>
              <p className="flex items-center gap-2"><Phone size={15} className="text-muted" /> {open.phone}</p>
              <p className="flex items-center gap-2"><MapPin size={15} className="text-muted" /> {open.city}</p>
            </div>

            <section>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Checks</p>
              <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line">
                {open.docs.map((d) => (
                  <li key={d.label} className="flex items-start gap-3 p-3">
                    <Check3 ok={d.ok} />
                    <span>
                      <span className="font-semibold">{d.label}</span>
                      {d.note && <span className="block text-muted">{d.note}</span>}
                    </span>
                  </li>
                ))}
                <li className="flex items-start gap-3 p-3">
                  <Check3 ok={open.idCheck.ok} />
                  <span>
                    <span className="font-semibold">ID check</span>
                    <span className="block text-muted">{open.idCheck.note}</span>
                  </span>
                </li>
                <li className="flex items-start gap-3 p-3">
                  <Check3 ok={open.payout.matches !== null} />
                  <span>
                    <span className="font-semibold">Payout account: {open.payout.accountName}</span>
                    <span className="block text-muted">
                      {open.payout.bank} ·{" "}
                      {open.payout.matches === "business" ? "matches the business name" : open.payout.matches === "owner" ? "matches the owner's own name" : "doesn't match the business or owner"}
                    </span>
                  </span>
                </li>
                <li className="flex items-start gap-3 p-3">
                  <Check3 ok />
                  <span>
                    <span className="font-semibold">Ticker ${open.ticker}</span>
                    <span className="block text-muted">Not taken and not reserved</span>
                  </span>
                </li>
              </ul>
            </section>

            <section>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Wants to deliver to</p>
              <div className="flex flex-wrap gap-2">
                {open.states.map((s) => (
                  <Pill key={s} tone="neutral" dot={false}>{s}</Pill>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">Each delivery area is approved separately under Delivery areas.</p>
            </section>

            {open.note && <p className="rounded-2xl bg-warn-soft px-4 py-3 text-warn">{open.note}</p>}

            {mode ? (
              <div className="flex flex-col gap-3 rounded-2xl border border-line p-4">
                <p className="font-semibold">{mode === "info" ? "What do they need to send?" : mode === "reject" ? "Why are you rejecting them?" : "Why are you suspending them?"}</p>
                <textarea autoFocus rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} placeholder={mode === "info" ? "e.g. A utility bill in the business's name" : "The merchant sees this by email"} />
                <div className="flex gap-2">
                  <button onClick={() => setMode(null)} className={`${secondaryButtonClass} flex-1`}>Back</button>
                  <button
                    disabled={!reason.trim()}
                    onClick={() => decide(mode === "info" ? "info" : mode === "reject" ? "rejected" : "suspended", mode === "info" ? `Asked: ${reason.trim()}` : reason.trim())}
                    className={`${mode === "info" ? buttonClass : dangerButtonClass} flex-1`}
                  >
                    {mode === "info" ? "Send request" : mode === "reject" ? "Reject" : "Suspend store"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(open.status === "review" || open.status === "info") && (
                  <>
                    <button onClick={() => decide("verified")} className={`${primaryButtonClass} flex-1`}>
                      <Check size={16} /> Approve and go live
                    </button>
                    <button onClick={() => setMode("info")} className={secondaryButtonClass}>Ask for more</button>
                    <button onClick={() => setMode("reject")} className={dangerButtonClass}>Reject</button>
                  </>
                )}
                {open.status === "verified" && (
                  <>
                    <a href="#" className={`${secondaryButtonClass} flex-1`}>
                      View storefront <ExternalLink size={15} />
                    </a>
                    <button onClick={() => setMode("suspend")} className={dangerButtonClass}>Suspend</button>
                  </>
                )}
                {(open.status === "suspended" || open.status === "rejected") && (
                  <button onClick={() => decide("verified", "")} className={`${buttonClass} flex-1`}>
                    {open.status === "suspended" ? "Reinstate store" : "Approve after all"}
                  </button>
                )}
              </div>
            )}
            {(open.status === "review" || open.status === "info") && !mode && (
              <p className="flex items-center gap-2 text-xs text-muted">
                <Illo name="coin" size={20} /> Approving creates their ${open.ticker} token on Monad and opens their storefront.
              </p>
            )}
          </div>
        )}
      </Sheet>

      <Card className="mt-6" title="How merchant checks work">
        <ol className="grid gap-3 text-sm sm:grid-cols-3">
          <li className="rounded-2xl bg-surface-alt p-4"><b>1. Documents.</b> CAC or business name for businesses; ID for freelancers. Proof of address.</li>
          <li className="rounded-2xl bg-surface-alt p-4"><b>2. Identity.</b> NIN and a selfie. The payout account must be in the business name or the owner&apos;s own name.</li>
          <li className="rounded-2xl bg-surface-alt p-4"><b>3. Go live.</b> Their token is created, the storefront opens, and each delivery area waits for its own approval.</li>
        </ol>
      </Card>
    </>
  );
}
