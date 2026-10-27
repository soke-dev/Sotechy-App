import { BarChart3 } from "lucide-react";
import Link from "next/link";
import { formatNaira, PAYMENT_METHOD_LABELS, type PaymentMethodCode } from "@sotechy/shared";
import { Card, DataTable, ErrorNote, Field, PageHeader, StatCard, buttonClass, inputClass } from "@/components/ui";
import { load } from "@/lib/api";
import type { SalesSummary } from "@/lib/types";

const day = (d: Date) => d.toISOString().slice(0, 10);

/** Quick periods, ending today */
function ranges() {
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const back = (days: number) => new Date(today.getTime() - days * 86_400_000);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  return [
    { label: "Today", from: day(today), to: day(tomorrow) },
    { label: "7 days", from: day(back(6)), to: day(tomorrow) },
    { label: "30 days", from: day(back(29)), to: day(tomorrow) },
    { label: "This month", from: day(monthStart), to: day(tomorrow) },
  ];
}

const tokens = (n: number) => Math.round(n).toLocaleString("en-NG");

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const { from, to } = await searchParams;
  const qs = new URLSearchParams();
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  const { data: s, error } = await load<SalesSummary>(`/admin/reports/summary?${qs}`);
  const quick = ranges();
  const active = quick.find((r) => r.from === from && r.to === to)?.label ?? (!from && !to ? "30 days" : null);
  const m = s?.marketplace;

  return (
    <>
      <PageHeader icon={BarChart3} title="Reports" description="The marketplace, Sotechy's own shop, tokens and people, for the period you pick." />
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-2">
          {quick.map((r) => (
            <Link key={r.label} href={`/reports?from=${r.from}&to=${r.to}`} className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${active === r.label ? "border-ink bg-ink text-white" : "border-line bg-surface hover:border-ink"}`}>
              {r.label}
            </Link>
          ))}
        </div>
        <form className="flex flex-wrap items-end gap-3">
          <Field label="From">
            <input type="date" name="from" defaultValue={from} className={inputClass} />
          </Field>
          <Field label="To">
            <input type="date" name="to" defaultValue={to} className={inputClass} />
          </Field>
          <button className={buttonClass}>Apply</button>
        </form>
      </div>
      <ErrorNote error={error} />
      {s && m && (
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-bold">Marketplace</h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard illo="cart" tone="brand" label="Sold by stores" value={formatNaira(m.storeSales)} hint={`${m.orders} order${m.orders === 1 ? "" : "s"}, goods only`} />
              <StatCard illo="coin" tone="good" label="Sotechy's fees" value={formatNaira(m.sotechyFees + m.walkIns.fees)} hint={m.walkIns.fees ? `${formatNaira(m.walkIns.fees)} from walk-in sales` : "From store orders"} />
              <StatCard illo="bank" label="Paid to stores" value={formatNaira(m.paidToStores)} hint={`${m.payoutsPaid} payout${m.payoutsPaid === 1 ? "" : "s"}`} />
              <StatCard illo="wallet" tone={m.payoutsOwed ? "warn" : "neutral"} label="Owed to stores now" value={formatNaira(m.owedToStores)} hint={m.payoutsOwed ? `${m.payoutsOwed} waiting` : "Nothing waiting"} />
              <StatCard illo="store" label="Stores live" value={m.stores.live} hint={`${m.stores.new} new · ${m.stores.waiting} waiting for review`} />
              <StatCard illo="receipt" label="Walk-in sales" value={formatNaira(m.walkIns.sales)} hint={`${m.walkIns.count} with tokens`} />
              <StatCard illo="bike" label="Delivery charged by stores" value={formatNaira(m.delivery)} />
              <StatCard illo="user" label="Customers who bought" value={s.people.buyers} hint={`${s.people.newCustomers} new sign-ups`} />
            </div>
            <Card title="Top stores" padded={false}>
              <div className="px-5 pb-5">
                <DataTable
                  rows={m.topStores}
                  empty="No store sales in this period"
                  columns={[
                    { header: "Store", cell: (r) => <span className="font-semibold">{r.store}</span> },
                    { header: "Orders", cell: (r) => r.orders },
                    { header: "Sold", cell: (r) => formatNaira(r.goods) },
                  ]}
                />
              </div>
            </Card>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-bold">Tokens</h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard illo="sparkle" tone="good" label="Earned by customers" value={tokens(s.tokens.earned)} hint="Orders, bonuses, reviews and walk-ins" />
              <StatCard illo="cart" label="Spent at checkout" value={tokens(s.tokens.spent)} hint={`Worth ${formatNaira(s.tokens.spentValue)}, covered by the reserve`} />
              <StatCard illo="user" label="Customers" value={s.people.customers} hint={`${s.people.newCustomers} joined in this period`} />
              <StatCard illo="heart" label="Repeat buyers" value={s.repeatCustomers} hint="More than one order" />
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <div>
              <h2 className="text-lg font-bold">Sotechy&apos;s own shop</h2>
              <p className="text-sm text-muted">What Sotechy sells itself. Cost and profit need a cost price on each product.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Sales (incl. delivery)" value={formatNaira(s.revenue)} hint={`${s.orders} order${s.orders === 1 ? "" : "s"}`} />
              <StatCard label="Product sales" value={formatNaira(s.productRevenue)} />
              <StatCard label="Cost of goods" value={formatNaira(s.costOfGoods)} hint={s.itemsMissingCost ? `${s.itemsMissingCost} items without a cost price` : undefined} />
              <StatCard label="Gross profit" value={s.grossProfit == null ? "—" : formatNaira(s.grossProfit)} hint={s.grossProfit == null ? "Add cost prices to see it" : undefined} />
              <StatCard label="Stock value (at price)" value={formatNaira(s.inventoryValue.atPrice)} hint={`${s.lowStockItems} low on stock`} />
              <StatCard label="Stock value (at cost)" value={s.inventoryValue.atCost == null ? "—" : formatNaira(s.inventoryValue.atCost)} hint={s.inventoryValue.atCost == null ? "Add cost prices to see it" : undefined} />
              <StatCard label="Waiting for payment" value={formatNaira(s.pendingPayments.value)} hint={`${s.pendingPayments.count} order${s.pendingPayments.count === 1 ? "" : "s"}`} />
              <StatCard label="Refunded" value={formatNaira(s.refunds.value)} hint={`${s.cancelledOrders} cancelled`} />
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card title="By channel">
                <DataTable rows={s.byChannel} empty="No sales yet" columns={[{ header: "Channel", cell: (r) => (r.channel === "online" ? "Online" : "In store") }, { header: "Orders", cell: (r) => r.orders }, { header: "Sales", cell: (r) => formatNaira(r.revenue) }]} />
              </Card>
              <Card title="By branch">
                <DataTable rows={s.byBranch} empty="No sales yet" columns={[{ header: "Branch", cell: (r) => r.branch }, { header: "Orders", cell: (r) => r.orders }, { header: "Sales", cell: (r) => formatNaira(r.revenue) }]} />
              </Card>
              <Card title="By payment method">
                <DataTable rows={s.byPaymentMethod} empty="No sales yet" columns={[{ header: "Method", cell: (r) => PAYMENT_METHOD_LABELS[r.method as PaymentMethodCode] ?? r.method }, { header: "Orders", cell: (r) => r.orders }, { header: "Sales", cell: (r) => formatNaira(r.revenue) }]} />
              </Card>
            </div>
            <Card title="Best sellers">
              <DataTable rows={s.bestSellers} empty="No sales yet" columns={[{ header: "Product", cell: (r) => r.product_name }, { header: "Units", cell: (r) => r.quantity }, { header: "Sales", cell: (r) => formatNaira(r.revenue) }]} />
            </Card>
          </section>
        </div>
      )}
    </>
  );
}
