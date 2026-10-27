"use client";

import { Check, ExternalLink, KeyRound } from "lucide-react";
import { useState } from "react";
import { formatNaira } from "@sotechy/shared";
import { Illo } from "@/components/illustrations";
import { RelTime } from "@/components/rel-time";
import { buttonClass, Card, DataTable, Field, inputClass, PageHeader, Pill, StatCard } from "@/components/ui";
import { FEE, formatTokens, reserve, reserveHealth, TOKEN_EVENT, TOKEN_VALUE, tokenEvents, tokens } from "@/lib/marketplace";

/** Half-circle gauge of how much of the token value the reserve covers */
function CoverGauge({ cover }: { cover: number }) {
  const pct = Math.min(cover, 1.5) / 1.5;
  const angle = Math.PI * (1 - pct);
  const x = 60 + 48 * Math.cos(angle);
  const y = 60 - 48 * Math.sin(angle);
  const ok = cover >= 1;
  return (
    <svg viewBox="0 0 120 70" className="w-full max-w-[220px]">
      <path d="M12 60 A48 48 0 0 1 108 60" fill="none" stroke="#f2ede6" strokeWidth="12" strokeLinecap="round" />
      <path d={`M12 60 A48 48 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}`} fill="none" stroke={ok ? "#1c8a4c" : "#f7931e"} strokeWidth="12" strokeLinecap="round" />
      {/* 100% mark */}
      <line x1={60 + 40 * Math.cos(Math.PI / 3)} y1={60 - 40 * Math.sin(Math.PI / 3)} x2={60 + 56 * Math.cos(Math.PI / 3)} y2={60 - 56 * Math.sin(Math.PI / 3)} stroke="#3a322c" strokeWidth="2" />
    </svg>
  );
}

export default function TokensPage() {
  const health = reserveHealth();
  const [fee, setFee] = useState(FEE.rate * 100);
  const [reserveShare, setReserveShare] = useState(FEE.reserveShare * 100);
  const [bonus, setBonus] = useState(FEE.maxReviewBonus * 100);
  const [cross, setCross] = useState(FEE.crossBonus * 100);
  const [signed, setSigned] = useState(false);
  const changed = fee !== FEE.rate * 100 || reserveShare !== FEE.reserveShare * 100 || bonus !== FEE.maxReviewBonus * 100 || cross !== FEE.crossBonus * 100;
  const newValue = (fee / 100) * (reserveShare / 100) / (1 + bonus / 100);

  return (
    <>
      <PageHeader
        illo="coin"
        title="Tokens & reserve"
        description="Every store's $TICKER token on Monad, the reserve that backs them, and the fee settings. The numbers fill in once the token contract is live on Monad."
      />

      <div className="mb-6 grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <Card title="Reserve cover">
          <div className="flex flex-col items-center text-center">
            <CoverGauge cover={health.cover ?? 1} />
            <p className={`font-display -mt-2 text-4xl font-extrabold ${health.cover === null || health.cover >= 1 ? "text-good" : "text-brand-strong"}`}>{health.cover === null ? "—" : `${Math.round(health.cover * 100)}%`}</p>
            <p className="mt-1 max-w-xs text-sm text-muted">
              The reserve holds {formatNaira(reserve.walletNaira)} against {formatNaira(Math.round(health.outstanding))} of tokens customers could spend. Above 100% means every token is backed.
            </p>
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-3">
          <StatCard illo="bank" tone="brand" label="Reserve wallet" value={formatNaira(reserve.walletNaira)} hint={reserve.wallet} />
          <StatCard illo="coin" label="Tokens owed, at store value" value={formatNaira(Math.round(health.outstanding))} hint={`1 token = ₦${TOKEN_VALUE.toFixed(5)}`} />
          <StatCard illo="sparkle" tone="info" label="Recycling pool" value={formatTokens(reserve.recyclingPool)} hint="Half of every spent token" />
          <StatCard illo="receipt" tone="good" label="Walk-in mints this month" value={formatTokens(reserve.posMintsThisMonth)} hint="Only after the merchant pays 2%" />
        </div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card title="Token registry" description="One token per store. Sotechy's $SOTECHY is also given as a 10% bonus at other stores." padded={false}>
          <div className="px-5 pb-5">
            <DataTable
              rows={tokens}
              columns={[
                {
                  header: "Token",
                  cell: (t) => (
                    <span className="flex flex-wrap items-baseline gap-x-2 md:block">
                      <span className="font-display font-bold text-brand-strong md:block">${t.ticker}</span>
                      <span className="text-xs font-normal text-muted">{t.merchant}</span>
                    </span>
                  ),
                },
                { header: "With customers", cell: (t) => <span className="font-semibold">{formatTokens(t.circulating)}</span> },
                { header: "Pending", cell: (t) => <span className="text-muted">{formatTokens(t.pending)}</span> },
                { header: "Spent", cell: (t) => formatTokens(t.redeemed) },
                { header: "Holders", cell: (t) => t.holders.toLocaleString() },
                {
                  header: "Contract",
                  hideOnPhone: true,
                  cell: (t) => (
                    <a href="#" className="inline-flex items-center gap-1 whitespace-nowrap font-mono text-xs text-muted hover:text-ink">
                      {t.contract} <ExternalLink size={12} />
                    </a>
                  ),
                },
              ]}
            />
          </div>
        </Card>

        <Card title="Fees and bonuses">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Platform fee (%)">
                <input type="number" step={0.1} min={0} value={fee} onChange={(e) => { setFee(Number(e.target.value)); setSigned(false); }} className={inputClass} />
              </Field>
              <Field label="To the reserve (%)" hint={`Rest is revenue: ${100 - reserveShare}%`}>
                <input type="number" min={0} max={100} value={reserveShare} onChange={(e) => { setReserveShare(Number(e.target.value)); setSigned(false); }} className={inputClass} />
              </Field>
              <Field label="Max review bonus (%)">
                <input type="number" min={0} value={bonus} onChange={(e) => { setBonus(Number(e.target.value)); setSigned(false); }} className={inputClass} />
              </Field>
              <Field label="$SOTECHY at other stores (%)">
                <input type="number" min={0} value={cross} onChange={(e) => { setCross(Number(e.target.value)); setSigned(false); }} className={inputClass} />
              </Field>
            </div>
            <p className="rounded-2xl bg-surface-alt px-3 py-2.5 text-sm">
              Store value per token: <b>₦{newValue.toFixed(5)}</b>
              {changed && <span className="text-muted"> (now ₦{TOKEN_VALUE.toFixed(5)})</span>}. Applies to orders placed after you save.
            </p>
            {signed ? (
              <p className="flex items-center gap-2 rounded-2xl bg-good-soft px-3 py-2.5 text-sm text-good">
                <Check size={16} /> Signed with the admin key and sent to Monad.
              </p>
            ) : (
              <button disabled={!changed} onClick={() => setSigned(true)} className={buttonClass}>
                <KeyRound size={16} /> Sign and save
              </button>
            )}
          </div>
        </Card>
      </div>

      <Card title="Latest token activity">
        <ul className="flex flex-col divide-y divide-line">
          {tokenEvents.map((e) => (
            <li key={e.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft">
                <Illo name="coin" size={26} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">
                  {formatTokens(e.amount)} ${e.ticker}
                </span>
                <span className="text-xs text-muted">
                  {e.who} · <RelTime iso={e.at} />
                </span>
              </span>
              <Pill tone={TOKEN_EVENT[e.kind].tone}>{TOKEN_EVENT[e.kind].label}</Pill>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
