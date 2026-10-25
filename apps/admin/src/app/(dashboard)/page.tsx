import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Clock,
  LayoutDashboard,
  PackagePlus,
  Receipt,
  RotateCcw,
  ScanBarcode,
  ShoppingBag,
  TrendingUp,
  UserCheck,
  Wallet,
  XCircle,
} from "lucide-react";
import { formatDate, formatNaira, type AppFeatures } from "@sotechy/shared";
import { Card, DataTable, ErrorNote, PageHeader, primaryButtonClass, secondaryButtonClass, StatCard, StatusBadge } from "@/components/ui";
import { load } from "@/lib/api";
import type { AdminOrderRow, SalesSummary } from "@/lib/types";

function StatusPill({ on, label }: { on: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${on ? "bg-green-50 text-green-800" : "bg-amber-100 text-amber-800"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${on ? "bg-green-600" : "bg-amber-600"}`} />
      {label}
    </span>
  );
}

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
      <PageHeader
        title="Dashboard"
        description="How the shop is doing over the last 30 days."
        icon={LayoutDashboard}
        actions={
          <>
            <Link href="/pos" className={secondaryButtonClass}>
              <ScanBarcode size={16} /> Walk-in sale
            </Link>
            <Link href="/products/new" className={primaryButtonClass}>
              <PackagePlus size={16} /> Add product
            </Link>
          </>
        }
      />

      {f && (
        <Link
          href="/switches"
          className={`group mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border px-4 py-3 text-sm transition ${
            f.maintenance || !f.ordering ? "border-amber-300 bg-amber-50" : "border-line bg-surface hover:border-brand/40"
          }`}
        >
          {f.maintenance && <AlertTriangle size={17} className="text-red-600" />}
          <span className="font-medium">Shop status</span>
          {f.maintenance ? <StatusPill on={false} label="Maintenance screen ON" /> : <StatusPill on label="App is live" />}
          <StatusPill on={f.ordering} label={f.ordering ? "Ordering on" : "Ordering paused"} />
          <StatusPill on={f.delivery} label={`Delivery ${f.delivery ? "on" : "off"}`} />
          <StatusPill on={f.pickup} label={`Pickup ${f.pickup ? "on" : "off"}`} />
          <span className="ml-auto inline-flex items-center gap-1 text-muted group-hover:text-ink">
            App switches <ArrowRight size={15} />
          </span>
        </Link>
      )}

      {summary.error && <ErrorNote error={`Sales summary: ${summary.error}`} />}
      {s && (
        <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard icon={TrendingUp} tone="brand" label="Revenue" value={formatNaira(s.revenue)} hint={`${s.orders} paid orders`} />
          <StatCard icon={Receipt} label="Average order" value={formatNaira(s.averageOrderValue)} />
          <StatCard icon={Clock} tone="warn" label="Awaiting payment" value={s.pendingPayments.count} hint={formatNaira(s.pendingPayments.value)} />
          <StatCard icon={AlertTriangle} tone={s.lowStockItems ? "warn" : "neutral"} label="Low-stock items" value={s.lowStockItems} />
          <StatCard
            icon={Banknote}
            tone="good"
            label="Gross profit"
            value={s.grossProfit == null ? "—" : formatNaira(s.grossProfit)}
            hint={s.grossProfit == null ? `${s.itemsMissingCost} sold items have no cost price` : undefined}
          />
          <StatCard icon={RotateCcw} label="Refunds" value={formatNaira(s.refunds.value)} hint={`${s.refunds.count} processed`} />
          <StatCard icon={XCircle} label="Cancelled orders" value={s.cancelledOrders} />
          <StatCard icon={UserCheck} tone="good" label="Repeat customers" value={s.repeatCustomers} />
        </div>
      )}

      <Card
        title="Recent orders"
        description="The latest 10 orders, online and in store"
        actions={
          <Link href="/orders" className="inline-flex items-center gap-1 text-sm font-medium text-brand-strong hover:underline">
            All orders <ArrowRight size={15} />
          </Link>
        }
      >
        <ErrorNote error={orders.error} />
        <DataTable
          rows={(orders.data ?? []).slice(0, 10)}
          empty="No orders yet. They'll appear here as soon as customers check out."
          columns={[
            {
              header: "Order",
              cell: (o) => (
                <Link className="inline-flex items-center gap-2 font-medium hover:text-brand-strong" href={`/orders/${o.id}`}>
                  {o.channel === "online" ? <ShoppingBag size={15} className="text-muted" /> : <Wallet size={15} className="text-muted" />}
                  {o.orderNumber}
                </Link>
              ),
            },
            { header: "Status", cell: (o) => <StatusBadge status={o.status} /> },
            { header: "Channel", cell: (o) => (o.channel === "online" ? "Online" : "In store") },
            { header: "Total", cell: (o) => <span className="font-medium">{formatNaira(o.total)}</span> },
            { header: "Date", cell: (o) => <span className="text-muted">{formatDate(o.createdAt)}</span> },
          ]}
        />
      </Card>
    </>
  );
}
