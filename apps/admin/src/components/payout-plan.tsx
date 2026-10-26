"use client";

// Editor for a payout plan: how much is paid when the merchant accepts, and when Sotechy's fee comes out.
// Shows what the merchant receives on an example order as you change it.
import { AlertTriangle } from "lucide-react";
import { formatNaira } from "@sotechy/shared";
import { FEE, FEE_TIMING, splitByPlan, type FeeTiming, type PayoutPlan } from "@/lib/marketplace";

const PRESETS = [10, 25, 50, 75, 90];
const EXAMPLE = { goods: 100_000, delivery: 5_000 };

export function PlanExample({ plan }: { plan: PayoutPlan }) {
  const s = splitByPlan(EXAMPLE.goods, EXAMPLE.delivery, plan);
  return (
    <div className="rounded-2xl bg-surface-alt p-4 text-sm">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
        On a {formatNaira(EXAMPLE.goods)} order + {formatNaira(EXAMPLE.delivery)} delivery
      </p>
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5">
        <dt>When they accept</dt>
        <dd className="text-right font-display font-bold">{formatNaira(s.first)}</dd>
        <dt className="text-xs text-muted">
          {plan.firstPercent}% of the goods{plan.fee === "first" ? ", less the fee" : plan.fee === "spread" ? ", after the fee" : ""} + delivery
        </dt>
        <dd />
        <dt>When delivery is confirmed</dt>
        <dd className="text-right font-display font-bold">{formatNaira(s.second)}</dd>
        <dt className="text-xs text-muted">The other {100 - plan.firstPercent}%{plan.fee === "last" ? ", less the fee" : ""}</dt>
        <dd />
        <dt className="border-t border-line pt-1.5 text-brand-strong">Sotechy&apos;s fee ({FEE.rate * 100}%)</dt>
        <dd className="border-t border-line pt-1.5 text-right font-bold text-brand-strong">{formatNaira(s.fee)}</dd>
      </dl>
      {s.problem && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-bad-soft px-3 py-2 text-xs text-bad">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          That payment is too small to cover the fee. Move the split or collect the fee from the other payment.
        </p>
      )}
    </div>
  );
}

export function PlanEditor({ plan, onChange }: { plan: PayoutPlan; onChange: (p: PayoutPlan) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold text-ink-2">Paid when they accept</p>
          <p className="font-display text-2xl font-extrabold">
            {plan.firstPercent}%<span className="ml-1 text-sm font-semibold text-muted">then {100 - plan.firstPercent}%</span>
          </p>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={plan.firstPercent}
          onChange={(e) => onChange({ ...plan, firstPercent: Number(e.target.value) })}
          className="w-full accent-[var(--color-brand)]"
          aria-label="Share paid when the merchant accepts"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PRESETS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange({ ...plan, firstPercent: n })}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${plan.firstPercent === n ? "border-ink bg-ink text-white" : "border-line bg-surface hover:border-faint"}`}
            >
              {n}% first
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-ink-2">How Sotechy&apos;s {FEE.rate * 100}% fee is collected</p>
        <div className="flex flex-col gap-2">
          {(Object.keys(FEE_TIMING) as FeeTiming[]).map((k) => (
            <label key={k} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 ${plan.fee === k ? "border-ink bg-surface" : "border-line"}`}>
              <input type="radio" name="fee-timing" checked={plan.fee === k} onChange={() => onChange({ ...plan, fee: k })} className="mt-0.5" />
              <span>
                <span className="block text-sm font-semibold">{FEE_TIMING[k].label}</span>
                <span className="block text-xs text-muted">{FEE_TIMING[k].hint}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <PlanExample plan={plan} />
    </div>
  );
}
