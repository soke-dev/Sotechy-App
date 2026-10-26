import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { formatDate, formatNaira, ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS } from "@sotechy/shared";
import { Card, DataTable, ErrorNote, FilterLinks, PageHeader, StatusBadge } from "@/components/ui";
import { load } from "@/lib/api";
import type { AdminOrderRow } from "@/lib/types";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; channel?: string }> }) {
  const { status, channel } = await searchParams;
  const qs = new URLSearchParams();
  if (status) qs.set("status", status);
  if (channel) qs.set("channel", channel);
  const { data, error } = await load<AdminOrderRow[]>(`/admin/orders?${qs}`);

  const filters = [
    { label: "All", href: "/orders", active: !status && !channel },
    ...Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => ({ label: v, href: `/orders?status=${k}`, active: status === k })),
    { label: "In store", href: "/orders?channel=in_store", active: channel === "in_store" },
    { label: "Online", href: "/orders?channel=online", active: channel === "online" },
  ];

  return (
    <>
      <PageHeader icon={ShoppingBag} title="Orders" description="Online and in-store orders" />
      <FilterLinks items={filters} />
      <Card>
        <ErrorNote error={error} />
        <DataTable
          rows={data ?? []}
          columns={[
            { header: "Order", cell: (o) => <Link className="font-semibold hover:text-brand-strong" href={`/orders/${o.id}`}>{o.orderNumber}</Link> },
            { header: "Status", cell: (o) => <StatusBadge status={o.status} /> },
            { header: "Customer", cell: (o) => o.customerName ?? o.customerEmail ?? o.walkInCustomer?.name ?? "Walk-in" },
            { header: "Channel", cell: (o) => (o.channel === "online" ? "Online" : "In store") },
            { header: "Fulfilment", cell: (o) => <span className="capitalize">{o.fulfilmentType}</span> },
            { header: "Branch", cell: (o) => o.branchName ?? "—" },
            { header: "Payment", cell: (o) => PAYMENT_METHOD_LABELS[o.paymentMethod] },
            { header: "Total", cell: (o) => <span className="font-semibold">{formatNaira(o.total)}</span> },
            { header: "Date", cell: (o) => <span className="text-muted">{formatDate(o.createdAt)}</span> },
          ]}
        />
      </Card>
    </>
  );
}
