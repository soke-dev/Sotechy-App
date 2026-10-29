import { CreditCard } from "lucide-react";
import Link from "next/link";
import { formatDate, formatNaira, PAYMENT_METHOD_LABELS } from "@sotechy/shared";
import { ActionForm } from "@/components/action-form";
import { Card, DataTable, ErrorNote, Field, FilterLinks, inputClass, PageHeader, Pill, StatusBadge } from "@/components/ui";
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
      <Card title="Refunds" description="Ask the customer for what you need, then record how it was sent: they see the bank reference or the transaction hash on their order.">
        <ErrorNote error={refunds.error} />
        <div className="flex flex-col divide-y divide-line">
          {(refunds.data ?? []).map((r) => (
            <RefundItem key={r.id} r={r} />
          ))}
          {refunds.data?.length === 0 && <p className="text-sm text-muted">No refunds.</p>}
        </div>
      </Card>
    </>
  );
}

const NEED_LABEL = { bank: "Bank account", crypto: "Wallet address", other: "Something else" } as const;
const REFUND_STATUS: Record<RefundRow["status"], { label: string; tone: "good" | "warn" | "info" | "neutral" | "bad" }> = {
  requested: { label: "To do", tone: "warn" },
  approved: { label: "Approved", tone: "info" },
  needs_info: { label: "Waiting for customer", tone: "neutral" },
  processed: { label: "Refunded", tone: "good" },
  rejected: { label: "Turned down", tone: "bad" },
};

/** The password box every refund step asks for */
const Password = () => <input type="password" name="password" required placeholder="Your password" autoComplete="current-password" className={inputClass} />;

function RefundItem({ r }: { r: RefundRow }) {
  const st = REFUND_STATUS[r.status];
  const d = r.customerDetails;
  const open = r.status !== "processed" && r.status !== "rejected";
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/orders/${r.orderId}`} className="font-semibold hover:text-brand-strong">{r.orderNumber}</Link>
        <span className="font-semibold">{formatNaira(r.amount)}</span>
        <Pill tone={st.tone}>{st.label}</Pill>
        <span className="text-xs text-muted">
          {r.customer ?? "Customer"}{r.email ? ` · ${r.email}` : ""} · paid with {PAYMENT_METHOD_LABELS[r.paidMethod]}{r.paidBy ? ` (${r.paidBy})` : ""} · {formatDate(r.createdAt)}
        </span>
      </div>
      {r.reason && <p className="text-xs text-muted">Reason: {r.reason}</p>}

      {r.status === "needs_info" && (
        <p className="rounded-lg bg-canvas px-3 py-2 text-xs">Asked for: <b>{r.infoNeeded ? NEED_LABEL[r.infoNeeded] : "details"}</b>{r.infoMessage ? ` · “${r.infoMessage}”` : ""}. The customer replies from their order in the app.</p>
      )}
      {d && (
        <div className="rounded-lg border border-line bg-canvas px-3 py-2 text-xs">
          <p className="mb-1 font-semibold">The customer sent{r.customerRepliedAt ? ` (${formatDate(r.customerRepliedAt)})` : ""}:</p>
          {d.accountNumber && <p><code className="select-all">{d.accountNumber}</code> · {d.bankName} · {d.accountName}</p>}
          {d.walletAddress && <p><code className="select-all break-all">{d.walletAddress}</code> · {d.network}</p>}
          {d.note && <p className="whitespace-pre-wrap">{d.note}</p>}
        </div>
      )}
      {r.status === "processed" && (
        <p className="text-xs text-muted">
          Sent {r.processedAt ? formatDate(r.processedAt) : ""} by {r.method === "crypto" ? `${r.cryptoAsset} on ${r.network}` : "bank transfer"}
          {r.reference ? ` · ref ${r.reference}` : ""}
          {r.txHash ? <> · hash <code className="select-all break-all">{r.txHash}</code></> : null}
        </p>
      )}
      {r.note && <p className="text-xs text-muted">Note to the customer: {r.note}</p>}

      {open && (
        <div className="flex flex-col gap-2">
          <details className="rounded-lg border border-line px-3 py-2">
            <summary className="cursor-pointer font-medium">Record it as sent</summary>
            <ActionForm action={updateRefund} submitLabel="Mark refunded" className="mt-3 grid gap-3 md:grid-cols-3">
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="status" value="processed" />
              <Field label="Sent by">
                <select name="method" defaultValue={d?.walletAddress ? "crypto" : "bank"} className={inputClass}>
                  <option value="bank">Bank transfer</option>
                  <option value="crypto">Crypto</option>
                </select>
              </Field>
              <Field label="Bank reference (bank transfer)"><input name="reference" maxLength={120} placeholder="e.g. 000013251029…" className={inputClass} /></Field>
              <Field label="Transaction hash (crypto)"><input name="txHash" maxLength={200} placeholder="0x… or a Tron/Solana hash" className={inputClass} /></Field>
              <Field label="Coin (crypto)"><input name="cryptoAsset" maxLength={20} placeholder="USDT" className={inputClass} /></Field>
              <Field label="Network (crypto)"><input name="network" maxLength={40} defaultValue={d?.network ?? ""} placeholder="Tron, BSC, Ethereum, Base, Solana…" className={inputClass} /></Field>
              <Field label="Note to the customer (optional)"><input name="note" maxLength={500} className={inputClass} /></Field>
              <Password />
            </ActionForm>
          </details>
          <details className="rounded-lg border border-line px-3 py-2">
            <summary className="cursor-pointer font-medium">Ask the customer for details</summary>
            <ActionForm action={updateRefund} submitLabel="Send request" className="mt-3 grid gap-3 md:grid-cols-3">
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="status" value="needs_info" />
              <Field label="What you need">
                <select name="infoNeeded" defaultValue="bank" className={inputClass}>
                  <option value="bank">Their bank account</option>
                  <option value="crypto">Their wallet address</option>
                  <option value="other">Something else (they write a reply)</option>
                </select>
              </Field>
              <div className="md:col-span-2">
                <Field label="Message they see"><input name="infoMessage" maxLength={500} placeholder="We couldn't send it back to the account you paid from. Where should we send it?" className={`${inputClass} w-full`} /></Field>
              </div>
              <Password />
            </ActionForm>
          </details>
          <ActionForm action={updateRefund} submitLabel="Save" className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={r.id} />
            <select name="status" defaultValue="approved" className={inputClass}>
              {r.status !== "approved" && <option value="approved">Approve</option>}
              <option value="rejected">Turn down</option>
            </select>
            <input name="note" maxLength={500} placeholder="Why (shown to the customer)" className={inputClass} />
            <Password />
          </ActionForm>
        </div>
      )}
    </div>
  );
}
