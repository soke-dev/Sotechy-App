import { UserCog } from "lucide-react";
import { ROLE_LABELS, type Branch, type Role, type User } from "@sotechy/shared";
import { ActionForm } from "@/components/action-form";
import { Card, DataTable, ErrorNote, Field, inputClass, PageHeader } from "@/components/ui";
import { load } from "@/lib/api";
import { createStaff, updateUser } from "../actions";

const roles = Object.entries(ROLE_LABELS) as [Role, string][];

export default async function StaffPage() {
  const [staff, branches] = await Promise.all([load<(User & { isActive: boolean })[]>("/admin/staff"), load<Branch[]>("/admin/branches")]);
  const branchOptions = [<option key="" value="">All branches</option>, ...(branches.data ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)];

  return (
    <>
      <PageHeader icon={UserCog} title="Staff & roles" description="Staff record sales at their branch; managers adjust stock and verify payments; admins configure everything" />
      <Card title="Add staff account (admins)" className="mb-4">
        <ActionForm action={createStaff} submitLabel="Create account">
          <Field label="Full name"><input name="fullName" className={inputClass} /></Field>
          <Field label="Email"><input name="email" type="email" required className={inputClass} /></Field>
          <Field label="Temporary password"><input name="password" type="password" minLength={8} required className={inputClass} /></Field>
          <Field label="Role">
            <select name="role" defaultValue="staff" className={inputClass}>
              {roles.filter(([r]) => r !== "customer").map(([r, l]) => <option key={r} value={r}>{l}</option>)}
            </select>
          </Field>
          <Field label="Branch"><select name="branchId" className={inputClass}>{branchOptions}</select></Field>
        </ActionForm>
      </Card>
      <Card>
        <ErrorNote error={staff.error} />
        <DataTable
          rows={staff.data ?? []}
          columns={[
            { header: "Name", cell: (u) => u.fullName ?? "—" },
            { header: "Email", cell: (u) => u.email },
            {
              header: "Role / branch / status",
              cell: (u) => (
                <ActionForm action={updateUser} submitLabel="Save">
                  <input type="hidden" name="id" value={u.id} />
                  <select name="role" defaultValue={u.role} className={inputClass}>
                    {roles.map(([r, l]) => <option key={r} value={r}>{l}</option>)}
                  </select>
                  <select name="branchId" defaultValue={u.branchId ?? ""} className={inputClass}>{branchOptions}</select>
                  <select name="isActive" defaultValue={String(u.isActive)} className={inputClass}>
                    <option value="true">Active</option>
                    <option value="false">Disabled</option>
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
