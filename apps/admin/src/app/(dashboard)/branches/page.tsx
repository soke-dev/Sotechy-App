import { Building2 } from "lucide-react";
import type { Branch } from "@sotechy/shared";
import { ActionForm } from "@/components/action-form";
import { Card, DataTable, ErrorNote, Field, inputClass, PageHeader } from "@/components/ui";
import { load } from "@/lib/api";
import { createBranch } from "../actions";

export default async function BranchesPage() {
  const { data, error } = await load<Branch[]>("/admin/branches");
  return (
    <>
      <PageHeader icon={Building2} title="Branches" description="Physical stores. Each has its own stock." />
      <Card title="Add branch (admins)" className="mb-4">
        <ActionForm action={createBranch} submitLabel="Add branch">
          <Field label="Name"><input name="name" required className={inputClass} /></Field>
          <Field label="Code"><input name="code" required placeholder="BR-02" className={inputClass} /></Field>
          <Field label="Address"><input name="address" required className={inputClass} /></Field>
          <Field label="City"><input name="city" required className={inputClass} /></Field>
          <Field label="State"><input name="state" required className={inputClass} /></Field>
          <Field label="Phone"><input name="phone" className={inputClass} /></Field>
          <Field label="Opening hours"><input name="openingHours" placeholder="Mon–Sat 9am–6pm" className={inputClass} /></Field>
        </ActionForm>
      </Card>
      <Card>
        <ErrorNote error={error} />
        <DataTable
          rows={data ?? []}
          columns={[
            { header: "Name", cell: (b) => b.name },
            { header: "Code", cell: (b) => b.code },
            { header: "Address", cell: (b) => `${b.address}, ${b.city}, ${b.state}` },
            { header: "Phone", cell: (b) => b.phone ?? "—" },
            { header: "Hours", cell: (b) => b.openingHours ?? "—" },
            { header: "Active", cell: (b) => (b.isActive ? "Yes" : "No") },
          ]}
        />
      </Card>
    </>
  );
}
