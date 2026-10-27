// One customer: who they are, their orders, their tokens and everything that happened to them.
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { formatDate, formatNaira, ORDER_STATUS_LABELS, TOKEN_VALUE, type OrderStatus, type User, type WalletView } from "@sotechy/shared";
import { Illo } from "@/components/illustrations";
import { RelTime } from "@/components/rel-time";
import { LiveSwitch } from "@/components/switch";
import { Card, ErrorNote, PageHeader, Pill, StatCard, StatusBadge } from "@/components/ui";
import { load } from "@/lib/api";
import { setCustomerActive } from "../../actions";

interface CustomerDetail {
  user: User & { isActive: boolean; referredBy: string | null };
  stats: { orders: number; delivered: number; spent: number; reviews: number; tickets: number };
  orders: { id: string; number: string; status: OrderStatus; total: number; tokensValue: number; channel: string; createdAt: string; store: string }[];
  addresses: { id: string; label: string | null; recipientName: string; phone: string; line1: string; line2: string | null; city: string; state: string; isDefault: boolean }[];
  wallet: WalletView;
}

const ACTIVITY: Record<string, { label: string; tone: "good" | "info" | "neutral" | "warn" | "bad" }> = {
  earned: { label: "Earned", tone: "good" },
  bonus: { label: "$SOTECHY bonus", tone: "info" },
  review: { label: "Review bonus", tone: "info" },
  walk_in: { label: "Walk-in", tone: "good" },
  spent: { label: "Spent", tone: "warn" },
  returned: { label: "Given back", tone: "neutral" },
  received: { label: "Received", tone: "good" },
  sent: { label: "Sent", tone: "neutral" },
  refunded: { label: "Taken back", tone: "bad" },
};

const tokens = (n: number) => n.toLocaleString("en-NG");
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await load<CustomerDetail>(`/admin/customers/${id}`);
  if (!data) return <ErrorNote error={error ?? "Customer not found"} />;
  const { user, stats, orders, addresses, wallet } = data;
  const held = wallet.balances.reduce((n, b) => n + b.amount, 0);

  return (
    <>
      <Link href="/customers" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft size={15} /> Customers
      </Link>
      <PageHeader
        illo="user"
        title={user.fullName ?? user.email}
        description={[user.username && `@${user.username}`, user.email, user.phone].filter(Boolean).join(" · ")}
        actions={
          <div className="w-44">
            <LiveSwitch label={user.isActive ? "Can sign in" : "Blocked"} initial={user.isActive} onChange={setCustomerActive.bind(null, user.id)} />
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard illo="cart" label="Orders" value={stats.orders} hint={`${stats.delivered} delivered`} />
        <StatCard illo="wallet" label="Spent" value={formatNaira(stats.spent)} hint="Paid orders" />
        <StatCard illo="coin" tone="brand" label="Tokens held" value={tokens(held)} hint={`≈ ${formatNaira(Math.round(held * TOKEN_VALUE))} to spend`} />
        <StatCard illo="heart" label="Reviews" value={stats.reviews} hint={`${stats.tickets} support request${stats.tickets === 1 ? "" : "s"}`} />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card title="Orders" padded={false}>
          {orders.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-muted">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/orders/${o.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 hover:bg-surface-alt">
                    <span className="font-semibold">{o.number}</span>
                    <StatusBadge status={o.status} />
                    <span className="text-sm text-muted">
                      {o.store} · {formatDate(o.createdAt)}
                    </span>
                    <span className="ml-auto text-right">
                      <span className="block font-semibold">{formatNaira(o.total)}</span>
                      {o.tokensValue > 0 && <span className="block text-xs text-muted">+ {formatNaira(o.tokensValue)} in tokens</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="flex flex-col gap-6">
          <Card title="Tokens">
            {wallet.balances.length === 0 ? (
              <p className="text-sm text-muted">No tokens yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {wallet.balances.map((b) => (
                  <li key={b.ticker} className="flex items-center gap-3 rounded-2xl bg-surface-alt px-4 py-3">
                    <Illo name="coin" size={26} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-display font-bold text-brand-strong">${b.ticker}</span>
                      <span className="block text-xs text-muted">{b.store}</span>
                    </span>
                    <span className="text-right">
                      <span className="block font-semibold">{tokens(b.amount)}</span>
                      {b.pending > 0 && <span className="block text-xs text-warn">+{tokens(b.pending)} on the way</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <a href={wallet.addressUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 font-mono text-xs text-muted hover:text-ink">
              Wallet {short(wallet.address)} <ExternalLink size={12} />
            </a>
          </Card>

          <Card title="Details">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted">Joined</dt>
              <dd>{formatDate(user.createdAt)}</dd>
              <dt className="text-muted">Invited by</dt>
              <dd>{user.referredBy ?? "—"}</dd>
              <dt className="text-muted">WhatsApp</dt>
              <dd>{user.whatsappPhone ?? (user.phone ? "Same as phone" : "—")}</dd>
            </dl>
            {addresses.length > 0 && (
              <ul className="mt-4 flex flex-col gap-2 border-t border-line pt-4 text-sm">
                {addresses.map((a) => (
                  <li key={a.id}>
                    <span className="font-semibold">{a.label ?? a.recipientName}</span>
                    {a.isDefault && <span className="text-muted"> · default</span>}
                    <span className="block text-muted">
                      {[a.line1, a.line2, a.city, a.state].filter(Boolean).join(", ")} · {a.phone}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Card title="Token history">
        {wallet.activity.length === 0 ? (
          <p className="text-sm text-muted">Nothing yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {wallet.activity.map((a) => {
              const k = ACTIVITY[a.kind] ?? ACTIVITY.earned;
              return (
                <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 first:pt-0 last:pb-0">
                  <Pill tone={k.tone}>{k.label}</Pill>
                  <span className="text-sm text-muted">
                    {a.order ?? (a.who ? `@${a.who}` : a.store)} · <RelTime iso={a.at} />
                    {a.txUrl && (
                      <>
                        {" · "}
                        <a href={a.txUrl} target="_blank" rel="noreferrer" className="hover:text-ink hover:underline">
                          on Monad
                        </a>
                      </>
                    )}
                  </span>
                  <span className={`ml-auto font-semibold ${a.amount < 0 ? "text-muted" : "text-good"}`}>
                    {a.amount > 0 ? "+" : "−"}
                    {tokens(Math.abs(a.amount))} ${a.ticker}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
