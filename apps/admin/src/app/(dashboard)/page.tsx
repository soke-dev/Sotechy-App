import Link from "next/link";
import { AlertTriangle, ArrowRight, PackagePlus, ScanBarcode } from "lucide-react";
import { formatNaira, type AppFeatures } from "@sotechy/shared";
import { Illo, type IlloName } from "@/components/illustrations";
import { Card, ErrorNote, Pill, StatCard } from "@/components/ui";
import type { Queue } from "@/components/queue-context";
import { fromApiOrder, OrderList } from "@/components/order-list";
import { getCurrentUser, load } from "@/lib/api";
import { FEE, reserve, reserveHealth } from "@/lib/marketplace";
import type { AdminOrderRow, SalesSummary } from "@/lib/types";

function StatusDot({ on, label }: { on: boolean; label: string }) {
  return <Pill tone={on ? "good" : "warn"}>{label}</Pill>;
}

/** A queue of things waiting for a decision, with a link to work through it */
function Decision({ href, illo, count, title, hint }: { href: string; illo: IlloName; count: number; title: string; hint: string }) {
  return (
    <Link href={href} className={`group flex min-w-0 items-center gap-3 rounded-3xl border bg-surface p-4 transition hover:shadow-[0_8px_24px_rgba(23,18,14,0.06)] ${count ? "border-brand/40" : "border-line"}`}>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft">
        <Illo name={illo} size={32} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="font-display text-2xl font-bold">{count}</span>
          <span className="truncate text-sm font-semibold">{title}</span>
        </span>
        <span className="line-clamp-2 block text-xs text-muted">{hint}</span>
      </span>
      <ArrowRight size={17} className="shrink-0 text-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
    </Link>
  );
}

/** Marketplace stores' paid orders in the last 30 days */
function marketplaceSales(rows: AdminOrderRow[]) {
  const monthAgo = Date.now() - 30 * 86_400_000;
  return rows
    .filter((o) => o.merchantId && ["paid", "processing", "ready_for_pickup", "dispatched", "delivered"].includes(o.status) && new Date(o.createdAt).getTime() > monthAgo)
    .reduce((n, o) => n + o.total, 0);
}

