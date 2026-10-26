"use client";

import { useState } from "react";
import { formatNaira } from "@sotechy/shared";
import { Illo } from "@/components/illustrations";
import { RelTime } from "@/components/rel-time";
import { buttonClass, dangerButtonClass, EmptyState, PageHeader, Pill, primaryButtonClass, SampleBadge, secondaryButtonClass, Sheet, Tabs } from "@/components/ui";
import { CASE_KIND, orderCases, type CaseKind, type OrderCase } from "@/lib/marketplace";

type Tab = CaseKind | "all" | "done";

/** The choices for each kind of case, and what each one does to the money */
const ACTIONS: Record<CaseKind, { label: string; outcome: string; style: "primary" | "dark" | "outline" | "danger" }[]> = {
  not_accepted: [
    { label: "Refund the customer", outcome: "Refunded in full. Merchant gets nothing.", style: "danger" },
    { label: "Give the merchant 12 more hours", outcome: "Extended by 12 hours. Merchant reminded on WhatsApp.", style: "outline" },
    { label: "Move to another merchant", outcome: "Offered to another merchant that stocks it.", style: "dark" },
  ],
  not_confirmed: [
    { label: "Confirm delivery", outcome: "Confirmed by Sotechy. Last payment sent and the customer's tokens released.", style: "primary" },
    { label: "Message the customer again", outcome: "Customer messaged on WhatsApp and email.", style: "outline" },
  ],
  payback: [
    { label: "Mark as paid back", outcome: "Merchant paid back. Customer refunded.", style: "primary" },
    { label: "Take it from their next payout", outcome: "Will be taken from the merchant's next payout. Customer refunded now.", style: "dark" },
    { label: "Refund from Sotechy now", outcome: "Sotechy refunded the customer and will collect from the merchant.", style: "outline" },
  ],
  dispute: [
    { label: "Side with the customer: refund", outcome: "Customer refunded. Last payment cancelled.", style: "danger" },
    { label: "Side with the merchant: confirm", outcome: "Confirmed. Last payment sent to the merchant.", style: "primary" },
    { label: "Ask both for more photos", outcome: "Asked both sides for more photos.", style: "outline" },
  ],
};

const styles = { primary: primaryButtonClass, dark: buttonClass, outline: secondaryButtonClass, danger: dangerButtonClass };

export default function OrderReviewsPage() {
  const [open, setOpen] = useState(orderCases);
  const [done, setDone] = useState<(OrderCase & { outcome: string })[]>([]);
  const [tab, setTab] = useState<Tab>("all");
  const [current, setCurrent] = useState<OrderCase | null>(null);
  const count = (k: CaseKind) => open.filter((c) => c.kind === k).length;
  const shown = tab === "done" ? done : tab === "all" ? open : open.filter((c) => c.kind === tab);

  const resolve = (c: OrderCase, outcome: string) => {
    setOpen(open.filter((x) => x.id !== c.id));
    setDone([{ ...c, outcome }, ...done]);
    setCurrent(null);
  };

  return (
    <>
      <PageHeader
        illo="shield"
        title="Order reviews"
        badge={<SampleBadge />}
        description="Orders Sotechy has to step into: a merchant who didn't accept in 24 hours, a customer who didn't confirm delivery, a merchant who can't ship, or a complaint. The customer sees “Processing” until it's settled."
      />

      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "all", label: "All open", count: open.length, urgent: true },
          { id: "not_accepted", label: "Not accepted", count: count("not_accepted") },
          { id: "not_confirmed", label: "Not confirmed", count: count("not_confirmed") },
          { id: "payback", label: "Paybacks", count: count("payback") },
          { id: "dispute", label: "Complaints", count: count("dispute") },
          { id: "done", label: "Settled", count: done.length },
        ]}
      />

      {shown.length === 0 ? (
        <EmptyState illo="shield" title={tab === "done" ? "Nothing settled yet" : "All caught up"} message={tab === "done" ? "Cases you settle show here with what you decided." : "No orders need Sotechy right now."} />
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((c) => {
            const k = CASE_KIND[c.kind];
            const outcome = "outcome" in c ? (c as OrderCase & { outcome: string }).outcome : null;
            return (
              <li key={c.id}>
                <button onClick={() => !outcome && setCurrent(c)} className={`flex w-full flex-col gap-3 rounded-3xl border bg-surface p-4 text-left transition sm:flex-row sm:items-center ${outcome ? "border-line" : "border-line hover:shadow-[0_8px_24px_rgba(23,18,14,0.06)]"}`}>
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft">
                    <Illo name={k.illo} size={32} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-lg font-bold">{c.order}</span>
                      <Pill tone={k.tone}>{k.label}</Pill>
                    </span>
                    <span className="block text-sm text-muted">
                      {c.merchant} · {c.customer} · opened <RelTime iso={c.openedAt} />
                    </span>
                    <span className="mt-1 block text-sm">{outcome ?? c.detail}</span>
                  </span>
                  <span className="font-display text-lg font-bold sm:text-right">{formatNaira(c.total)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Sheet open={current !== null} onClose={() => setCurrent(null)} title={current ? `${current.order} · ${CASE_KIND[current.kind].label}` : ""}>
        {current && (
          <div className="flex flex-col gap-4 text-sm">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-2xl bg-surface-alt p-4">
              <dt className="text-muted">Merchant</dt>
              <dd className="font-semibold">{current.merchant}</dd>
              <dt className="text-muted">Customer</dt>
              <dd className="font-semibold">{current.customer}</dd>
              <dt className="text-muted">Order total</dt>
              <dd className="font-semibold">{formatNaira(current.total)}</dd>
            </dl>
            <p>{current.detail}</p>
            <p className="rounded-2xl bg-brand-soft px-4 py-3">
              <b>Money:</b> {current.money}
            </p>
            <div className="flex flex-col gap-2">
              {ACTIONS[current.kind].map((a) => (
                <button key={a.label} onClick={() => resolve(current, a.outcome)} className={`${styles[a.style]} w-full`}>
                  {a.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted">Both sides are told on WhatsApp and email. Every decision is written to the audit log.</p>
          </div>
        )}
      </Sheet>
    </>
  );
}
