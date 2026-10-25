import { formatDate, type User } from "@sotechy/shared";
import { LiveSwitch } from "@/components/switch";
import { Card, DataTable, ErrorNote, PageHeader } from "@/components/ui";
import { load } from "@/lib/api";
import { setCustomerActive } from "../actions";

export default async function CustomersPage() {
  const { data, error } = await load<(User & { isActive: boolean })[]>("/admin/customers");
  return (
    <>
      <PageHeader title="Customers" description="Registered customer accounts. Blocking signs a customer out and stops them signing in (admins)." />
      <Card>
        <ErrorNote error={error} />
        <DataTable
          rows={data ?? []}
          columns={[
            { header: "Name", cell: (u) => u.fullName ?? "—" },
            { header: "Email", cell: (u) => u.email },
            { header: "Phone", cell: (u) => u.phone ?? "—" },
            { header: "Joined", cell: (u) => formatDate(u.createdAt) },
            {
              header: "Can sign in",
              cell: (u) => (
                <div className="w-40">
                  <LiveSwitch label={u.isActive ? "Active" : "Blocked"} initial={u.isActive} onChange={setCustomerActive.bind(null, u.id)} />
                </div>
              ),
            },
          ]}
        />
      </Card>
    </>
  );
}
