import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, ExternalLink, Gift, Lock, Receipt, Undo2 } from "lucide-react";
import Link from "next/link";
import { TOKEN_RULES, TOKEN_VALUE } from "@sotechy/shared";
import { Illo } from "@/components/illustrations";
import { btn, Card, PageHeader, Pill, StatCard } from "@/components/ui";
import { RelTime } from "@/components/rel-time";
import { formatNaira, formatTokens } from "@/lib/money";
import { api, getStoreSession } from "@/lib/api";

interface TokenStats {
  tokenId: number;
  ticker: string;
  withCustomers: number;
  pending: number;
  recyclePool: number;
  reserveWallet: number;
  issued: number;
  spent: number;
  walkInThisMonth: number;
  holders: number;
  topHolders: { username: string | null; amount: number }[];
  reserveNaira: number;
  outstandingNaira: number;
  contractUrl: string | null;
  activity: { id: string; kind: string; amount: number; who: string; at: string }[];
}

const ACTIVITY: Record<string, { icon: typeof ArrowUpRight; label: string; tone: string }> = {
  earned: { icon: ArrowUpRight, label: "Earned on an order", tone: "bg-good-soft text-good" },
  review: { icon: Gift, label: "Review bonus", tone: "bg-brand-soft text-brand-strong" },
  spent: { icon: ArrowDownLeft, label: "Spent in your store", tone: "bg-sky-50 text-sky-700" },
  returned: { icon: Undo2, label: "Given back (order cancelled)", tone: "bg-surface-alt text-ink-2" },
  walk_in: { icon: Receipt, label: "Walk-in sale", tone: "bg-good-soft text-good" },
  sent: { icon: ArrowLeftRight, label: "Sent between customers", tone: "bg-surface-alt text-ink-2" },
  refunded: { icon: Undo2, label: "Taken back (refund)", tone: "bg-bad-soft text-bad" },
};