export default async function DashboardPage() {
  const [summary, orders, switches, user, waiting, stores, failed] = await Promise.all([
    load<SalesSummary>("/admin/reports/summary"),
    load<AdminOrderRow[]>("/admin/orders"),
    load<{ features: AppFeatures }>("/admin/features"),
    getCurrentUser(),
    load<Queue>("/admin/queue"),
    load<{ status: string }[]>("/admin/merchants"),
    load<{ payouts: { status: string }[] }>("/admin/payouts?status=failed"),
  ]);
  const queue = waiting.data ?? { merchants: 0, zones: 0, cases: 0 };
  const s = summary.data;
  const f = switches.data?.features;
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Africa/Lagos" }).format(new Date()));
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = (user.fullName ?? user.email).split(/[\s@]/)[0];
  const decisions = queue.merchants + queue.zones + queue.cases;
  const health = reserveHealth();
  const failedPayouts = failed.data?.payouts.length ?? 0;
  const liveMerchants = (stores.data ?? []).filter((m) => m.status === "approved");
  const gmv = marketplaceSales(orders.data ?? []);
  const cover = health.cover === null ? "—" : `${Math.round(health.cover * 100)}%`;
  const channelMax = Math.max(1, ...(s?.byChannel ?? []).map((c) => c.revenue));

  return (
    <>
      {/* Control room band */}
      <section className="relative mb-6 overflow-hidden rounded-[28px] bg-panel p-6 text-white sm:p-8">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-brand" />
        <div className="absolute -right-28 -top-32 h-96 w-96 rounded-full border border-white/10" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-sun">Sotechy control room</p>
            <h1 className="mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">
              {greeting}, {firstName}
            </h1>
            <p className="mt-2 text-white/70">
              {decisions ? (
                <>
                  <b className="text-white">{decisions} things</b> are waiting for a decision across the marketplace.
                </>
              ) : (
                "Nothing is waiting for a decision. All clear."
              )}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/pos" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/10 px-5 text-sm font-semibold hover:bg-white/15">
                <ScanBarcode size={16} /> Walk-in sale
              </Link>
              <Link href="/products/new" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold hover:bg-brand-strong">
                <PackagePlus size={16} /> Add product
              </Link>
            </div>
          </div>
          {s && (
            <div className="relative grid w-full grid-cols-2 gap-x-6 gap-y-3 rounded-3xl bg-panel-2 p-5 text-sm ring-1 ring-white/10 sm:w-auto sm:gap-x-8">
              <div>
                <p className="text-white/50">Sotechy revenue, 30 days</p>
                <p className="font-display text-xl font-bold sm:text-2xl">{formatNaira(s.revenue)}</p>
              </div>
              <div>
                <p className="text-white/50">Paid orders</p>
                <p className="font-display text-xl font-bold sm:text-2xl">{s.orders}</p>
              </div>
              <div>
                <p className="text-white/50">Marketplace sales</p>
                <p className="font-display text-xl font-bold sm:text-2xl">{formatNaira(gmv)}</p>
              </div>
              <div>
                <p className="text-white/50">Reserve cover</p>
                <p className={`font-display text-xl font-bold sm:text-2xl ${health.cover === null || health.cover >= 1 ? "text-[#7fdca4]" : "text-sun"}`}>{cover}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Decisions */}
      <section className="mb-6">
        <h2 className="mb-3 flex items-center gap-3 text-lg font-bold">
          Needs a decision
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Decision href="/merchants" illo="store" count={queue.merchants} title="new merchants" hint="Check documents, ID and payout name" />
          <Decision href="/delivery-areas" illo="pin" count={queue.zones} title="delivery areas" hint="Confirm they can really deliver there" />
          <Decision href="/order-reviews" illo="shield" count={queue.cases} title="order reviews" hint="Late accepts, unconfirmed deliveries, paybacks" />
          <Decision href="/merchant-payouts" illo="bank" count={failedPayouts} title="failed payouts" hint="Bank rejected a transfer" />
        </div>
      </section>

      {f && (
        <Link
          href="/switches"
          className={`group mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-3xl border px-5 py-3.5 text-sm transition ${f.maintenance || !f.ordering ? "border-warn/40 bg-warn-soft" : "border-line bg-surface hover:border-faint"}`}
        >
          {f.maintenance && <AlertTriangle size={17} className="text-bad" />}
          <span className="font-semibold">Customer app</span>
          {f.maintenance ? <StatusDot on={false} label="Maintenance screen on" /> : <StatusDot on label="Live" />}
          <StatusDot on={f.ordering} label={f.ordering ? "Ordering on" : "Ordering paused"} />
          <StatusDot on={f.delivery} label={`Delivery ${f.delivery ? "on" : "off"}`} />
          <StatusDot on={f.pickup} label={`Pickup ${f.pickup ? "on" : "off"}`} />
          <span className="ml-auto inline-flex items-center gap-1 font-semibold text-muted group-hover:text-ink">
            App switches <ArrowRight size={15} />
          </span>
        </Link>
      )}

      {summary.error && <ErrorNote error={`Sales summary: ${summary.error}`} />}
      {s && (
        <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard illo="wallet" tone="brand" label="Revenue, 30 days" value={formatNaira(s.revenue)} hint={`${s.orders} paid orders`} />
          <StatCard illo="receipt" label="Average order" value={formatNaira(s.averageOrderValue)} />
          <StatCard illo="card" tone="warn" label="Awaiting payment" value={s.pendingPayments.count} hint={formatNaira(s.pendingPayments.value)} />
          <StatCard illo="box" tone={s.lowStockItems ? "warn" : "neutral"} label="Low-stock items" value={s.lowStockItems} />
          <StatCard illo="coin" tone="good" label="Gross profit" value={s.grossProfit == null ? "—" : formatNaira(s.grossProfit)} hint={s.grossProfit == null ? `${s.itemsMissingCost} sold items have no cost price` : undefined} />
          <StatCard illo="bank" label="Refunds" value={formatNaira(s.refunds.value)} hint={`${s.refunds.count} processed`} />
          <StatCard illo="doc" label="Cancelled orders" value={s.cancelledOrders} />
          <StatCard illo="heart" tone="good" label="Repeat customers" value={s.repeatCustomers} />
        </div>
      )}

      <div className="mb-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card title="Where sales come from" description="Sotechy's own store, last 30 days">
          {s && s.byChannel.length ? (
            <div className="flex flex-col gap-4">
              {s.byChannel.map((c) => (
                <div key={c.channel}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-semibold">{c.channel === "online" ? "Sotechy app" : "Walk-in (POS)"}</span>
                    <span className="text-muted">
                      {c.orders} orders · <b className="text-ink">{formatNaira(c.revenue)}</b>
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-surface-alt">
                    <div className={`h-full rounded-full ${c.channel === "online" ? "bg-brand" : "bg-ink-2"}`} style={{ width: `${(c.revenue / channelMax) * 100}%` }} />
                  </div>
                </div>
              ))}
              {s.bestSellers.length > 0 && (
                <div className="mt-2 border-t border-line pt-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Best sellers</p>
                  <ol className="flex flex-col gap-2 text-sm">
                    {s.bestSellers.slice(0, 5).map((b, i) => (
                      <li key={b.product_name} className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-alt text-xs font-bold">{i + 1}</span>
                        <span className="min-w-0 flex-1 truncate">{b.product_name}</span>
                        <span className="text-muted">{b.quantity} sold</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted">No sales in the last 30 days yet.</p>
          )}
        </Card>

        <Card title="Marketplace">
          <div className="flex flex-col gap-4 text-sm">
            <div className="flex items-center gap-3 rounded-2xl bg-brand-soft p-4">
              <Illo name="coin" size={40} />
              <div>
                <p className="text-xs text-muted">Fees this month ({FEE.rate * 100}%)</p>
                <p className="font-display text-xl font-bold sm:text-2xl">{formatNaira(reserve.feesThisMonth.total)}</p>
                <p className="text-xs text-muted">
                  {formatNaira(reserve.feesThisMonth.reserve)} to the reserve · {formatNaira(reserve.feesThisMonth.revenue)} revenue
                </p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-muted">Live merchants</dt>
                <dd className="font-semibold">{liveMerchants.length}</dd>
              </div>
              <div>
                <dt className="text-muted">Reserve wallet</dt>
                <dd className="font-semibold">{formatNaira(reserve.walletNaira)}</dd>
              </div>
              <div>
                <dt className="text-muted">Tokens owed at store value</dt>
                <dd className="font-semibold">{formatNaira(Math.round(health.outstanding))}</dd>
              </div>
              <div>
                <dt className="text-muted">Cover</dt>
                <dd className="font-semibold text-good">{cover}</dd>
              </div>
            </dl>
            <Link href="/tokens" className="inline-flex items-center gap-1 font-semibold text-brand-strong hover:underline">
              Tokens & reserve <ArrowRight size={15} />
            </Link>
          </div>
        </Card>
      </div>

      <Card
        title="Recent orders"
        description="The latest orders from Sotechy and every merchant"
        actions={
          <Link href="/orders" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-strong hover:underline">
            All orders <ArrowRight size={15} />
          </Link>
        }
      >
        <ErrorNote error={orders.error} />
        <OrderList
          rows={(orders.data ?? []).map(fromApiOrder).sort((x, y) => y.at.localeCompare(x.at)).slice(0, 8)}
          empty="No orders yet. They'll appear here as soon as customers check out."
        />
      </Card>
    </>
  );
}
