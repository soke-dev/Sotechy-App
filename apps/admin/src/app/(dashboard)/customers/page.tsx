import { formatDate, type User } from "@sotechy/shared";
import { Card, DataTable, ErrorNote, PageHeader } from "@/components/ui";
import { load } from "@/lib/api";

export default async function CustomersPage() {
  const { data, error } = await load<(User & { isActive: boolean })[]>("/admin/customers");
  return (
    <>
      <PageHeader title="Customers" description="Registered customer accounts" />
      <Card>
        <ErrorNote error={error} />
        <DataTable
          rows={data ?? []}
          columns={[
            { header: "Name", cell: (u) => u.fullName ?? "—" },
            { header: "Email", cell: (u) => u.email },
            { header: "Phone", cell: (u) => u.phone ?? "—" },
            { header: "Joined", cell: (u) => formatDate(u.createdAt) },
            { header: "Active", cell: (u) => (u.isActive ? "Yes" : "No") },
          ]}
        />
      </Card>
    </>
  );
}
