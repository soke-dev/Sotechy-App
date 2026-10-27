"use client";

import { AlertTriangle, Check, Pause, Pencil, Play, Plus, RotateCw, Send, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatNaira, type AdminPayoutRow, type PayoutPlan, type PayoutSettings, type PayoutStatus } from "@sotechy/shared";
import { PlanEditor } from "@/components/payout-plan";
import { RelTime } from "@/components/rel-time";
import { buttonClass, Card, DataTable, inputClass, PageHeader, Pill, primaryButtonClass, secondaryButtonClass, Sheet, StatCard, Tabs } from "@/components/ui";
import { describePlan } from "@/lib/marketplace";
import { StoreAvatar } from "../merchants/merchants-list";
import type { AdminStore } from "../merchants/store-types";
import type { AdminPayouts } from "./page";
import { payoutAction, savePayoutSettings, setStorePlan } from "./actions";

type Tab = "due" | "waiting" | "sending" | "failed" | "held" | "paid" | "paybacks" | "all";

const STATUS: Record<PayoutStatus, { label: string; tone: "good" | "warn" | "bad" | "info" | "brand" | "neutral" }> = {
  scheduled: { label: "Scheduled", tone: "info" },
  sending: { label: "Sending", tone: "brand" },
  paid: { label: "Paid", tone: "good" },
  failed: { label: "Failed", tone: "bad" },
  held: { label: "On hold", tone: "warn" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  owed: { label: "Owed back", tone: "bad" },
  settled: { label: "Settled", tone: "good" },
};
const STAGE = { first: "First payment", final: "Final payment", payback: "Payback" } as const;

export function PayoutsView({ data, stores }: { data: AdminPayouts; stores: AdminStore[] }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("due");
  const [confirm, setConfirm] = useState<AdminPayoutRow | null>(null);
  // Rendered on the server for this request, so "now" is fixed while the page is open
  const [now] = useState(() => Date.now());

  const list = data.payouts;
  const due = list.filter((p) => p.status === "scheduled" && new Date(p.dueAt).getTime() <= now);
  const groups: Record<Tab, AdminPayoutRow[]> = {
    due,
    waiting: list.filter((p) => p.status === "scheduled" && new Date(p.dueAt).getTime() > now),
    sending: list.filter((p) => p.status === "sending"),
    failed: list.filter((p) => p.status === "failed"),
    held: list.filter((p) => p.status === "held"),
    paid: list.filter((p) => p.status === "paid"),
    paybacks: list.filter((p) => p.stage === "payback"),
    all: list,
  };
  const sum = (rows: AdminPayoutRow[]) => rows.reduce((n, p) => n + p.amount, 0);
  const owed = list.filter((p) => p.status === "owed");

  const act = (id: string, action: "send" | "hold" | "release" | "settle") =>
    start(async () => {
      setError(null);
      const r = await payoutAction(id, action);
      if ("error" in r) setError(r.error);
      setConfirm(null);
      router.refresh();
    });

  return (
    <>
      <PageHeader
        illo="bank"
        title="Store payouts"
        description={`Paid through ${data.providerName}: part when a store accepts an order (with the whole delivery fee), the rest after delivery. Each payout has a fixed reference, so nothing can be paid twice.`}
      />

      {!data.ready && (
        <p className="mb-5 flex items-start gap-2 rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn">
          <AlertTriangle size={17} className="mt-0.5 shrink-0" />
          {data.providerName} isn&apos;t connected, so nothing can be sent yet. Add {data.provider === "bachs" ? "BACHS_SECRET_KEY and BACHS_WEBHOOK_SECRET" : "FLUTTERWAVE_SECRET_KEY and FLUTTERWAVE_WEBHOOK_HASH"} to the API service.
        </p>
      )}
      {data.testMode && (
        <p className="mb-5 rounded-2xl bg-surface-alt px-4 py-3 text-sm text-ink-2">Test mode: there&apos;s no {data.providerName} key here, so payouts are pretend and no money moves.</p>
      )}
      {error && <p className="mb-5 rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard illo="wallet" tone="brand" label={`${data.providerName} balance`} value={data.balance == null ? "—" : formatNaira(data.balance)} hint={data.balance != null && data.balance < sum(due) ? "Less than what's due: top it up" : "Available for payouts"} />
        <StatCard illo="bank" tone="info" label="Due now" value={formatNaira(sum(due))} hint={`${due.length} payout${due.length === 1 ? "" : "s"}`} />
        <StatCard illo="bike" tone="neutral" label="Coming up" value={formatNaira(sum(groups.waiting))} hint="Final payments after delivery" />
        <StatCard illo="doc" tone="bad" label="Owed back by stores" value={formatNaira(sum(owed))} hint={groups.failed.length ? `${groups.failed.length} failed transfer${groups.failed.length === 1 ? "" : "s"}` : "No failed transfers"} />
      </div>

      <Card title="Payouts" padded={false} className="mb-6">
        <div className="px-5 pb-5">
          <Tabs
            className="mb-4"
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "due", label: "Due now", count: due.length, urgent: true },
              { id: "waiting", label: "Coming up", count: groups.waiting.length },
              { id: "sending", label: "Sending", count: groups.sending.length },
              { id: "failed", label: "Failed", count: groups.failed.length, urgent: true },
              { id: "held", label: "On hold", count: groups.held.length },
              { id: "paid", label: "Paid", count: groups.paid.length },
              { id: "paybacks", label: "Paybacks", count: groups.paybacks.length },
              { id: "all", label: "All", count: list.length },
            ]}
          />
          <DataTable
            rows={groups[tab]}
            empty={tab === "due" ? "Nothing to send right now." : "Nothing here."}
            columns={[
              {
                header: "Store",
                cell: (p) => (
                  <span className="flex items-center gap-3">
                    <StoreAvatar name={p.storeName} logo={stores.find((s) => s.id === p.merchantId)?.logoUrl} size={36} />
                    <span className="min-w-0">
                      <span className="block font-semibold">{p.storeName}</span>
                      <span className="block text-xs text-muted">
                        {p.accountReady ? (p.accountName ?? "Account checked") : <span className="text-bad">No checked account</span>}
                        {p.bankName ? ` · ${p.bankName} ••••${p.accountLast4}` : ""}
                      </span>
                    </span>
                  </span>
                ),
              },
              {
                header: "Order",
                cell: (p) => (
                  <span className="whitespace-nowrap">
                    {p.orderNumber} <span className="text-muted">· {STAGE[p.stage]}</span>
                  </span>
                ),
              },
              {
                header: "Amount",
                cell: (p) => (
                  <span>
                    <span className="block font-display font-bold">{formatNaira(p.amount)}</span>
                    {p.fee > 0 && <span className="block text-xs text-muted">after {formatNaira(p.fee)} fee</span>}
                  </span>
                ),
              },
              {
                header: "Status",
                cell: (p) => (
                  <span>
                    <Pill tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Pill>
                    {p.failureReason && <span className="mt-1 block max-w-[220px] text-xs text-bad">{p.failureReason}</span>}
                  </span>
                ),
              },
              {
                header: "When",
                cell: (p) => (
                  <span className="text-muted">
                    {p.status === "scheduled" ? "Due " : ""}
                    <RelTime iso={p.paidAt ?? (p.status === "scheduled" ? p.dueAt : (p.sentAt ?? p.createdAt))} />
                  </span>
                ),
              },
              {
                header: "",
                cell: (p) => (
                  <span className="flex justify-end gap-1.5">
                    {(p.status === "scheduled" || p.status === "failed") && (
                      <button disabled={busy || !data.ready || !p.accountReady} onClick={() => setConfirm(p)} className={`${primaryButtonClass} min-h-9 px-3`}>
                        {p.status === "failed" ? <RotateCw size={14} /> : <Send size={14} />} {p.status === "failed" ? "Retry" : "Send"}
                      </button>
                    )}
                    {(p.status === "scheduled" || p.status === "failed") && (
                      <button disabled={busy} onClick={() => act(p.id, "hold")} aria-label="Hold" title="Hold" className={`${secondaryButtonClass} min-h-9 px-3`}>
                        <Pause size={14} />
                      </button>
                    )}
                    {p.status === "held" && (
                      <button disabled={busy} onClick={() => act(p.id, "release")} className={`${secondaryButtonClass} min-h-9 px-3`}>
                        <Play size={14} /> Release
                      </button>
                    )}
                    {p.status === "owed" && (
                      <button disabled={busy} onClick={() => act(p.id, "settle")} className={`${secondaryButtonClass} min-h-9 px-3`}>
                        <Check size={14} /> Mark repaid
                      </button>
                    )}
                  </span>
                ),
              },
            ]}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SettingsCard settings={data.settings} provider={data.provider} />
        <StorePlans stores={stores} settings={data.settings} />
      </div>

      <Sheet open={confirm !== null} onClose={() => setConfirm(null)} title="Send this payout?">
        {confirm && (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl bg-surface-alt p-4">
              <p className="font-display text-3xl font-extrabold">{formatNaira(confirm.amount)}</p>
              <p className="mt-1 text-sm text-ink-2">
                to <span className="font-semibold">{confirm.accountName}</span> · {confirm.bankName ?? "their bank"} ••••{confirm.accountLast4 ?? "····"}
              </p>
              <p className="mt-2 text-sm text-muted">
                {STAGE[confirm.stage]} for {confirm.orderNumber}, {confirm.storeName}
                {new Date(confirm.dueAt).getTime() > now ? <span className="text-warn"> · not due yet, you&apos;re sending it early</span> : null}
              </p>
            </div>
            <p className="text-sm text-muted">This sends real money from the {data.providerName} balance. If the bank refuses it, you can retry safely: it can&apos;t be paid twice.</p>
            <button disabled={busy} onClick={() => act(confirm.id, "send")} className={primaryButtonClass}>
              <Send size={15} /> {busy ? "Sending…" : `Send ${formatNaira(confirm.amount)}`}
            </button>
          </div>
        )}
      </Sheet>
    </>
  );
}

