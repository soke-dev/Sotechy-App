import { ScrollText } from "lucide-react";
import { formatDate } from "@sotechy/shared";
import { Card, DataTable, ErrorNote, PageHeader } from "@/components/ui";
import { load } from "@/lib/api";
import type { AuditLogRow } from "@/lib/types";

export default async function AuditLogsPage() {
  const { data, error } = await load<AuditLogRow[]>("/admin/audit-logs");
  return (
    <>
      <PageHeader icon={ScrollText} title="Audit log" description="Payments, refunds, stock changes, status changes and settings (admins)" />
      <Card>
        <ErrorNote error={error} />
        <DataTable
          rows={data ?? []}
          columns={[
            { header: "When", cell: (l) => formatDate(l.createdAt) },
            { header: "Who", cell: (l) => l.actorEmail ?? "system / provider" },
            { header: "Action", cell: (l) => <code className="text-xs">{l.action}</code> },
            { header: "Entity", cell: (l) => `${l.entityType}${l.entityId ? ` ${l.entityId.slice(0, 8)}` : ""}` },
            { header: "Details", cell: (l) => <code className="block max-w-md truncate text-xs text-muted">{JSON.stringify(l.details)}</code> },
          ]}
        />
      </Card>
    </>
  );
}
