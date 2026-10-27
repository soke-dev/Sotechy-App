"use client";

import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { formatNaira } from "@sotechy/shared";
import { Illo } from "@/components/illustrations";
import { RelTime } from "@/components/rel-time";
import { Card, DataTable, PageHeader, Pill, StatCard } from "@/components/ui";
import { TOKEN_VALUE } from "@sotechy/shared";
import { formatTokens } from "@/lib/marketplace";

export interface TokenRow {
  tokenId: number;
  ticker: string;
  store: string;
  supply: number;
  minted: number;
  holders: number;
  onChain: boolean;
}

export interface ReserveSummary {
  balance: number;
  tokensHeld: number;
  owed: number;
  cover: number | null;
  recyclePool: number;
  inThisMonth: number;
  outThisMonth: number;
  walkInFeesThisMonth: number;
}

export interface TokenActivity {
  id: string;
  kind: "earned" | "bonus" | "sent" | "spent" | "refunded";
  ticker: string;
  amount: number;
  from: string | null;
  to: string | null;
  at: string;
  txUrl: string | null;
}

const ACTIVITY: Record<TokenActivity["kind"], { label: string; tone: "good" | "info" | "neutral" | "warn" | "bad" }> = {
  earned: { label: "Earned", tone: "good" },
  bonus: { label: "$SOTECHY bonus", tone: "info" },
  sent: { label: "Sent", tone: "neutral" },
  spent: { label: "Spent", tone: "warn" },
  refunded: { label: "Taken back", tone: "bad" },
};

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

export function TokensView({
  chain,
  tokens,
  tokensUrl,
  activity,
  rules,
  reserve,
}: {
  reserve: ReserveSummary;
  chain: ReactNode;
  tokens: TokenRow[];
  tokensUrl: string | null;
  activity: TokenActivity[];
  rules: { perNaira: number; crossBonus: number };
}) {

  return (
    <>
      <PageHeader
        illo="coin"
        title="Tokens & reserve"
        description="Every store's $TICKER token and every receipt, written on Monad, and the reserve that backs the tokens."
      />
      {chain}

      <div className="mb-6 grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <Card title="Reserve cover">
          <div className="flex flex-col items-center text-center">
            <CoverGauge cover={reserve.cover ?? 1} />
            <p className={`font-display -mt-2 text-4xl font-extrabold ${reserve.cover === null || reserve.cover >= 1 ? "text-good" : "text-brand-strong"}`}>{reserve.cover === null ? "—" : `${Math.round(reserve.cover * 100)}%`}</p>
            <p className="mt-1 max-w-xs text-sm text-muted">
              The reserve holds {formatNaira(reserve.balance)} against {formatNaira(Math.round(reserve.owed))} of tokens customers could spend. Above 100% means every token is backed.
            </p>
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-3">
          <StatCard illo="bank" tone="brand" label="Reserve" value={formatNaira(reserve.balance)} hint={`+${formatNaira(reserve.inThisMonth)} in, −${formatNaira(reserve.outThisMonth)} out this month`} />
          <StatCard illo="coin" label="Tokens owed, at store value" value={formatNaira(Math.round(reserve.owed))} hint={`${formatTokens(reserve.tokensHeld)} tokens · 1 = ₦${TOKEN_VALUE.toFixed(5)}`} />
          <StatCard illo="sparkle" tone="info" label="Recycling pool" value={formatTokens(reserve.recyclePool)} hint="Half of every spent token; pays review bonuses" />
          <StatCard illo="receipt" tone="good" label="Walk-in fees this month" value={formatNaira(reserve.walkInFeesThisMonth)} hint="Stores' 1%, all of it to the reserve" />
        </div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card title="Tokens" description="One per store, created on Monad when you approve the store. $SOTECHY is Sotechy's own." padded={false}>
          <div className="px-5 pb-5">
            <DataTable
              rows={tokens}
              empty="No tokens yet"
              columns={[
                {
                  header: "Token",
                  cell: (t) => (
                    <span className="flex flex-wrap items-baseline gap-x-2 md:block">
                      <span className="font-display font-bold text-brand-strong md:block">${t.ticker}</span>
                      <span className="text-xs font-normal text-muted">{t.store}</span>
                    </span>
                  ),
                },
                { header: "With customers", cell: (t) => <span className="font-semibold">{formatTokens(t.supply)}</span> },
                { header: "Earned in all", cell: (t) => formatTokens(t.minted) },
                { header: "Holders", cell: (t) => t.holders.toLocaleString() },
                {
                  header: "On chain",
                  hideOnPhone: true,
                  cell: (t) =>
                    t.onChain && tokensUrl ? (
                      <a href={tokensUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-good hover:underline">
                        Token #{t.tokenId} <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span className="text-xs text-muted">Being created</span>
                    ),
                },
              ]}
            />
          </div>
        </Card>

        <Card title="How tokens are earned">
          <ul className="flex flex-col gap-3 text-sm">
            <li className="rounded-2xl bg-surface-alt px-4 py-3">
              <b>{rules.perNaira} token per ₦1</b> of goods in the store&apos;s own token, when the order is delivered. Delivery fees don&apos;t earn.
            </li>
            <li className="rounded-2xl bg-surface-alt px-4 py-3">
              <b>{Math.round(rules.crossBonus * 100)}% more in $SOTECHY</b> on orders from other stores.
            </li>
            <li className="rounded-2xl bg-surface-alt px-4 py-3">
              <b>5% for a review</b> of a delivered item, 10% with a photo, paid from the recycling pool first.
            </li>
            <li className="rounded-2xl bg-surface-alt px-4 py-3">
              Customers <b>pay with tokens</b> at the store that issued them ($SOTECHY anywhere). The store is still paid in full; the reserve covers the tokens. At least ₦100 of every order is paid in money.
            </li>
            <li className="rounded-2xl bg-surface-alt px-4 py-3">Walk-in sales earn tokens once the store pays 1% of the sale, which all goes to the reserve. A refunded order takes back what it earned. Customers can send tokens to each other by @username.</li>
          </ul>
          <p className="mt-3 text-xs text-muted">Store value per token: ₦{TOKEN_VALUE.toFixed(5)}.</p>
        </Card>
      </div>

      <Card title="Latest token activity">
        {activity.length === 0 ? (
          <p className="text-sm text-muted">Nothing yet. Tokens are earned as orders get delivered.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {activity.map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft">
                  <Illo name="coin" size={26} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">
                    {formatTokens(e.amount)} ${e.ticker}
                  </span>
                  <span className="text-xs text-muted">
                    {e.kind === "sent" ? `${e.from} → ${e.to}` : (e.to ?? e.from)} · <RelTime iso={e.at} />
                    {e.txUrl && (
                      <>
                        {" · "}
                        <a href={e.txUrl} target="_blank" rel="noreferrer" className="hover:text-ink hover:underline">
                          on Monad
                        </a>
                      </>
                    )}
                  </span>
                </span>
                <Pill tone={ACTIVITY[e.kind].tone}>{ACTIVITY[e.kind].label}</Pill>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
