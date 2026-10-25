import Link from "next/link";
import { formatDate, formatNaira, type AppFeatures } from "@sotechy/shared";
import { Card, DataTable, ErrorNote, PageHeader, StatCard, StatusBadge } from "@/components/ui";
import { load } from "@/lib/api";
import type { AdminOrderRow, SalesSummary } from "@/lib/types";

export default async function DashboardPage() {
  const [summary, orders, switches] = await Promise.all([
    load<SalesSummary>("/admin/reports/summary"),
    load<AdminOrderRow[]>("/admin/orders"),
    load<{ features: AppFeatures }>("/admin/features"),
  ]);
  const s = summary.data;
  const f = switches.data?.features;

  return (
    <>
      <PageHeader title="Dashboard" description="Last 30 days" />
      {f && (
        <Link
          href="/switches"
          className={`mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-4 py-3 text-sm ${f.maintenance || !f.ordering ? "border-amber-300 bg-amber-50" : "border-neutral-200 bg-white"}`}
        >
          <span className="font-medium">Shop status</span>
          {f.maintenance ? <span className="text-red-700">Maintenance screen is ON: customers can&apos;t shop</span> : <span>App is live</span>}
          <span>Online ordering: {f.ordering ? "on" : <b className="text-amber-700">paused</b>}</span>
          <span>Delivery: {f.delivery ? "on" : "off"} · Pickup: {f.pickup ? "on" : "off"}</span>
          <span className="ml-auto text-neutral-500 underline">App switches →</span>
        </Link>
      )}
      {summary.error && <ErrorNote error={`Sales summary: ${summary.error}`} />}
      {s && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Revenue" value={formatNaira(s.revenue)} hint={`${s.orders} paid orders`} />
          <StatCard label="Average order" value={formatNaira(s.averageOrderValue)} />
          <StatCard label="Pending payments" value={s.pendingPayments.count} hint={formatNaira(s.pendingPayments.value)} />
          <StatCard label="Low-stock items" value={s.lowStockItems} />
          <StatCard
            label="Gross profit"
            value={s.grossProfit == null ? "—" : formatNaira(s.grossProfit)}
            hint={s.grossProfit == null ? `${s.itemsMissingCost} sold items have no cost price` : undefined}
          />
          <StatCard label="Refunds" value={formatNaira(s.refunds.value)} hint={`${s.refunds.count} processed`} />
          <StatCard label="Cancelled orders" value={s.cancelledOrders} />
          <StatCard label="Repeat customers" value={s.repeatCustomers} />
        </div>
      )}

      <Card title="Recent orders">
        <ErrorNote error={orders.error} />
        <DataTable
          rows={(orders.data ?? []).slice(0, 10)}
          columns={[
            { header: "Order", cell: (o) => <Link className="underline" href={`/orders/${o.id}`}>{o.orderNumber}</Link> },
            { header: "Status", cell: (o) => <StatusBadge status={o.status} /> },
            { header: "Channel", cell: (o) => (o.channel === "online" ? "Online" : "In store") },
            { header: "Total", cell: (o) => formatNaira(o.total) },
            { header: "Date", cell: (o) => formatDate(o.createdAt) },
          ]}
        />
      </Card>
    </>
  );
}
