import Link from "next/link";
import { formatDate, formatNaira } from "@sotechy/shared";
import { Card, DataTable, ErrorNote, PageHeader, StatCard, StatusBadge } from "@/components/ui";
import { load } from "@/lib/api";
import type { AdminOrderRow, SalesSummary } from "@/lib/types";

export default async function DashboardPage() {
  const [summary, orders] = await Promise.all([
    load<SalesSummary>("/admin/reports/summary"),
    load<AdminOrderRow[]>("/admin/orders"),
  ]);
  const s = summary.data;

  return (
    <>
      <PageHeader title="Dashboard" description="Last 30 days" />
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
