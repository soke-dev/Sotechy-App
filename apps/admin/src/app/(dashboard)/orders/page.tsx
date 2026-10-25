import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { formatDate, formatNaira, ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS } from "@sotechy/shared";
import { Card, DataTable, ErrorNote, PageHeader, StatusBadge } from "@/components/ui";
import { load } from "@/lib/api";
import type { AdminOrderRow } from "@/lib/types";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; channel?: string }> }) {
  const { status, channel } = await searchParams;
  const qs = new URLSearchParams();
  if (status) qs.set("status", status);
  if (channel) qs.set("channel", channel);
  const { data, error } = await load<AdminOrderRow[]>(`/admin/orders?${qs}`);

  const filters = [
    { label: "All", href: "/orders" },
    ...Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => ({ label: v, href: `/orders?status=${k}` })),
    { label: "In store", href: "/orders?channel=in_store" },
    { label: "Online", href: "/orders?channel=online" },
  ];

  return (
    <>
      <PageHeader icon={ShoppingBag} title="Orders" description="Online and in-store orders" />
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {filters.map((f) => (
          <Link key={f.href} href={f.href} className="rounded-full border border-line bg-white px-3 py-1 hover:bg-canvas">
            {f.label}
          </Link>
        ))}
      </div>
      <Card>
        <ErrorNote error={error} />
        <DataTable
          rows={data ?? []}
          columns={[
            { header: "Order", cell: (o) => <Link className="font-medium underline" href={`/orders/${o.id}`}>{o.orderNumber}</Link> },
            { header: "Status", cell: (o) => <StatusBadge status={o.status} /> },
            { header: "Customer", cell: (o) => o.customerName ?? o.customerEmail ?? o.walkInCustomer?.name ?? "Walk-in" },
            { header: "Channel", cell: (o) => (o.channel === "online" ? "Online" : "In store") },
            { header: "Fulfilment", cell: (o) => o.fulfilmentType },
            { header: "Branch", cell: (o) => o.branchName ?? "—" },
            { header: "Payment", cell: (o) => PAYMENT_METHOD_LABELS[o.paymentMethod] },
            { header: "Total", cell: (o) => formatNaira(o.total) },
            { header: "Date", cell: (o) => formatDate(o.createdAt) },
          ]}
        />
      </Card>
    </>
  );
}
