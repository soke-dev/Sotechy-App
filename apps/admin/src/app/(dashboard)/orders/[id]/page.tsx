import { formatDate, formatNaira, ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, type OrderDetail, type OrderStatus } from "@sotechy/shared";
import { ActionForm } from "@/components/action-form";
import { Card, DataTable, ErrorNote, Field, inputClass, PageHeader, StatusBadge } from "@/components/ui";
import { load } from "@/lib/api";
import { cancelOrder, updateOrderStatus, verifyPayment } from "../../actions";

type AdminOrderDetail = OrderDetail & {
  walkInCustomer: { name?: string; phone?: string } | null;
  customer: { email: string; fullName: string | null; phone: string | null } | null;
};

const NEXT_STATUSES: Partial<Record<OrderStatus, OrderStatus[]>> = {
  paid: ["processing", "ready_for_pickup", "dispatched"],
  processing: ["ready_for_pickup", "dispatched"],
  ready_for_pickup: ["delivered"],
  dispatched: ["delivered"],
};

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: order, error } = await load<AdminOrderDetail>(`/admin/orders/${id}`);
  if (!order) return <ErrorNote error={error ?? "Order not found"} />;

  const next = (NEXT_STATUSES[order.status] ?? []).filter((s) =>
    order.fulfilmentType === "pickup" ? s !== "dispatched" : s !== "ready_for_pickup",
  );
  const pendingPayment = order.payments.find((p) => p.status === "pending");

  return (
    <>
      <PageHeader title={`Order ${order.orderNumber}`} description={`${order.channel === "online" ? "Online" : "In store"} · ${formatDate(order.createdAt)}`} actions={<StatusBadge status={order.status} />} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card title="Items">
            <DataTable
              rows={order.items}
              columns={[
                { header: "Product", cell: (i) => `${i.productName} — ${i.variantName}` },
                { header: "SKU", cell: (i) => i.sku },
                { header: "Unit price", cell: (i) => formatNaira(i.unitPrice) },
                { header: "Qty", cell: (i) => i.quantity },
                { header: "Total", cell: (i) => formatNaira(i.lineTotal) },
              ]}
            />
            <dl className="mt-4 grid grid-cols-2 gap-1 text-sm sm:w-72 sm:justify-self-end">
              <dt>Subtotal</dt><dd className="text-right">{formatNaira(order.subtotal)}</dd>
              <dt>Discount</dt><dd className="text-right">-{formatNaira(order.discountTotal)}</dd>
              <dt>Delivery</dt><dd className="text-right">{formatNaira(order.deliveryFee)}</dd>
              <dt className="font-semibold">Total</dt><dd className="text-right font-semibold">{formatNaira(order.total)}</dd>
            </dl>
          </Card>

          <Card title="Payments">
            <DataTable
              rows={order.payments}
              columns={[
                { header: "Method", cell: (p) => PAYMENT_METHOD_LABELS[p.method] },
                { header: "Amount", cell: (p) => formatNaira(p.amount) },
                { header: "Status", cell: (p) => <StatusBadge status={p.status} /> },
                { header: "Reference", cell: (p) => p.providerReference ?? p.txHash ?? "—" },
                { header: "Verified", cell: (p) => (p.verifiedAt ? `${formatDate(p.verifiedAt)}${p.verifiedBy ? " (staff)" : " (provider)"}` : "—") },
              ]}
            />
            {pendingPayment && (pendingPayment.method === "bank_transfer" || pendingPayment.method === "crypto") && (
              <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3">
                <p className="mb-2 text-sm">
                  Managers: confirm only after checking the money arrived in the{" "}
                  {pendingPayment.method === "bank_transfer" ? "bank account (statement or banking app)" : "wallet (block explorer)"}. Screenshots are not proof of payment.
                </p>
                <ActionForm action={verifyPayment} submitLabel="Confirm payment received">
                  <input type="hidden" name="paymentId" value={pendingPayment.id} />
                  <input type="hidden" name="orderId" value={order.id} />
                  <Field label={pendingPayment.method === "bank_transfer" ? "Bank reference / session ID" : "Transaction hash"}>
                    <input name="reference" required className={inputClass} />
                  </Field>
                  <Field label="Note">
                    <input name="note" className={inputClass} />
                  </Field>
                </ActionForm>
              </div>
            )}
          </Card>

          <Card title="History">
            <ul className="space-y-1 text-sm">
              {order.history.map((h) => (
                <li key={h.id}>
                  {formatDate(h.createdAt)} — {h.fromStatus ? `${ORDER_STATUS_LABELS[h.fromStatus]} → ` : ""}
                  {ORDER_STATUS_LABELS[h.toStatus]} {h.note && <span className="text-muted">({h.note})</span>}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card title="Customer">
            <p className="text-sm">{order.customer?.fullName ?? order.walkInCustomer?.name ?? "Walk-in customer"}</p>
            <p className="text-sm text-muted">{order.customer?.email}</p>
            <p className="text-sm text-muted">{order.customer?.phone ?? order.walkInCustomer?.phone}</p>
          </Card>
          <Card title="Fulfilment">
            <p className="text-sm capitalize">{order.fulfilmentType}</p>
            <p className="text-sm text-muted">{order.branch?.name}</p>
            {order.deliveryAddress && (
              <p className="mt-2 text-sm">
                {order.deliveryAddress.recipientName}, {order.deliveryAddress.phone}
                <br />
                {order.deliveryAddress.line1} {order.deliveryAddress.line2}, {order.deliveryAddress.city}, {order.deliveryAddress.state}
              </p>
            )}
          </Card>
          {next.length > 0 && (
            <Card title="Update status">
              <ActionForm action={updateOrderStatus} submitLabel="Update" className="flex flex-col gap-2">
                <input type="hidden" name="id" value={order.id} />
                <select name="status" className={inputClass}>
                  {next.map((s) => (
                    <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
                  ))}
                </select>
                <input name="note" placeholder="Note (optional)" className={inputClass} />
              </ActionForm>
            </Card>
          )}
          {["pending_payment", "payment_failed", "paid", "processing", "ready_for_pickup"].includes(order.status) && (
            <Card title="Cancel order">
              <p className="mb-2 text-xs text-muted">Releases or returns stock. Paid orders get a refund request.</p>
              <ActionForm action={cancelOrder} submitLabel="Cancel order" className="flex flex-col gap-2">
                <input type="hidden" name="id" value={order.id} />
                <input name="note" placeholder="Reason" className={inputClass} />
              </ActionForm>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
