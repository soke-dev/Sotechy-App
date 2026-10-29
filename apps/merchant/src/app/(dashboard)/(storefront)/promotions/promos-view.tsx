"use client";

// The store's own promo codes: customers type them at checkout for money off this store's products.
// The store gives the discount: its payout is on the discounted price.
import { Copy, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Promotion } from "@sotechy/shared";
import { btn, Card, EmptyState, Field, inputClass, PageHeader, Pill } from "@/components/ui";
import { createPromo, deletePromo, updatePromo } from "@/lib/market-actions";
import { formatNaira } from "@/lib/money";

const fmtDate = (d: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(d));
const off = (p: Promotion) => (p.discountType === "percentage" ? `${p.value}% off` : `${formatNaira(p.value)} off`);

function state(p: Promotion, now: number) {
  if (!p.isActive) return { label: "Off", tone: "neutral" as const };
  if (p.endsAt && new Date(p.endsAt).getTime() < now) return { label: "Ended", tone: "neutral" as const };
  if (p.usageLimit != null && p.usageCount >= p.usageLimit) return { label: "Used up", tone: "warn" as const };
  if (p.startsAt && new Date(p.startsAt).getTime() > now) return { label: "Starts later", tone: "info" as const };
  return { label: "Running", tone: "good" as const };
}

export function PromosView({ promos }: { promos: Promotion[] }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(promos.length === 0);
  const [form, setForm] = useState({ name: "", code: "", discountType: "percentage" as "percentage" | "fixed", value: "", maxDiscountAmount: "", minOrderAmount: "", usageLimit: "", endsAt: "" });
  const [now] = useState(() => Date.now());
  const num = (v: string) => (v.trim() ? Number(v) : null);

  const create = () =>
    start(async () => {
      setError(null);
      const r = await createPromo({
        name: form.name.trim() || form.code.trim().toUpperCase(),
        code: form.code.trim(),
        discountType: form.discountType,
        value: Number(form.value),
        maxDiscountAmount: num(form.maxDiscountAmount),
        minOrderAmount: num(form.minOrderAmount),
        usageLimit: num(form.usageLimit),
        endsAt: form.endsAt ? new Date(`${form.endsAt}T23:59:00+01:00`).toISOString() : null,
        isActive: true,
      });
      if ("error" in r) return setError(r.error);
      setForm({ name: "", code: "", discountType: "percentage", value: "", maxDiscountAmount: "", minOrderAmount: "", usageLimit: "", endsAt: "" });
      setCreating(false);
      router.refresh();
    });
  const act = (fn: () => Promise<{ ok: unknown } | { error: string }>) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if ("error" in r) setError(r.error);
      router.refresh();
    });

  const valid = form.code.trim().length >= 3 && Number(form.value) > 0 && (form.discountType !== "percentage" || Number(form.value) <= 90);

  return (
    <>
      <PageHeader
        illo="tag"
        title="Promo codes"
        description="Give customers a code for money off your products. They type it at checkout; the discount comes off what you're paid for that order."
        actions={
          !creating && (
            <button onClick={() => setCreating(true)} className={btn.primary}>
              <Plus size={17} /> New promo code
            </button>
          )
        }
      />
      {error && <p className="mb-4 rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}

      {creating && (
        <Card title="New promo code" className="mb-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field required label="Code" hint="Letters and numbers, e.g. KEMI10">
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase() })} maxLength={20} className={`${inputClass} font-semibold tracking-wide`} placeholder="KEMI10" />
            </Field>
            <Field label="Name (for you)">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} className={inputClass} placeholder="e.g. Weekend sale" />
            </Field>
            <Field required label="Discount">
              <div className="flex gap-2">
                <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value as "percentage" | "fixed" })} className={`${inputClass} w-28`}>
                  <option value="percentage">%</option>
                  <option value="fixed">₦</option>
                </select>
                <input type="number" min={1} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className={inputClass} placeholder={form.discountType === "percentage" ? "10" : "2000"} />
              </div>
            </Field>
            <Field label="Max discount (₦)">
              <input type="number" min={1} value={form.maxDiscountAmount} onChange={(e) => setForm({ ...form, maxDiscountAmount: e.target.value })} className={inputClass} placeholder="No limit" />
            </Field>
            <Field label="Minimum order (₦)">
              <input type="number" min={1} value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })} className={inputClass} placeholder="Any order" />
            </Field>
            <Field label="How many times it can be used">
              <input type="number" min={1} value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} className={inputClass} placeholder="Unlimited" />
            </Field>
            <Field label="Last day">
              <input type="date" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} className={inputClass} />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button disabled={!valid || busy} onClick={create} className={btn.primary}>
              {busy ? "Saving…" : "Create code"}
            </button>
            {promos.length > 0 && (
              <button onClick={() => setCreating(false)} className={btn.outline}>
                Cancel
              </button>
            )}
            <p className="text-xs text-muted">It works only on your products, and starts straight away.</p>
          </div>
        </Card>
      )}

      {promos.length === 0 && !creating ? (
        <EmptyState illo="tag" title="No promo codes yet" message="Make one to share with your customers on WhatsApp or Instagram." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {promos.map((p) => {
            const st = state(p, now);
            const used = p.usageLimit ? Math.min(100, Math.round((p.usageCount / p.usageLimit) * 100)) : null;
            return (
              <div key={p.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <button type="button" onClick={() => p.code && navigator.clipboard?.writeText(p.code)} title="Copy code" className="min-w-0 text-left">
                    <span className="flex items-center gap-1.5 font-display text-xl font-extrabold tracking-wide">
                      {p.code} <Copy size={14} className="text-muted" />
                    </span>
                    <span className="block truncate text-sm text-muted">{p.name}</span>
                  </button>
                  <Pill tone={st.tone}>{st.label}</Pill>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-bold text-brand-strong">{off(p)}</span>
                  {p.maxDiscountAmount ? <span className="rounded-full bg-surface-alt px-2.5 py-1 text-xs">max {formatNaira(p.maxDiscountAmount)}</span> : null}
                  {p.minOrderAmount ? <span className="rounded-full bg-surface-alt px-2.5 py-1 text-xs">orders from {formatNaira(p.minOrderAmount)}</span> : null}
                  {p.endsAt ? <span className="rounded-full bg-surface-alt px-2.5 py-1 text-xs">until {fmtDate(p.endsAt)}</span> : null}
                </div>
                <div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">Used</span>
                    <span className="font-semibold">
                      {p.usageCount}
                      {p.usageLimit ? ` of ${p.usageLimit}` : " times"}
                    </span>
                  </div>
                  {used !== null && (
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-alt">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${used}%` }} />
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
                  <button disabled={busy} onClick={() => act(() => updatePromo(p.id, { isActive: !p.isActive }))} className="text-sm font-semibold text-brand-strong hover:underline">
                    {p.isActive ? "Turn off" : "Turn on"}
                  </button>
                  <button disabled={busy} onClick={() => confirm(`Delete ${p.code}?`) && act(() => deletePromo(p.id))} className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-bad">
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