export default async function TokenPage() {
  const { store } = await getStoreSession();
  const t = store.ticker;

  if (!store.tokenApprovedAt) {
    return (
      <>
        <PageHeader illo="coin" title="Store token" description="Your store's own reward token. Customers earn it when their orders complete and spend it only at your store." />
        <section className="flex flex-col items-start gap-4 rounded-2xl border border-line bg-surface p-6 sm:flex-row sm:items-center sm:p-8">
          <Illo name="coin" size={72} />
          <div className="flex-1">
            <p className="font-display text-xl font-bold">Your token is created when Sotechy approves your store</p>
            <p className="mt-1 text-muted">You choose its ticker in setup. Once your store is approved, the token is created on Monad with that ticker, and it shows here.</p>
          </div>
          <Link href="/onboarding?step=store" className={btn.dark}>
            {store.submittedAt ? "View setup" : "Choose your ticker"}
          </Link>
        </section>
      </>
    );
  }

  const token = await api.get<TokenStats | null>("/merchant/token").catch(() => null);
  const s = token ?? { withCustomers: 0, pending: 0, recyclePool: 0, reserveWallet: 0, issued: 0, spent: 0, walkInThisMonth: 0, holders: 0, topHolders: [], reserveNaira: 0, outstandingNaira: 0, contractUrl: null, activity: [] };
  const supply = [
    { label: "With customers", value: s.withCustomers, color: "bg-brand" },
    { label: "On the way (orders not delivered yet)", value: s.pending, color: "bg-sun" },
    { label: "Recycling pool", value: s.recyclePool, color: "bg-good" },
    { label: "Sotechy reserve wallet", value: s.reserveWallet, color: "bg-panel" },
  ];
  const total = supply.reduce((n, x) => n + x.value, 0);

  return (
    <>
      <PageHeader illo="coin" title={`$${t} token`} description="Your store's own token. Customers earn it when their orders complete and spend it only at your store." />

      <section className="relative mb-6 overflow-hidden rounded-2xl bg-panel p-6 text-white sm:p-8">
        <div className="absolute right-10 top-10 hidden sm:block">
          <Illo name="coin" size={120} />
        </div>
        <div className="relative max-w-lg">
          <p className="text-sm font-semibold uppercase tracking-widest text-sun">{store.name} Token</p>
          <p className="font-display mt-1 text-5xl font-extrabold">${t}</p>
          <p className="mt-3 text-white/75">
            1 ${t} = <b className="text-white">₦{TOKEN_VALUE.toFixed(5)}</b> to spend at {store.name}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
            {token && s.contractUrl ? (
              <a href={s.contractUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 font-semibold hover:bg-white/15">
                View ${t} on the blockchain <ExternalLink size={14} />
              </a>
            ) : (
              <span className="rounded-full bg-white/10 px-3 py-1.5">Being created on the blockchain</span>
            )}
          </div>
        </div>
      </section>

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard illo="coin" label="Earned by customers" value={formatTokens(s.issued)} hint={`$${t} all time`} />
        <StatCard illo="user" label="Holders" value={s.holders.toLocaleString()} hint="Customers holding it now" />
        <StatCard illo="cart" label="Spent in your store" value={formatTokens(s.spent)} hint="You're paid for it in naira" />
        <StatCard illo="receipt" label="From walk-in sales" value={formatTokens(s.walkInThisMonth)} hint="This month" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card title="Where your tokens are" description={`${formatTokens(total)} $${t} in total`}>
          {total > 0 ? (
            <div className="mb-5 flex h-4 overflow-hidden rounded-full">
              {supply.map((x) => (
                <span key={x.label} className={x.color} style={{ width: `${(x.value / total) * 100}%` }} />
              ))}
            </div>
          ) : (
            <div className="mb-5 h-4 rounded-full bg-surface-alt" />
          )}
          <ul className="grid gap-3 sm:grid-cols-2">
            {supply.map((x) => (
              <li key={x.label} className="flex items-center gap-3 rounded-2xl bg-surface-alt px-4 py-3">
                <span className={`h-3 w-3 rounded-full ${x.color}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted">{x.label}</p>
                  <p className="font-semibold">{formatTokens(x.value)}</p>
                </div>
                <span className="text-xs text-muted">{total ? Math.round((x.value / total) * 100) : 0}%</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted">
            When customers spend ${t}, the tokens go to Sotechy&apos;s reserve wallet, and once the order is delivered half move to the recycling pool, which pays review bonuses before anything new is created.
          </p>
        </Card>

        <Card title="How customers earn it">
          <ol className="flex flex-col gap-3">
            {[
              { illo: "bag" as const, title: "1 per ₦1 spent", body: `Released when their order is delivered. They also get ${TOKEN_RULES.crossBonus * 100}% in $SOTECHY.` },
              { illo: "heart" as const, title: `Up to +${TOKEN_RULES.photoReviewBonus * 100}% for reviews`, body: `+${TOKEN_RULES.photoReviewBonus * 100}% with a photo, +${TOKEN_RULES.reviewBonus * 100}% without. Only for delivered items.` },
              { illo: "receipt" as const, title: "Walk-in sales too", body: "Send tokens for in-store sales from Walk-in sale." },
              { illo: "store" as const, title: "Spent only with you", body: `$${t} buys goods at ${store.name} and nowhere else. You're still paid the full price.` },
            ].map((x) => (
              <li key={x.title} className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft">
                  <Illo name={x.illo} size={28} />
                </span>
                <div>
                  <p className="font-semibold">{x.title}</p>
                  <p className="text-sm text-muted">{x.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card title="Recent activity">
          {s.activity.length === 0 ? (
            <p className="text-sm text-muted">Nothing yet. Tokens are earned as your orders get delivered.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {s.activity.map((a) => {
                const k = ACTIVITY[a.kind] ?? ACTIVITY.earned;
                return (
                  <li key={a.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${k.tone}`}>
                      <k.icon size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{k.label}</p>
                      <p className="text-xs text-muted">
                        {a.who} · <RelTime iso={a.at} />
                      </p>
                    </div>
                    <p className="text-sm font-semibold">{formatTokens(a.amount)}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="flex flex-col gap-6">
          <Card title="Top holders">
            {s.topHolders.length === 0 ? (
              <p className="text-sm text-muted">No one holds ${t} yet.</p>
            ) : (
              <ol className="flex flex-col gap-2.5">
                {s.topHolders.map((h, i) => (
                  <li key={`${h.username}-${i}`} className="flex items-center gap-3">
                    <span className="w-5 text-center text-sm font-bold text-muted">{i + 1}</span>
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand-strong">{(h.username ?? "?")[0].toUpperCase()}</span>
                    <span className="flex-1 text-sm font-semibold">{h.username ? `@${h.username}` : "A customer"}</span>
                    <span className="text-sm text-ink-2">{formatTokens(h.amount)}</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <Card title="Reserve for your token">
            <p className="text-sm text-muted">Sotechy sets aside 1% of every sale to pay you when customers spend ${t}.</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-good-soft p-3">
                <p className="text-xs text-good">Held for ${t}</p>
                <p className="font-display text-xl font-bold text-good">{formatNaira(s.reserveNaira)}</p>
              </div>
              <div className="rounded-2xl bg-surface-alt p-3">
                <p className="text-xs text-muted">Value with customers</p>
                <p className="font-display text-xl font-bold">{formatNaira(s.outstandingNaira)}</p>
              </div>
            </div>
          </Card>

          <Card title="Name and ticker">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{store.name} Token</p>
                <p className="text-sm text-muted">${t}</p>
              </div>
              <Pill tone="neutral" dot={false}>
                <Lock size={12} /> Fixed
              </Pill>
            </div>
            <p className="mt-3 text-xs text-muted">The ticker was fixed when Sotechy approved your store. If you rebrand, email support@sotechy.shop.</p>
          </Card>

          <Link href="/walk-in" className={btn.dark}>
            Send ${t} for a walk-in sale
          </Link>
        </div>
      </div>
    </>
  );
}
