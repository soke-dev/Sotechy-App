import { CreditCard } from "lucide-react";
import Link from "next/link";
import { formatDate, formatNaira, PAYMENT_METHOD_LABELS } from "@sotechy/shared";
import { ActionForm } from "@/components/action-form";
import { Card, DataTable, ErrorNote, FilterLinks, inputClass, PageHeader, StatusBadge } from "@/components/ui";
import { load } from "@/lib/api";
import type { AdminPaymentRow, RefundRow } from "@/lib/types";
import { updateRefund } from "../actions";

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const [payments, refunds] = await Promise.all([
    load<AdminPaymentRow[]>(`/admin/payments${status ? `?status=${status}` : ""}`),
    load<RefundRow[]>("/admin/refunds"),
  ]);

  return (
    <>
      <PageHeader icon={CreditCard} title="Payments & refunds" description="Orders become paid only after provider or manager verification" />
      <FilterLinks items={["", "pending", "confirmed", "expired", "refunded"].map((s) => ({ label: s || "All", href: s ? `/payments?status=${s}` : "/payments", active: (status ?? "") === s }))} />
      <Card title="Payments" className="mb-4">
        <ErrorNote error={payments.error} />
        <DataTable
          rows={payments.data ?? []}
          columns={[
            { header: "Order", cell: (p) => <Link href={`/orders/${p.orderId}`} className="font-semibold hover:text-brand-strong">{p.orderNumber}</Link> },
            { header: "Method", cell: (p) => PAYMENT_METHOD_LABELS[p.method] + (p.cryptoAsset ? ` (${p.cryptoAsset})` : "") },
            { header: "Amount", cell: (p) => formatNaira(p.amount) },
            { header: "Status", cell: (p) => <StatusBadge status={p.status} /> },
            { header: "Provider", hideOnPhone: true, cell: (p) => p.provider ?? "—" },
            { header: "Reference", hideOnPhone: true, cell: (p) => p.providerReference ?? p.txHash ?? "—" },
            { header: "Created", cell: (p) => formatDate(p.createdAt) },
          ]}
        />
      </Card>
      <Card title="Refunds">
        <ErrorNote error={refunds.error} />
        <DataTable
          rows={refunds.data ?? []}
          columns={[
            { header: "Order", cell: (r) => <Link href={`/orders/${r.orderId}`} className="font-semibold hover:text-brand-strong">{r.orderNumber}</Link> },
            { header: "Amount", cell: (r) => formatNaira(r.amount) },
            { header: "Reason", cell: (r) => r.reason ?? "—" },
            { header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
            {
              header: "Action",
              cell: (r) =>
                r.status === "processed" || r.status === "rejected" ? null : (
                  <ActionForm action={updateRefund} submitLabel="Update">
                    <input type="hidden" name="id" value={r.id} />
                    <select name="status" className={inputClass}>
                      <option value="approved">Approve</option>
                      <option value="processed">Mark refunded</option>
                      <option value="rejected">Reject</option>
                    </select>
                  </ActionForm>
                ),
            },
          ]}
        />
      </Card>
    </>
  );
}
