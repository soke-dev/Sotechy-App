import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@sotechy/shared";
import { ActionForm } from "@/components/action-form";
import { Card, ErrorNote, inputClass, PageHeader, StatusBadge } from "@/components/ui";
import { load } from "@/lib/api";
import type { SupportThread } from "@/lib/types";
import { replyToTicket, updateTicket } from "../../actions";

export default async function SupportThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: t, error } = await load<SupportThread>(`/admin/support/${id}`);
  if (!t) return <ErrorNote error={error ?? "Conversation not found"} />;
  const who = t.customer.fullName ?? t.customer.email ?? "Customer";

  return (
    <>
      <Link href="/support" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft size={15} /> Support
      </Link>
      <PageHeader title={who} description={`${t.subject} · started ${formatDate(t.createdAt)}`} actions={<StatusBadge status={t.status} />} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Conversation">
          <ul className="flex flex-col gap-2">
            {t.messages.map((m) => (
              <li key={m.id} className={`flex flex-col ${m.fromStaff ? "items-end" : "items-start"}`}>
                <p className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${m.fromStaff ? "rounded-br-md bg-brand text-white" : "rounded-bl-md bg-surface-alt"}`}>{m.body}</p>
                <span className="mt-0.5 text-[11px] text-muted">
                  {m.fromStaff ? "Sotechy · " : ""}
                  {formatDate(m.createdAt)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-line pt-4">
            <ActionForm action={replyToTicket} submitLabel="Send reply" className="flex flex-col gap-2">
              <input type="hidden" name="id" value={t.id} />
              <textarea name="message" required rows={3} placeholder={`Reply to ${who.split(" ")[0]}…`} className={`${inputClass} min-h-24`} />
            </ActionForm>
            <p className="mt-2 text-xs text-muted">They see it in the app&apos;s live chat and get a notification.</p>
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card title="Customer">
            <p className="text-sm font-semibold">{who}</p>
            {t.customer.username && <p className="text-sm text-muted">@{t.customer.username}</p>}
            <p className="text-sm text-muted">{t.customer.email}</p>
            {t.customer.phone && <p className="text-sm text-muted">{t.customer.phone}</p>}
            <div className="mt-2 flex flex-wrap gap-3 text-sm font-semibold">
              {t.customer.id && (
                <Link href={`/customers/${t.customer.id}`} className="text-brand-strong hover:underline">
                  Open customer
                </Link>
              )}
              {t.orderId && (
                <Link href={`/orders/${t.orderId}`} className="text-brand-strong hover:underline">
                  Open the order
                </Link>
              )}
            </div>
          </Card>
          <Card title="Status">
            <ActionForm action={updateTicket} submitLabel="Set" className="flex flex-col gap-2">
              <input type="hidden" name="id" value={t.id} />
              <select name="status" defaultValue={t.status} className={inputClass}>
                <option value="open">Open: waiting on us</option>
                <option value="pending">Pending: waiting on the customer</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </ActionForm>
            <p className="mt-2 text-xs text-muted">Resolving ends this chat; the customer&apos;s next message starts a new one.</p>
          </Card>
        </div>
      </div>
    </>
  );
}
