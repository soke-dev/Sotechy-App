"use client";

// Store orders Sotechy has to step into, worked out from real orders by the API.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatNaira } from "@sotechy/shared";
import { Illo } from "@/components/illustrations";
import { usePasswordPrompt } from "@/components/password-prompt";
import { RelTime } from "@/components/rel-time";
import { dangerButtonClass, EmptyState, PageHeader, Pill, primaryButtonClass, secondaryButtonClass, Sheet, Tabs } from "@/components/ui";
import { cancelOrder, markDelivered, markRepaid } from "./actions";

export type CaseKind = "not_accepted" | "not_confirmed" | "payback";
export interface OrderCase {
  id: string;
  kind: CaseKind;
  orderId: string;
  order: string;
  merchant: string;
  customer: string;
  total: number;
  openedAt: string;
  detail: string;
  money: string;
  payoutId?: string;
}

const KIND: Record<CaseKind, { label: string; tone: "warn" | "info" | "bad"; illo: "box" | "bike" | "bank" }> = {
  not_accepted: { label: "Not accepted in 24h", tone: "warn", illo: "box" },
  not_confirmed: { label: "Not delivered in 7 days", tone: "info", illo: "bike" },
  payback: { label: "Store owes it back", tone: "bad", illo: "bank" },
};

export function OrderReviews({ cases }: { cases: OrderCase[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<CaseKind | "all">("all");
  const [current, setCurrent] = useState<OrderCase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const { ask, prompt } = usePasswordPrompt();
  const count = (k: CaseKind) => cases.filter((c) => c.kind === k).length;
  const shown = tab === "all" ? cases : cases.filter((c) => c.kind === tab);

  const act = (fn: () => Promise<{ ok: true } | { error: string }>) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if ("error" in r) return setError(r.error);
      setCurrent(null);
      router.refresh();
    });

  return (
    <>
      {prompt}
      <PageHeader illo="shield" title="Order reviews" description="Store orders Sotechy has to step into: a store that didn't accept in 24 hours, an order not delivered after a week, or a store that owes a payment back." />
      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "all", label: "All open", count: cases.length, urgent: true },
          { id: "not_accepted", label: "Not accepted", count: count("not_accepted") },
          { id: "not_confirmed", label: "Not delivered", count: count("not_confirmed") },
          { id: "payback", label: "Paybacks", count: count("payback") },
        ]}
      />
      {error && <p className="mb-4 rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}

      {shown.length === 0 ? (
        <EmptyState illo="shield" title="All caught up" message="No store orders need Sotechy right now." />
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((c) => {
            const k = KIND[c.kind];
            return (
              <li key={c.id}>
                <button onClick={() => setCurrent(c)} className="flex w-full flex-col gap-3 rounded-3xl border border-line bg-surface p-4 text-left transition hover:shadow-[0_8px_24px_rgba(23,18,14,0.06)] sm:flex-row sm:items-center">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft">
                    <Illo name={k.illo} size={32} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-lg font-bold">{c.order}</span>
                      <Pill tone={k.tone}>{k.label}</Pill>
                    </span>
                    <span className="block text-sm text-muted">
                      {c.merchant} · {c.customer} · since <RelTime iso={c.openedAt} />
                    </span>
                    <span className="mt-1 block text-sm">{c.detail}</span>
                  </span>
                  <span className="font-display text-lg font-bold sm:text-right">{formatNaira(c.total)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Sheet open={current !== null} onClose={() => setCurrent(null)} title={current ? `${current.order} · ${KIND[current.kind].label}` : ""}>
        {current && (
          <div className="flex flex-col gap-4 text-sm">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-2xl bg-surface-alt p-4">
              <dt className="text-muted">Store</dt>
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
              {current.kind === "not_accepted" && (
                <button disabled={busy} onClick={() => act(() => cancelOrder(current.orderId, "Store didn't accept within 24 hours"))} className={`${dangerButtonClass} w-full`}>
                  Cancel the order and refund the customer
                </button>
              )}
              {current.kind === "not_confirmed" && (
                <button disabled={busy} onClick={() => act(() => markDelivered(current.orderId))} className={`${primaryButtonClass} w-full`}>
                  Mark it delivered
                </button>
              )}
              {current.kind === "payback" && current.payoutId && (
                <button
                  disabled={busy}
                  onClick={() =>
                    act(async () => {
                      setCurrent(null);
                      const password = await ask("Mark this payback repaid?", `${current.merchant} · ${current.order}`);
                      return password ? markRepaid(current.payoutId!, password) : { error: "" };
                    })
                  }
                  className={`${primaryButtonClass} w-full`}
                >
                  Mark it repaid
                </button>
              )}
              <Link href={`/orders/${current.orderId}`} className={`${secondaryButtonClass} w-full`}>
                Open the order
              </Link>
            </div>
            <p className="text-xs text-muted">Every decision is written to the audit log.</p>
          </div>
        )}
      </Sheet>
    </>
  );
}
