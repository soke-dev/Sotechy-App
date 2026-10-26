import { BarChart3 } from "lucide-react";
import { formatNaira, PAYMENT_METHOD_LABELS, type PaymentMethodCode } from "@sotechy/shared";
import { Card, DataTable, ErrorNote, Field, PageHeader, StatCard, buttonClass, inputClass } from "@/components/ui";
import { load } from "@/lib/api";
import type { SalesSummary } from "@/lib/types";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const { from, to } = await searchParams;
  const qs = new URLSearchParams();
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  const { data: s, error } = await load<SalesSummary>(`/admin/reports/summary?${qs}`);

  return (
    <>
      <PageHeader icon={BarChart3} title="Reports" description="Revenue, cost and profit are reported separately (managers)" />
      <form className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="From"><input type="date" name="from" defaultValue={from} className={inputClass} /></Field>
        <Field label="To"><input type="date" name="to" defaultValue={to} className={inputClass} /></Field>
        <button className={buttonClass}>Apply</button>
      </form>
      <ErrorNote error={error} />
      {s && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Revenue (incl. delivery)" value={formatNaira(s.revenue)} hint={`${s.orders} orders`} />
            <StatCard label="Product revenue" value={formatNaira(s.productRevenue)} />
            <StatCard label="Cost of goods" value={formatNaira(s.costOfGoods)} hint={s.itemsMissingCost ? `${s.itemsMissingCost} items without cost` : undefined} />
            <StatCard label="Gross profit" value={s.grossProfit == null ? "Needs cost data" : formatNaira(s.grossProfit)} />
            <StatCard label="Stock value (at price)" value={formatNaira(s.inventoryValue.atPrice)} />
            <StatCard label="Stock value (at cost)" value={s.inventoryValue.atCost == null ? "Needs cost data" : formatNaira(s.inventoryValue.atCost)} />
            <StatCard label="Outstanding payments" value={formatNaira(s.pendingPayments.value)} hint={`${s.pendingPayments.count} orders`} />
            <StatCard label="Refunded" value={formatNaira(s.refunds.value)} />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card title="By channel">
              <DataTable rows={s.byChannel} columns={[{ header: "Channel", cell: (r) => (r.channel === "online" ? "Online" : "In store") }, { header: "Orders", cell: (r) => r.orders }, { header: "Revenue", cell: (r) => formatNaira(r.revenue) }]} />
            </Card>
            <Card title="By branch">
              <DataTable rows={s.byBranch} columns={[{ header: "Branch", cell: (r) => r.branch }, { header: "Orders", cell: (r) => r.orders }, { header: "Revenue", cell: (r) => formatNaira(r.revenue) }]} />
            </Card>
            <Card title="By payment method">
              <DataTable rows={s.byPaymentMethod} columns={[{ header: "Method", cell: (r) => PAYMENT_METHOD_LABELS[r.method as PaymentMethodCode] ?? r.method }, { header: "Orders", cell: (r) => r.orders }, { header: "Revenue", cell: (r) => formatNaira(r.revenue) }]} />
            </Card>
          </div>
          <Card title="Best sellers">
            <DataTable rows={s.bestSellers} columns={[{ header: "Product", cell: (r) => r.product_name }, { header: "Units", cell: (r) => r.quantity }, { header: "Revenue", cell: (r) => formatNaira(r.revenue) }]} />
          </Card>
        </div>
      )}
    </>
  );
}
