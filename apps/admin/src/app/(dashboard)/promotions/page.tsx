import { BadgePercent } from "lucide-react";
import { formatDate, formatNaira, PAYMENT_METHOD_LABELS, type Promotion } from "@sotechy/shared";
import { ActionForm } from "@/components/action-form";
import { Card, ErrorNote, Field, inputClass, PageHeader, Pill } from "@/components/ui";
import { load } from "@/lib/api";
import { createPromotion, togglePromotion } from "../actions";

const off = (p: Promotion) => (p.discountType === "percentage" ? `${p.value}% off` : `${formatNaira(p.value)} off`);

/** Where it stands: running, waiting to start, finished, used up or switched off */
function state(p: Promotion, now: number) {
  if (!p.isActive) return { label: "Off", tone: "neutral" as const };
  if (p.endsAt && new Date(p.endsAt).getTime() < now) return { label: "Ended", tone: "neutral" as const };
  if (p.usageLimit != null && p.usageCount >= p.usageLimit) return { label: "Used up", tone: "warn" as const };
  if (p.startsAt && new Date(p.startsAt).getTime() > now) return { label: "Starts later", tone: "info" as const };
  return { label: "Running", tone: "good" as const };
}

export default async function PromotionsPage() {
  const { data, error } = await load<Promotion[]>("/admin/promotions");
  const now = Date.now();
  const promos = data ?? [];
  const mine = promos.filter((p) => !p.merchantId);
  const stores = promos.filter((p) => p.merchantId);

  const list = (rows: Promotion[]) =>
    rows.length === 0 ? (
      <p className="rounded-2xl border-2 border-dashed border-line py-8 text-center text-sm text-muted">None yet.</p>
    ) : (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((p) => {
          const st = state(p, now);
          const used = p.usageLimit ? Math.min(100, Math.round((p.usageCount / p.usageLimit) * 100)) : null;
          return (
            <div key={p.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-display text-xl font-extrabold tracking-wide">{p.code ?? "Automatic"}</p>
                  <p className="truncate text-sm text-muted">{p.name}</p>
                </div>
                <Pill tone={st.tone}>{st.label}</Pill>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-bold text-brand-strong">{off(p)}</span>
                {p.maxDiscountAmount ? <span className="rounded-full bg-surface-alt px-2.5 py-1 text-xs">max {formatNaira(p.maxDiscountAmount)}</span> : null}
                {p.minOrderAmount ? <span className="rounded-full bg-surface-alt px-2.5 py-1 text-xs">orders from {formatNaira(p.minOrderAmount)}</span> : null}
                {p.paymentMethod ? <span className="rounded-full bg-surface-alt px-2.5 py-1 text-xs">{PAYMENT_METHOD_LABELS[p.paymentMethod]}</span> : null}
                {p.storeName ? <span className="rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-white">{p.storeName}</span> : null}
              </div>
              <div className="text-xs text-muted">
                {p.startsAt || p.endsAt ? `${p.startsAt ? formatDate(p.startsAt) : "Now"} → ${p.endsAt ? formatDate(p.endsAt) : "no end"}` : "No end date"}
              </div>
              <div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Used</span>
                  <span className="font-semibold">
                    {p.usageCount}
                    {p.usageLimit ? ` of ${p.usageLimit}` : ""}
                  </span>
                </div>
                {used !== null && (
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-alt">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${used}%` }} />
                  </div>
                )}
              </div>
              <ActionForm action={togglePromotion} submitLabel={p.isActive ? "Turn off" : "Turn on"} className="flex items-center justify-end gap-2">
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="isActive" value={String(!p.isActive)} />
              </ActionForm>
            </div>
          );
        })}
      </div>
    );

  return (
    <>
      <PageHeader icon={BadgePercent} title="Promotions" description="Sotechy's promo codes and discounts, and the codes stores make for their own products (those come out of the store's share)." />
      <ErrorNote error={error} />

      <Card title="New Sotechy promo" description="Leave the code empty to apply it automatically to every eligible order." className="mb-6">
        <ActionForm action={createPromotion} submitLabel="Create promo" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Name"><input name="name" required placeholder="e.g. Back to school" className={inputClass} /></Field>
          <Field label="Code (optional)"><input name="code" placeholder="e.g. SCHOOL10" className={`${inputClass} uppercase`} /></Field>
          <Field label="Type">
            <select name="discountType" className={inputClass}>
              <option value="percentage">Percentage off</option>
              <option value="fixed">Amount off (₦)</option>
            </select>
          </Field>
          <Field label="Value"><input name="value" type="number" step="0.01" required placeholder="10" className={inputClass} /></Field>
          <Field label="Max discount (₦)"><input name="maxDiscountAmount" type="number" placeholder="Optional" className={inputClass} /></Field>
          <Field label="Minimum order (₦)"><input name="minOrderAmount" type="number" placeholder="Optional" className={inputClass} /></Field>
          <Field label="Payment method">
            <select name="paymentMethod" className={inputClass}>
              <option value="">Any</option>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Usage limit"><input name="usageLimit" type="number" placeholder="Unlimited" className={inputClass} /></Field>
          <Field label="Starts"><input name="startsAt" type="datetime-local" className={inputClass} /></Field>
          <Field label="Ends"><input name="endsAt" type="datetime-local" className={inputClass} /></Field>
          <label className="flex items-center gap-2 self-end pb-3 text-sm font-semibold"><input type="checkbox" name="isActive" defaultChecked /> Switch it on now</label>
        </ActionForm>
      </Card>

      <h2 className="mb-3 text-lg font-bold">Sotechy promos</h2>
      <div className="mb-8">{list(mine)}</div>
      <h2 className="mb-3 text-lg font-bold">Stores&apos; promo codes</h2>
      {list(stores)}
    </>
  );
}
