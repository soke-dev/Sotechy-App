"use client";

import { Check, Copy, Pause, Pencil, Play, Plus, Trash2, Wallet } from "lucide-react";
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
import { usePasswordPrompt } from "@/components/password-prompt";

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
  const [bankRef, setBankRef] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (label: string, text: string) => {
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    });
  };
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

  const { ask, prompt } = usePasswordPrompt();
  // The password is asked before the transition starts: inside it, closing the confirm sheet is
  // held back, and that sheet would cover the password prompt.
  const act = async (id: string, action: "paid" | "hold" | "release" | "settle") => {
    setError(null);
    let password = "";
    if (action !== "hold") {
      const p = list.find((x) => x.id === id);
      setConfirm(null);
      const given = await ask(action === "paid" ? "Mark this payout paid?" : action === "release" ? "Release this payout?" : "Mark as repaid?", p ? `${formatNaira(p.amount)} · ${p.storeName} · ${p.orderNumber}` : undefined);
      if (!given) return;
      password = given;
    }
    start(async () => {
      const r = await payoutAction(id, action, password, action === "paid" ? { reference: bankRef.trim() || undefined } : {});
      if (!("error" in r)) setBankRef("");
      if ("error" in r) setError(r.error);
      setConfirm(null);
      router.refresh();
    });
  };

  return (
    <>
      <PageHeader
        illo="bank"
        title="Store payouts"
        description="Paid by hand for now: you send it from Sotechy's bank, then mark it paid here and the store is told. Part is due when a store accepts an order (with the whole delivery fee), the rest after delivery."
      />
      {prompt}
      {error && <p className="mb-5 rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard illo="wallet" tone="brand" label="Paid out" value={formatNaira(sum(groups.paid))} hint={`${groups.paid.length} payout${groups.paid.length === 1 ? "" : "s"}`} />
        <StatCard illo="bank" tone="info" label="Due now" value={formatNaira(sum(due))} hint={`${due.length} payout${due.length === 1 ? "" : "s"}`} />
        <StatCard illo="bike" tone="neutral" label="Coming up" value={formatNaira(sum(groups.waiting))} hint="Final payments after delivery" />
        <StatCard illo="doc" tone="bad" label="Owed back by stores" value={formatNaira(sum(owed))} hint={owed.length ? `${owed.length} payback${owed.length === 1 ? "" : "s"}` : "Nothing owed"} />
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
                    {(p.status === "scheduled" || p.status === "failed") && p.stage !== "payback" && (
                      <button disabled={busy || !p.accountReady} onClick={() => setConfirm(p)} className={`${primaryButtonClass} min-h-9 px-3`}>
                        <Wallet size={14} /> Pay
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

      {/* Payouts are sent by hand for now: the admin pays from Sotechy's bank, then records it here */}
      <Sheet open={confirm !== null} onClose={() => setConfirm(null)} title="Pay this store">
        {confirm && (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl bg-surface-alt p-4">
              <p className="font-display text-3xl font-extrabold">{formatNaira(confirm.amount)}</p>
              <p className="mt-1 text-sm text-muted">
                {STAGE[confirm.stage]} for {confirm.orderNumber}, {confirm.storeName}
                {new Date(confirm.dueAt).getTime() > now ? <span className="text-warn"> · not due yet, you&apos;re paying early</span> : null}
              </p>
            </div>
            <div className="flex flex-col divide-y divide-line rounded-2xl border border-line">
              {[
                { label: "Bank", value: confirm.bankName },
                { label: "Account number", value: confirm.accountNumber },
                { label: "Account name", value: confirm.accountName },
                { label: "Amount", value: confirm.amount.toFixed(2) },
              ].map((r) => (
                <div key={r.label} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-32 shrink-0 text-sm text-muted">{r.label}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{r.value ?? "—"}</span>
                  {r.value && (
                    <button type="button" onClick={() => copy(r.label, r.value!)} className="flex items-center gap-1 text-xs font-semibold text-brand-strong">
                      {copied === r.label ? <Check size={13} /> : <Copy size={13} />} {copied === r.label ? "Copied" : "Copy"}
                    </button>
                  )}
                </div>
              ))}
            </div>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-semibold text-ink-2">Bank reference (optional)</span>
              <input value={bankRef} onChange={(e) => setBankRef(e.target.value)} placeholder="Session ID or reference from your bank" className={inputClass} />
            </label>
            <p className="text-sm text-muted">Send this from Sotechy&apos;s bank first. Marking it paid tells the store the money is on its way, and it can&apos;t be paid twice here.</p>
            <button disabled={busy} onClick={() => act(confirm.id, "paid")} className={primaryButtonClass}>
              <Check size={15} /> {busy ? "Saving…" : "I've sent it · mark paid"}
            </button>
          </div>
        )}
      </Sheet>
    </>
  );
}

function SettingsCard({ settings, provider }: { settings: PayoutSettings; provider: AdminPayouts["provider"] }) {
  const router = useRouter();
  const { ask, prompt } = usePasswordPrompt();
  const [form, setForm] = useState(settings);
  const [saving, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const changed = JSON.stringify(form) !== JSON.stringify(settings);
  const save = () =>
    start(async () => {
      const password = await ask("Save payout settings?");
      if (!password) return;
      const r = await savePayoutSettings(form, password);
      setMsg("error" in r ? { ok: false, text: r.error } : { ok: true, text: "Saved. New orders use it." });
      router.refresh();
    });
  return (
    <Card title="Payout settings" description="The plan for every store without its own, applied to orders accepted after you save.">
      {prompt}
      <div className="flex flex-col gap-5">
        <p className="rounded-2xl bg-surface-alt px-4 py-3 text-sm text-ink-2">Every payout waits for an admin to approve it. You get an email and a WhatsApp message when one is ready.</p>
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
  const { ask, prompt } = usePasswordPrompt();
  const [editing, setEditing] = useState<{ storeId: string; plan: PayoutPlan } | null>(null);
  const [saving, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const custom = stores.filter((s) => s.payoutPlan);
  const save = (storeId: string, plan: PayoutPlan | null) =>
    start(async () => {
      setError(null);
      const password = await ask(plan ? "Save this store's plan?" : "Put this store back on the standard plan?");
      if (!password) return;
      const r = await setStorePlan(storeId, plan, password);
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
      {prompt}
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
