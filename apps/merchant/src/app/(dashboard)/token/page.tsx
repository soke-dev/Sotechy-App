import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, ExternalLink, Gift, Lock, Receipt } from "lucide-react";
import Link from "next/link";
import { Illo } from "@/components/illustrations";
import { btn, Card, PageHeader, Pill, StatCard } from "@/components/ui";
import { formatNaira, formatTokens, MAX_REVIEW_BONUS, SOTECHY_CROSS_BONUS, timeAgo } from "@/lib/money";
import { store, token, tokenActivity, topHolders } from "@/lib/mock";

const ACTIVITY = {
  mint: { icon: ArrowUpRight, label: "Released", tone: "bg-good-soft text-good" },
  bonus: { icon: Gift, label: "Review bonus", tone: "bg-brand-soft text-brand-strong" },
  redeem: { icon: ArrowDownLeft, label: "Spent", tone: "bg-sky-50 text-sky-700" },
  pos: { icon: Receipt, label: "Walk-in", tone: "bg-good-soft text-good" },
  transfer: { icon: ArrowLeftRight, label: "Transfer", tone: "bg-surface-alt text-ink-2" },
} as const;

export default function TokenPage() {
  const supply = [
    { label: "With customers", value: token.circulating, color: "bg-brand" },
    { label: "Pending release", value: token.pending, color: "bg-sun" },
    { label: "Recycling pool", value: token.recyclingPool, color: "bg-good" },
    { label: "Sotechy reserve wallet", value: token.sotechyReserveWallet, color: "bg-panel" },
  ];
  const total = supply.reduce((n, s) => n + s.value, 0);
  const t = store.ticker;

  return (
    <>
      <PageHeader illo="coin" title={`$${t} token`} description="Your store's own token. Customers earn it when their orders complete and spend it only at your store." />

      <section className="relative mb-6 overflow-hidden rounded-[28px] bg-panel p-6 text-white sm:p-8">
        <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-brand/90" />
        <div className="absolute right-10 top-10 hidden sm:block">
          <Illo name="coin" size={120} />
        </div>
        <div className="relative max-w-lg">
          <p className="text-sm font-semibold uppercase tracking-widest text-sun">{token.name}</p>
          <p className="font-display mt-1 text-5xl font-extrabold">${t}</p>
          <p className="mt-3 text-white/75">
            1 ${t} = <b className="text-white">₦{token.storeValue.toFixed(5)}</b> to spend at {store.name}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-white/10 px-3 py-1.5 font-mono">{token.contract}</span>
            <a href={token.explorer} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 font-semibold hover:bg-white/15">
              View on Monad explorer <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </section>

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard illo="sparkle" label="Released to customers" value={formatTokens(token.issued)} hint={`$${t} all time`} />
        <StatCard illo="user" label="Holders" value={token.holders.toLocaleString()} hint="Customers holding it" />
        <StatCard illo="cart" label="Spent in your store" value={formatTokens(token.redeemed)} hint="Paid to you in naira" />
        <StatCard illo="receipt" label="From walk-in sales" value={formatTokens(token.posMintedThisMonth)} hint="This month" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card title="Where your tokens are" description={`${formatTokens(total)} $${t} in total`}>
          <div className="mb-5 flex h-4 overflow-hidden rounded-full">
            {supply.map((s) => (
              <span key={s.label} className={s.color} style={{ width: `${(s.value / total) * 100}%` }} />
            ))}
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {supply.map((s) => (
              <li key={s.label} className="flex items-center gap-3 rounded-2xl bg-surface-alt px-4 py-3">
                <span className={`h-3 w-3 rounded-full ${s.color}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted">{s.label}</p>
                  <p className="font-semibold">{formatTokens(s.value)}</p>
                </div>
                <span className="text-xs text-muted">{Math.round((s.value / total) * 100)}%</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted">
            When customers spend ${t}, half goes to the recycling pool (used for review bonuses and promotions) and half to Sotechy&apos;s reserve wallet. Nothing is burned.
          </p>
        </Card>

        <Card title="How customers earn it">
          <ol className="flex flex-col gap-3">
            {[
              { illo: "bag" as const, title: "1 per ₦1 spent", body: `Released when their order completes. They also get ${SOTECHY_CROSS_BONUS * 100}% in $SOTECHY.` },
              { illo: "heart" as const, title: `Up to +${MAX_REVIEW_BONUS * 100}% for reviews`, body: "+10% with a photo, +5% without. Only for delivered items." },
              { illo: "receipt" as const, title: "Walk-in sales too", body: "Send tokens for in-store sales from Walk-in sale." },
              { illo: "store" as const, title: "Spent only with you", body: `$${t} buys goods at ${store.name} and nowhere else.` },
            ].map((s) => (
              <li key={s.title} className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft">
                  <Illo name={s.illo} size={28} />
                </span>
                <div>
                  <p className="font-semibold">{s.title}</p>
                  <p className="text-sm text-muted">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card title="Recent activity">
          <ul className="flex flex-col divide-y divide-line">
            {tokenActivity.map((a) => {
              const k = ACTIVITY[a.kind];
              return (
                <li key={a.label + a.at} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${k.tone}`}>
                    <k.icon size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{a.label}</p>
                    <p className="text-xs text-muted">{a.who} · {timeAgo(a.at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatTokens(a.amount)}</p>
                    <a href={token.explorer} target="_blank" rel="noreferrer" className="text-xs font-semibold text-brand-strong hover:underline">Explorer</a>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="flex flex-col gap-6">
          <Card title="Top holders">
            <ol className="flex flex-col gap-2.5">
              {topHolders.map((h, i) => (
                <li key={h.username} className="flex items-center gap-3">
                  <span className="w-5 text-center text-sm font-bold text-muted">{i + 1}</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand-strong">{h.username[0].toUpperCase()}</span>
                  <span className="flex-1 text-sm font-semibold">@{h.username}</span>
                  <span className="text-sm text-ink-2">{formatTokens(h.amount)}</span>
                </li>
              ))}
            </ol>
          </Card>

          <Card title="Reserve for your token">
            <p className="text-sm text-muted">Sotechy sets aside 1% of every sale to pay you when customers spend ${t}.</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-good-soft p-3">
                <p className="text-xs text-good">Held for ${t}</p>
                <p className="font-display text-xl font-bold text-good">{formatNaira(token.reserveNaira)}</p>
              </div>
              <div className="rounded-2xl bg-surface-alt p-3">
                <p className="text-xs text-muted">Value with customers</p>
                <p className="font-display text-xl font-bold">{formatNaira(token.outstandingValueNaira)}</p>
              </div>
            </div>
          </Card>

          <Card title="Name and ticker">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{token.name}</p>
                <p className="text-sm text-muted">${t}</p>
              </div>
              <Pill tone="neutral" dot={false}>
                <Lock size={12} /> Rename: coming soon
              </Pill>
            </div>
            <p className="mt-3 text-xs text-muted">If you rebrand, you&apos;ll be able to rename your token here, with the same balances. Sotechy approves renames.</p>
          </Card>

          <Link href="/walk-in" className={btn.dark}>
            Send ${t} for a walk-in sale
          </Link>
        </div>
      </div>
    </>
  );
}
