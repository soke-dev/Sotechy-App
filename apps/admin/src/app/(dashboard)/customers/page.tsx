import { Users } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { formatDate, formatNaira, type User } from "@sotechy/shared";
import { LiveSwitch } from "@/components/switch";
import { Card, DataTable, ErrorNote, PageHeader } from "@/components/ui";
import { UrlSearch } from "@/components/url-controls";
import { load } from "@/lib/api";
import { setCustomerActive } from "../actions";

type CustomerRow = User & { isActive: boolean; orders: number; spent: number };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { data, error } = await load<CustomerRow[]>(`/admin/customers${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  return (
    <>
      <PageHeader icon={Users} title="Customers" description="Every customer account. Open one to see their orders, tokens and history. Blocking signs a customer out and stops them signing in (admins)." />
      <div className="mb-4 max-w-md">
        <Suspense>
          <UrlSearch placeholder="Name, email, @username or phone" />
        </Suspense>
      </div>
      <Card>
        <ErrorNote error={error} />
        <DataTable
          rows={data ?? []}
          empty={q ? `No customer matches “${q}”` : "No customers yet"}
          columns={[
            {
              header: "Customer",
              cell: (u) => (
                <Link href={`/customers/${u.id}`} className="block min-w-0 hover:underline">
                  <span className="block font-semibold">{u.fullName ?? u.email}</span>
                  <span className="block text-xs text-muted">{u.username ? `@${u.username}` : u.email}</span>
                </Link>
              ),
            },
            { header: "Phone", hideOnPhone: true, cell: (u) => u.phone ?? "—" },
            { header: "Orders", cell: (u) => u.orders },
            { header: "Spent", cell: (u) => formatNaira(u.spent) },
            { header: "Joined", hideOnPhone: true, cell: (u) => formatDate(u.createdAt) },
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
