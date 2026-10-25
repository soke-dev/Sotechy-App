import { formatDate } from "@sotechy/shared";
import { ActionForm } from "@/components/action-form";
import { Card, DataTable, ErrorNote, PageHeader, StatusBadge, inputClass } from "@/components/ui";
import { load } from "@/lib/api";
import type { SupportTicketRow } from "@/lib/types";
import { updateTicket } from "../actions";

export default async function SupportPage() {
  const { data, error } = await load<SupportTicketRow[]>("/admin/support");
  return (
    <>
      <PageHeader title="Support requests" description="Messages sent from the customer app" />
      <Card>
        <ErrorNote error={error} />
        <DataTable
          rows={data ?? []}
          columns={[
            { header: "When", cell: (t) => formatDate(t.createdAt) },
            { header: "Customer", cell: (t) => t.customerEmail ?? "—" },
            { header: "Subject", cell: (t) => <span className="font-medium">{t.subject}</span> },
            { header: "Message", cell: (t) => <p className="max-w-md whitespace-pre-wrap text-neutral-600">{t.message}</p> },
            {
              header: "Status",
              cell: (t) => (
                <ActionForm action={updateTicket} submitLabel="Set">
                  <input type="hidden" name="id" value={t.id} />
                  <StatusBadge status={t.status} />
                  <select name="status" defaultValue={t.status} className={inputClass}>
                    <option value="open">Open</option>
                    <option value="pending">Pending</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
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