function SettingsCard({ settings, provider }: { settings: PayoutSettings; provider: AdminPayouts["provider"] }) {
  const router = useRouter();
  const [form, setForm] = useState(settings);
  const [saving, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const changed = JSON.stringify(form) !== JSON.stringify(settings);
  const save = () =>
    start(async () => {
      const r = await savePayoutSettings(form);
      setMsg("error" in r ? { ok: false, text: r.error } : { ok: true, text: "Saved. New orders use it." });
      router.refresh();
    });
  return (
    <Card title="Payout settings" description="The plan for every store without its own, applied to orders accepted after you save.">
      <div className="flex flex-col gap-5">
        <label className="flex items-start justify-between gap-4 rounded-2xl border border-line p-4">
          <span>
            <span className="block font-semibold">Send automatically</span>
            <span className="block text-sm text-muted">Due payouts go out by themselves, except to accounts changed in the last day or not in the store&apos;s or owner&apos;s name. Off: you press Send.</span>
          </span>
          <input type="checkbox" checked={form.autoSend} onChange={(e) => setForm({ ...form, autoSend: e.target.checked })} className="mt-1 h-5 w-5 accent-[var(--color-brand)]" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink-2">Sotechy&apos;s fee (%)</span>
            <input type="number" min={0} max={30} step={0.5} value={Math.round(form.feeRate * 1000) / 10} onChange={(e) => setForm({ ...form, feeRate: Math.max(0, Number(e.target.value)) / 100 })} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink-2">Final payment after (hours)</span>
            <input type="number" min={0} max={720} value={form.finalAfterHours} onChange={(e) => setForm({ ...form, finalAfterHours: Math.max(0, Math.round(Number(e.target.value))) })} className={inputClass} />
          </label>
        </div>
        {provider === "bachs" && (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-ink-2">Bank fee Sotechy covers per payout (₦)</span>
            <input type="number" min={0} max={5000} value={form.bankFeeCover} onChange={(e) => setForm({ ...form, bankFeeCover: Math.max(0, Math.round(Number(e.target.value))) })} className={inputClass} />
            <span className="text-xs text-muted">Bachs adds its payout fee on top, so this much goes with each payout and stores get their full amount. Match it to the fee in your Bachs pricing.</span>
          </label>
        )}
        <PlanEditor plan={form.standard} rate={form.feeRate} onChange={(standard) => setForm({ ...form, standard })} />
        {msg && <p className={`rounded-2xl px-4 py-3 text-sm ${msg.ok ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>{msg.text}</p>}
        <div className="flex gap-2">
          <button disabled={!changed || saving} onClick={() => setForm(settings)} className={`${secondaryButtonClass} flex-1`}>
            Undo
          </button>
          <button disabled={!changed || saving} onClick={save} className={`${buttonClass} flex-1`}>
            {saving ? "Saving…" : "Save settings"}
          </button>
        </div>
      </div>
    </Card>
  );
}

function StorePlans({ stores, settings }: { stores: AdminStore[]; settings: PayoutSettings }) {
  const router = useRouter();
  const [editing, setEditing] = useState<{ storeId: string; plan: PayoutPlan } | null>(null);
  const [saving, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const custom = stores.filter((s) => s.payoutPlan);
  const save = (storeId: string, plan: PayoutPlan | null) =>
    start(async () => {
      setError(null);
      const r = await setStorePlan(storeId, plan);
      if ("error" in r) return setError(r.error);
      setEditing(null);
      router.refresh();
    });
  return (
    <Card
      title="Stores with their own plan"
      description="E.g. 90% up front for a trusted store, 10% for a new one."
      actions={
        <button onClick={() => setEditing({ storeId: "", plan: settings.standard })} className={`${secondaryButtonClass} min-h-10`}>
          <Plus size={15} /> Add
        </button>
      }
    >
      {custom.length === 0 ? (
        <p className="text-sm text-muted">Every store is on the standard plan: {describePlan(settings.standard)}.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {custom.map((s) => (
            <li key={s.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <StoreAvatar name={s.name} logo={s.logoUrl} size={40} />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{s.name}</span>
                <span className="block text-xs text-muted">{describePlan(s.payoutPlan!)}</span>
              </span>
              <span className="font-display text-xl font-extrabold">{s.payoutPlan!.firstPercent}%</span>
              <button onClick={() => setEditing({ storeId: s.id, plan: s.payoutPlan! })} aria-label={`Edit ${s.name}'s plan`} className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-alt hover:text-ink">
                <Pencil size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing && stores.find((s) => s.id === editing.storeId)?.payoutPlan ? "Edit store's plan" : "Give a store its own plan"}>
        {editing && (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-semibold text-ink-2">Store</span>
              <select value={editing.storeId} onChange={(e) => setEditing({ ...editing, storeId: e.target.value })} className={`${inputClass} w-full`}>
                <option value="">Choose a store</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (${s.ticker}){s.payoutPlan ? " · has a plan" : ""}
                  </option>
                ))}
              </select>
            </label>
            <PlanEditor plan={editing.plan} rate={settings.feeRate} onChange={(plan) => setEditing({ ...editing, plan })} />
            {error && <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}
            <div className="flex gap-2">
              {stores.find((s) => s.id === editing.storeId)?.payoutPlan && (
                <button disabled={saving} onClick={() => save(editing.storeId, null)} className={secondaryButtonClass}>
                  <Trash2 size={15} /> Use the standard plan
                </button>
              )}
              <button disabled={!editing.storeId || saving} onClick={() => save(editing.storeId, editing.plan)} className={`${primaryButtonClass} flex-1`}>
                {saving ? "Saving…" : "Save plan"}
              </button>
            </div>
          </div>
        )}
      </Sheet>
    </Card>
  );
}
