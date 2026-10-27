import Link from "next/link";
import { formatDate, formatNaira, ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, type OrderDetail, type OrderStatus, type PayoutStatus } from "@sotechy/shared";
import { ActionForm } from "@/components/action-form";
import { Card, DataTable, ErrorNote, Field, inputClass, PageHeader, Pill, StatusBadge } from "@/components/ui";
import { load } from "@/lib/api";
import { cancelOrder, updateOrderStatus, verifyPayment } from "../../actions";

type AdminOrderDetail = OrderDetail & {
  walkInCustomer: { name?: string; phone?: string } | null;
  customer: { id: string; email: string; fullName: string | null; username: string | null; phone: string | null } | null;
  store: { id: string; name: string; ticker: string; slug: string; logoUrl: string | null; contactPhone: string | null; contactEmail: string | null; ownerEmail: string | null } | null;
  payouts: { id: string; stage: "first" | "final" | "payback"; amount: number; fee: number; status: PayoutStatus; dueAt: string; paidAt: string | null; provider: string | null; failureReason: string | null }[];
};

const NEXT_STATUSES: Partial<Record<OrderStatus, OrderStatus[]>> = {
  paid: ["processing", "ready_for_pickup", "dispatched"],
  processing: ["ready_for_pickup", "dispatched"],
  ready_for_pickup: ["delivered"],
  dispatched: ["delivered"],
};

/** What the customer's app says about the order right now (as on the app's order screen) */
function customerSees(status: OrderStatus, pickup: boolean): { title: string; body: string } {
  switch (status) {
    case "pending_payment":
      return { title: "Waiting for your payment", body: "They haven't paid yet. The order stays open until the payment lands or it expires." };
    case "payment_failed":
      return { title: "Payment didn't go through", body: "They're asked to try paying again." };
    case "paid":
      return { title: "Payment confirmed", body: "Paid, and waiting for the store to accept and start preparing." };
    case "processing":
      return { title: "We're preparing your order", body: "Accepted and being packed." };
    case "ready_for_pickup":
      return { title: "Ready for pickup", body: "They can come and collect it." };
    case "dispatched":
      return { title: "On its way to you", body: "With the rider. They're told to keep their phone close." };
    case "delivered":
      return { title: pickup ? "Collected. Enjoy!" : "Delivered. Enjoy!", body: "Done. They can review it, and their tokens are earned." };
    case "cancelled":
      return { title: "Order cancelled", body: "Cancelled. Any reserved items were released." };
    case "refunded":
      return { title: "Refunded", body: "Their refund was processed." };
  }
}

/** What the store's dashboard says about it (its own, simpler stages) */
function storeSees(status: OrderStatus): { title: string; body: string } {
  switch (status) {
    case "pending_payment":
      return { title: "Not shown yet", body: "Stores only see an order once it's paid." };
    case "paid":
      return { title: "Needs your answer", body: "Waiting for the store to accept it. After 24 hours it goes to order reviews." };
    case "processing":
      return { title: "Accepted · preparing", body: "The store accepted it, so its first payout is due." };
    case "ready_for_pickup":
    case "dispatched":
      return { title: "Shipped", body: "Sent or ready to collect. The store marks it delivered next." };
    case "delivered":
      return { title: "Completed", body: "Delivered. The final payout follows after the waiting time." };
    default:
      return { title: "Declined", body: "Cancelled, refunded or the payment failed. Nothing is paid out." };
  }
}

