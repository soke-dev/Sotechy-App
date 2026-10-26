"use client";

import { Check, Pencil, Plus, RotateCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { formatNaira } from "@sotechy/shared";
import { Illo } from "@/components/illustrations";
import { MerchantAvatar } from "@/components/merchant-bits";
import { PlanEditor } from "@/components/payout-plan";
import { RelTime } from "@/components/rel-time";
import { buttonClass, Card, DataTable, inputClass, PageHeader, Pill, primaryButtonClass, SampleBadge, secondaryButtonClass, Sheet, StatCard, Tabs } from "@/components/ui";
import { describePlan, merchantPayouts, merchants, paybacks, payoutPlans, PAYOUT_STATUS, type MerchantPayout, type PayoutPlan } from "@/lib/marketplace";

type Tab = MerchantPayout["status"] | "all";

export default function MerchantPayoutsPage() {
  const [list, setList] = useState(merchantPayouts);
  const [tab, setTab] = useState<Tab>("all");
  const count = (s: MerchantPayout["status"]) => list.filter((p) => p.status === s).length;
  const sum = (s: MerchantPayout["status"]) => list.filter((p) => p.status === s).reduce((n, p) => n + p.amount, 0);
  const shown = tab === "all" ? list : list.filter((p) => p.status === tab);

  // Payout plans: the default, and merchants with their own
  const [standard, setStandard] = useState<PayoutPlan>(payoutPlans.standard);
  const [savedStandard, setSavedStandard] = useState<PayoutPlan>(payoutPlans.standard);
  const [custom, setCustom] = useState(payoutPlans.merchants);
  const [editing, setEditing] = useState<{ merchantId: string; plan: PayoutPlan } | null>(null);
  const standardChanged = standard.firstPercent !== savedStandard.firstPercent || standard.fee !== savedStandard.fee;
  const saveCustom = (next: Record<string, PayoutPlan>) => {
    payoutPlans.merchants = next;
    setCustom(next);
  };
  const live = merchants.filter((m) => m.status === "verified" || m.status === "suspended");

  return (
    <>
      <PageHeader
        illo="bank"
        title="Merchant payouts"
        badge={<SampleBadge />}
        description="Sent automatically by Money Moves: part when a merchant accepts (with the full delivery fee), the rest when delivery is confirmed. You choose the split and when Sotechy's 2% comes out."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard illo="bank" tone="brand" label="Paid" value={formatNaira(sum("paid"))} hint={`${count("paid")} transfers`} />
        <StatCard illo="bike" tone="info" label="Sending now" value={formatNaira(sum("scheduled"))} hint={`${count("scheduled")} transfers`} />
        <StatCard illo="shield" tone="warn" label="On hold" value={formatNaira(sum("held"))} hint="Waiting on an order review" />
        <StatCard illo="doc" tone="bad" label="Failed" value={count("failed")} hint="Bank rejected the transfer" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Payout plan for everyone" description="Applies to every merchant without their own plan, for orders placed after you save.">
          <PlanEditor plan={standard} onChange={setStandard} />
          {standardChanged ? (
            <div className="mt-4 flex gap-2">
              <button onClick={() => setStandard(savedStandard)} className={`${secondaryButtonClass} flex-1`}>Undo</button>
              <button
                onClick={() => {
                  payoutPlans.standard = standard;
                  setSavedStandard(standard);
                }}
                className={`${buttonClass} flex-1`}
              >
                Save for everyone
              </button>
            </div>
          ) : (
            <p className="mt-4 flex items-center gap-2 text-sm text-good"><Check size={16} /> In use: {describePlan(savedStandard)}</p>
          )}
        </Card>

        <Card
          title="Merchants with their own plan"
          description="E.g. 90% up front for a trusted store, 10% for a new one."
          actions={
            <button onClick={() => setEditing({ merchantId: "", plan: savedStandard })} className={`${secondaryButtonClass} min-h-10`}>
              <Plus size={15} /> Add
            </button>
          }
        >
          {Object.keys(custom).length === 0 ? (
            <p className="text-sm text-muted">Everyone is on the plan for everyone.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {Object.entries(custom).map(([id, plan]) => {
                const m = merchants.find((x) => x.id === id);
                if (!m) return null;
                return (
                  <li key={id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <MerchantAvatar m={m} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{m.name}</span>
                      <span className="block text-xs text-muted">{describePlan(plan)}</span>
                    </span>
                    <span className="font-display text-xl font-extrabold">{plan.firstPercent}%</span>
                    <button onClick={() => setEditing({ merchantId: id, plan })} aria-label={`Edit ${m.name}'s plan`} className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-alt hover:text-ink">
                      <Pencil size={15} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
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
                { header: "Order", cell: (p) => <span className="whitespace-nowrap">{p.order} <span className="text-muted">· {p.half}</span></span> },
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
            <p className="mt-3 text-xs text-muted">When a merchant accepts but can&apos;t ship, they pay back their first payment before the customer is refunded. Settle it under Order reviews.</p>
          </Card>
          <Card title="How the money moves">
            <ol className="flex flex-col gap-3 text-sm">
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">1</span>Customer pays Sotechy through Money Moves.</li>
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">2</span>Merchant accepts: their first payment (the plan&apos;s share) and the whole delivery fee go to their bank.</li>
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">3</span>Delivery confirmed: the rest goes out.</li>
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">4</span>Sotechy&apos;s 2% comes out where the plan says: 1% to the reserve, 1% revenue.</li>
            </ol>
          </Card>
        </div>
      </div>

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing?.merchantId && custom[editing.merchantId] ? "Edit merchant's plan" : "Give a merchant their own plan"}>
        {editing && (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-semibold text-ink-2">Merchant</span>
              <select value={editing.merchantId} onChange={(e) => setEditing({ ...editing, merchantId: e.target.value })} className={`${inputClass} w-full`}>
                <option value="">Choose a merchant</option>
                {live.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} (${m.ticker}){custom[m.id] ? " · has a plan" : ""}
                  </option>
                ))}
              </select>
            </label>
            <PlanEditor plan={editing.plan} onChange={(plan) => setEditing({ ...editing, plan })} />
            <div className="flex gap-2">
              {editing.merchantId && custom[editing.merchantId] && (
                <button
                  onClick={() => {
                    const next = { ...custom };
                    delete next[editing.merchantId];
                    saveCustom(next);
                    setEditing(null);
                  }}
                  className={secondaryButtonClass}
                >
                  <Trash2 size={15} /> Use the plan for everyone
                </button>
              )}
              <button
                disabled={!editing.merchantId}
                onClick={() => {
                  saveCustom({ ...custom, [editing.merchantId]: editing.plan });
                  setEditing(null);
                }}
                className={`${primaryButtonClass} flex-1`}
              >
                Save plan
              </button>
            </div>
          </div>
        )}
      </Sheet>
    </>
  );
}
