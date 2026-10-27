import { LifeBuoy } from "lucide-react";
import { formatDate } from "@sotechy/shared";
import { AutoRefresh } from "@/components/auto-refresh";
import { Card, DataTable, ErrorNote, PageHeader, StatusBadge } from "@/components/ui";
import { load } from "@/lib/api";
import type { SupportTicketRow } from "@/lib/types";

export default async function SupportPage() {
  const { data, error } = await load<SupportTicketRow[]>("/admin/support");
  return (
    <>
      <PageHeader icon={LifeBuoy} title="Support" description="Live chats and messages from the customer app. Open one to read it and reply; the customer sees your answer in the app." />
      {/* New messages show up without reloading */}
      <AutoRefresh seconds={10} />
      <Card>
        <ErrorNote error={error} />
        <DataTable
          rows={data ?? []}
          rowHref={(t) => `/support/${t.id}`}
          empty="No messages yet"
          columns={[
            {
              header: "Customer",
              cell: (t) => (
                <span className="block min-w-0">
                  <span className="block font-semibold">{t.customerName ?? t.customerEmail ?? "Customer"}</span>
                  <span className="block text-xs text-muted">{t.username ? `@${t.username}` : t.customerEmail}</span>
                </span>
              ),
            },
            { header: "Subject", hideOnPhone: true, cell: (t) => <span className="font-medium">{t.subject}</span> },
            {
              header: "Last message",
              cell: (t) => (
                <p className="max-w-md truncate text-muted">
                  {t.lastFromStaff ? <span className="font-semibold text-ink-2">You: </span> : null}
                  {t.lastMessage}
                </p>
              ),
            },
            {
              header: "Waiting on",
              cell: (t) =>
                t.status === "open" ? (
                  <span className="font-semibold text-bad">You</span>
                ) : t.status === "pending" ? (
                  <span className="text-muted">Customer</span>
                ) : (
                  <StatusBadge status={t.status} />
                ),
            },
            { header: "When", hideOnPhone: true, cell: (t) => formatDate(t.lastMessageAt ?? t.createdAt) },
          ]}
        />
      </Card>
    </>
  );
}
