"use client";

import { RotateCw } from "lucide-react";
import { useState } from "react";
import { formatNaira } from "@sotechy/shared";
import { Illo } from "@/components/illustrations";
import { RelTime } from "@/components/rel-time";
import { Card, DataTable, PageHeader, Pill, SampleBadge, secondaryButtonClass, StatCard, Tabs } from "@/components/ui";
import { merchantPayouts, paybacks, PAYOUT_STATUS, type MerchantPayout } from "@/lib/marketplace";

type Tab = MerchantPayout["status"] | "all";

export default function MerchantPayoutsPage() {
  const [list, setList] = useState(merchantPayouts);
  const [tab, setTab] = useState<Tab>("all");
  const count = (s: MerchantPayout["status"]) => list.filter((p) => p.status === s).length;
  const sum = (s: MerchantPayout["status"]) => list.filter((p) => p.status === s).reduce((n, p) => n + p.amount, 0);
  const shown = tab === "all" ? list : list.filter((p) => p.status === tab);

  return (
    <>
      <PageHeader
        illo="bank"
        title="Merchant payouts"
        badge={<SampleBadge />}
        description="Sent automatically by Money Moves: 50% when a merchant accepts (plus the full delivery fee), 50% when delivery is confirmed. Sotechy's 2% is taken first."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard illo="bank" tone="brand" label="Paid" value={formatNaira(sum("paid"))} hint={`${count("paid")} transfers`} />
        <StatCard illo="bike" tone="info" label="Sending now" value={formatNaira(sum("scheduled"))} hint={`${count("scheduled")} transfers`} />
        <StatCard illo="shield" tone="warn" label="On hold" value={formatNaira(sum("held"))} hint="Waiting on an order review" />
        <StatCard illo="doc" tone="bad" label="Failed" value={count("failed")} hint="Bank rejected the transfer" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.7fr_1fr]">
        <Card title="Transfers" padded={false}>
          <div className="px-5 pb-5">
            <Tabs
              className="mb-4"
              value={tab}
              onChange={setTab}
              tabs={[
                { id: "all", label: "All", count: list.length },
                { id: "scheduled", label: "Sending", count: count("scheduled") },
                { id: "held", label: "On hold", count: count("held") },
                { id: "failed", label: "Failed", count: count("failed"), urgent: true },
                { id: "paid", label: "Paid", count: count("paid") },
              ]}
            />
            <DataTable
              rows={shown}
              empty="No transfers here."
              columns={[
                {
                  header: "Merchant",
                  cell: (p) => (
                    <span>
                      <span className="block font-semibold">{p.merchant}</span>
                      <span className="text-xs text-muted">{p.bank}</span>
                    </span>
                  ),
                },
                { header: "Order", cell: (p) => <span>{p.order} · {p.half}</span> },
                { header: "Amount", cell: (p) => <span className="font-display font-bold">{formatNaira(p.amount)}</span> },
                { header: "Status", cell: (p) => <Pill tone={PAYOUT_STATUS[p.status].tone}>{PAYOUT_STATUS[p.status].label}</Pill> },
                { header: "When", cell: (p) => <span className="text-muted"><RelTime iso={p.at} /></span> },
                {
                  header: "",
                  cell: (p) =>
                    p.status === "failed" ? (
                      <button onClick={() => setList(list.map((x) => (x.id === p.id ? { ...x, status: "scheduled", at: new Date().toISOString() } : x)))} className={`${secondaryButtonClass} min-h-9 px-3`}>
                        <RotateCw size={14} /> Retry
                      </button>
                    ) : null,
                },
              ]}
            />
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          <Card title="Owed back to Sotechy">
            {paybacks.length ? (
              <ul className="flex flex-col gap-3 text-sm">
                {paybacks.map((p) => (
                  <li key={p.order} className="flex items-center gap-3 rounded-2xl bg-bad-soft p-3">
                    <Illo name="bank" size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{p.merchant}</span>
                      <span className="text-xs text-muted">
                        {p.order} · since <RelTime iso={p.since} />
                      </span>
                    </span>
                    <span className="font-display font-bold text-bad">{formatNaira(p.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No merchant owes anything.</p>
            )}
            <p className="mt-3 text-xs text-muted">When a merchant accepts but can&apos;t ship, they pay back the first 50% before the customer is refunded. Settle it under Order reviews.</p>
          </Card>
          <Card title="How the money moves">
            <ol className="flex flex-col gap-3 text-sm">
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">1</span>Customer pays Sotechy through Money Moves.</li>
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">2</span>2% fee comes off: 1% to the reserve, 1% revenue.</li>
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">3</span>Merchant accepts: 50% of their share and the whole delivery fee go to their bank.</li>
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">4</span>Delivery confirmed: the other 50% goes out.</li>
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