const STAGE = { first: "First payment", final: "Final payment", payback: "Payback" } as const;
const PAYOUT_STATUS: Record<PayoutStatus, { label: string; tone: "good" | "warn" | "bad" | "info" | "brand" | "neutral" }> = {
  scheduled: { label: "Scheduled", tone: "info" },
  sending: { label: "Sending", tone: "brand" },
  paid: { label: "Paid", tone: "good" },
  failed: { label: "Failed", tone: "bad" },
  held: { label: "On hold", tone: "warn" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  owed: { label: "Owed back", tone: "bad" },
  settled: { label: "Settled", tone: "good" },
};

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: order, error } = await load<AdminOrderDetail>(`/admin/orders/${id}`);
  if (!order) return <ErrorNote error={error ?? "Order not found"} />;

  const next = (NEXT_STATUSES[order.status] ?? []).filter((s) =>
    order.fulfilmentType === "pickup" ? s !== "dispatched" : s !== "ready_for_pickup",
  );
  const pendingPayment = order.payments.find((p) => p.status === "pending");
  const forCustomer = customerSees(order.status, order.fulfilmentType === "pickup");
  const forStore = order.store ? storeSees(order.status) : null;

  return (
    <>
      <PageHeader title={`Order ${order.orderNumber}`} description={`${order.channel === "online" ? "Online" : "In store"} · ${formatDate(order.createdAt)}`} actions={<StatusBadge status={order.status} />} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card title="Where it stands">
            <div className={`grid grid-cols-1 gap-3 ${forStore ? "sm:grid-cols-2" : ""}`}>
              <div className="rounded-2xl bg-surface-alt p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">The customer sees</p>
                <p className="mt-1 font-semibold">{forCustomer.title}</p>
                <p className="mt-1 text-sm text-ink-2">{forCustomer.body}</p>
              </div>
              {forStore && order.store && (
                <div className="rounded-2xl bg-surface-alt p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">{order.store.name} sees</p>
                  <p className="mt-1 font-semibold">{forStore.title}</p>
                  <p className="mt-1 text-sm text-ink-2">{forStore.body}</p>
                </div>
              )}
            </div>
          </Card>

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
              <dt>{order.fulfilmentType === "pickup" ? "Pickup" : "Delivery"}</dt><dd className="text-right">{formatNaira(order.deliveryFee)}</dd>
              {order.tokensValue > 0 && (
                <>
                  <dt>Paid with tokens</dt><dd className="text-right">-{formatNaira(order.tokensValue)}</dd>
                </>
              )}
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
              <div className="mt-4 rounded border border-warn/30 bg-warn-soft p-3">
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

          {order.store && (
            <Card title="Store payouts">
              <DataTable
                rows={order.payouts}
                empty="No payouts yet. The first is set up when the store accepts the order."
                columns={[
                  { header: "Payment", cell: (p) => STAGE[p.stage] },
                  { header: "Amount", cell: (p) => <span className="font-semibold">{formatNaira(p.amount)}</span> },
                  { header: "Fee", cell: (p) => formatNaira(p.fee) },
                  {
                    header: "Status",
                    cell: (p) => (
                      <span>
                        <Pill tone={PAYOUT_STATUS[p.status].tone}>{PAYOUT_STATUS[p.status].label}</Pill>
                        {p.failureReason && p.status === "failed" && <span className="mt-1 block max-w-[220px] text-xs text-bad">{p.failureReason}</span>}
                      </span>
                    ),
                  },
                  { header: "When", cell: (p) => (p.paidAt ? `Paid ${formatDate(p.paidAt)}${p.provider === "manual" ? " (by hand)" : ""}` : `Due ${formatDate(p.dueAt)}`) },
                ]}
              />
              <Link href="/merchant-payouts" className="mt-3 inline-block text-sm font-semibold text-brand-strong hover:underline">
                Go to payouts
              </Link>
            </Card>
          )}

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
            <p className="text-sm font-semibold">{order.customer?.fullName ?? order.walkInCustomer?.name ?? "Walk-in customer"}</p>
            {order.customer?.username && <p className="text-sm text-muted">@{order.customer.username}</p>}
            <p className="text-sm text-muted">{order.customer?.email}</p>
            <p className="text-sm text-muted">{order.customer?.phone ?? order.walkInCustomer?.phone}</p>
            {order.customer && (
              <Link href={`/customers/${order.customer.id}`} className="mt-2 inline-block text-sm font-semibold text-brand-strong hover:underline">
                Open customer
              </Link>
            )}
          </Card>
          {order.store && (
            <Card title="Store">
              <div className="flex items-center gap-3">
                {order.store.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={order.store.logoUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : null}
                <p className="text-sm">
                  <span className="font-semibold">{order.store.name}</span> <span className="font-semibold text-brand-strong">${order.store.ticker}</span>
                </p>
              </div>
              {order.store.contactPhone && <p className="mt-2 text-sm text-muted">{order.store.contactPhone}</p>}
              <p className="text-sm text-muted">{order.store.contactEmail ?? order.store.ownerEmail}</p>
              <Link href={`/merchants/${order.store.id}`} className="mt-2 inline-block text-sm font-semibold text-brand-strong hover:underline">
                Open store
              </Link>
            </Card>
          )}
          <Card title="Fulfilment">
            <p className="text-sm capitalize">{order.fulfilmentType}</p>
            {!order.store && <p className="text-sm text-muted">{order.branch?.name}</p>}
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
