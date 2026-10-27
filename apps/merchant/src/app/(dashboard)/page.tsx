import { ArrowRight, Clock, Sparkles } from "lucide-react";
import Link from "next/link";
import { Illo } from "@/components/illustrations";
import { btn, Card, Pill, ProductThumb, StatCard } from "@/components/ui";
import { RelTime } from "@/components/rel-time";
import { formatNaira, formatTokens } from "@/lib/money";
import { api, getStoreSession } from "@/lib/api";
import { offerThreads, ORDER_STATUS, orderMoney, orderTotal, token } from "@/lib/mock";

export default async function HomePage() {
  const { user, store } = await getStoreSession();
  const [orders, products, { salesByDay }] = await Promise.all([api.merchantOrders(), api.merchantProducts(), api.merchantSummary()]);
  const waiting = orders.filter((o) => o.status === "new");
  const active = orders.filter((o) => ["accepted", "shipped", "delivered"].includes(o.status));
  const sales14 = salesByDay.reduce((n, d) => n + d.amount, 0);
  const maxDay = Math.max(...salesByDay.map((d) => d.amount));
  const owedSecondHalf = active.reduce((n, o) => n + orderMoney(o).share, 0);
  const offersWaiting = offerThreads.filter((t) => t.status === "waiting_you").length;
  const lowStock = products.filter((p) => p.status === "live" && p.stock <= 3);
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Africa/Lagos" }).format(new Date()));
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <>
      {/* Greeting band */}
      <section className="relative mb-6 overflow-hidden rounded-2xl bg-panel p-6 text-white sm:p-8">
        <div className="relative max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-sun">{store.name}</p>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">
            {greeting}
            {user.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-2 text-white/70">
            {waiting.length ? (
              <>
                You have <b className="text-white">{waiting.length} new order{waiting.length === 1 ? "" : "s"}</b> waiting for your answer.
              </>
            ) : (
              "No orders waiting. Nice work."
            )}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/orders" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-strong">
              Review orders <ArrowRight size={16} />
            </Link>
            <Link href="/products/new" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/10 px-5 text-sm font-semibold text-white hover:bg-white/15">
              Add a product
            </Link>
            <Link href="/featured" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/10 px-5 text-sm font-semibold text-white hover:bg-white/15">
              <Sparkles size={15} className="text-sun" /> Get featured
            </Link>
          </div>
        </div>
      </section>

      {/* Orders that need an answer */}
      {waiting.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-lg font-bold">Needs your answer</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {waiting.map((o) => (
              <Link key={o.id} href={`/orders/${o.id}`} className="group flex min-w-0 items-center gap-4 rounded-2xl border-2 border-brand/40 bg-surface p-4 transition hover:border-brand">
                <ProductThumb src={o.items[0].image} size={64} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-display text-lg font-bold">{formatNaira(orderTotal(o))}</p>
                    <span className="text-xs text-muted">{o.number}</span>
                  </div>
                  <p className="truncate text-sm text-ink-2">
                    {o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-1 text-xs font-semibold text-brand-strong">
                    <Clock size={13} /> <RelTime iso={o.acceptBy!} left /> to accept · @{o.customer.username}
                  </p>
                </div>
                <ArrowRight size={18} className="text-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {offersWaiting > 0 && (
        <Link href="/offers" className="mb-6 flex items-center gap-3 rounded-2xl border-2 border-brand/40 bg-surface p-4 transition hover:border-brand">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft">
            <Illo name="tag" size={28} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">
              {offersWaiting} price offer{offersWaiting === 1 ? "" : "s"} waiting
            </span>
            <span className="block text-sm text-muted">Accept, counter or decline. Customers hear back on WhatsApp and email.</span>
          </span>
          <ArrowRight size={18} className="shrink-0 text-faint" />
        </Link>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard accent illo="wallet" label="Sales, last 14 days" value={formatNaira(sales14)} hint={`${orders.filter((o) => o.status === "completed").length} completed orders`} />
        <StatCard illo="bank" label="Owed to you" value={formatNaira(owedSecondHalf)} hint={`From ${active.length} order${active.length === 1 ? "" : "s"} in progress`} />
        <StatCard illo="coin" label={`$${store.ticker} with customers`} value={formatTokens(token.circulating)} hint={`${token.holders} holders`} />
        <StatCard illo="heart" label="Store rating" value="New" hint="Ratings appear after your first reviews" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card title="Sales" description="Last 14 days, before Sotechy's 2% fee">
          {maxDay === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl bg-surface-alt text-center">
              <Illo name="receipt" size={36} />
              <p className="font-semibold">No sales yet</p>
              <p className="max-w-xs text-sm text-muted">Your daily sales show here once orders start coming in.</p>
            </div>
          ) : (
          <div className="flex h-56 items-end gap-1.5 sm:gap-2.5">
            {salesByDay.map((d, i) => (
              <div key={d.day} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
                <span className="hidden whitespace-nowrap rounded-full bg-panel px-2 py-0.5 text-[10px] font-semibold text-white group-hover:block">{formatNaira(d.amount)}</span>
                <div
                  className={`w-full rounded-t-xl ${i === salesByDay.length - 1 ? "bg-brand" : "bg-brand/25 group-hover:bg-brand/50"}`}
                  style={{ height: `${Math.max(6, (d.amount / maxDay) * 100)}%` }}
                />
                <span className="hidden text-[10px] text-muted sm:block">{d.day.split(" ")[0]}</span>
              </div>
            ))}
          </div>
          )}
        </Card>

        <Card title={`Your $${store.ticker} token`} actions={<Link href="/token" className="text-sm font-semibold text-brand-strong hover:underline">Open</Link>}>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 rounded-2xl bg-brand-soft p-4">
              <Illo name="coin" size={44} />
              <div>
                <p className="text-xs font-medium text-muted">Released to customers</p>
                <p className="font-display text-2xl font-bold">{formatTokens(token.issued)} <span className="text-brand-strong">${store.ticker}</span></p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted">Pending release</dt>
                <dd className="font-semibold">{formatTokens(token.pending)}</dd>
              </div>
              <div>
                <dt className="text-muted">Spent in your store</dt>
                <dd className="font-semibold">{formatTokens(token.redeemed)}</dd>
              </div>
            </dl>
            <p className="text-xs text-muted">Customers earn 1 ${store.ticker} per ₦1 when an order completes, and spend it only at {store.name}.</p>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Orders in progress" actions={<Link href="/orders" className="text-sm font-semibold text-brand-strong hover:underline">All orders</Link>}>
          {!active.length && <p className="text-sm text-muted">No orders in progress. Orders you accept show here until they&apos;re delivered.</p>}
          <ul className="flex flex-col divide-y divide-line">
            {active.map((o) => (
              <li key={o.id}>
                <Link href={`/orders/${o.id}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <ProductThumb src={o.items[0].image} size={44} rounded="rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{o.items[0].name}{o.items.length > 1 ? ` +${o.items.length - 1}` : ""}</p>
                    <p className="text-xs text-muted">{o.number} · <RelTime iso={o.createdAt} /></p>
                  </div>
                  <Pill tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Pill>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Running low" actions={<Link href="/products" className="text-sm font-semibold text-brand-strong hover:underline">Products</Link>}>
          {lowStock.length ? (
            <ul className="flex flex-col divide-y divide-line">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <ProductThumb src={p.image} size={44} rounded="rounded-xl" />
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold">{p.name}</p>
                  <Pill tone={p.stock === 0 ? "bad" : "warn"}>{p.stock === 0 ? "Sold out" : `${p.stock} left`}</Pill>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Everything is well stocked.</p>
          )}
          <Link href="/products" className={`${btn.outline} mt-4 w-full`}>Restock products</Link>
        </Card>
      </div>
    </>
  );
}
