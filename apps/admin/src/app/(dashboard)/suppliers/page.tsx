import { formatDate, formatNaira, type Branch } from "@sotechy/shared";
import { ActionForm } from "@/components/action-form";
import { Card, DataTable, ErrorNote, Field, inputClass, PageHeader, StatusBadge } from "@/components/ui";
import { load } from "@/lib/api";
import type { PosSearchRow, PurchaseOrderRow, Supplier } from "@/lib/types";
import { createPurchaseOrder, createSupplier, receivePurchaseOrder } from "../actions";

export default async function SuppliersPage() {
  const [suppliers, orders, branches, variants] = await Promise.all([
    load<Supplier[]>("/admin/suppliers"),
    load<PurchaseOrderRow[]>("/admin/purchase-orders"),
    load<Branch[]>("/admin/branches"),
    load<PosSearchRow[]>("/admin/pos/search"),
  ]);

  return (
    <>
      <PageHeader title="Suppliers & purchasing" description="Receiving a purchase order adds stock and records the latest cost price (managers)" />
      <ErrorNote error={suppliers.error} />
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card title="Add supplier">
          <ActionForm action={createSupplier} submitLabel="Add">
            <Field label="Name"><input name="name" required className={inputClass} /></Field>
            <Field label="Contact"><input name="contactName" className={inputClass} /></Field>
            <Field label="Phone"><input name="phone" className={inputClass} /></Field>
            <Field label="Email"><input name="email" className={inputClass} /></Field>
          </ActionForm>
        </Card>
        <Card title="New purchase order (single item for now)">
          <ActionForm action={createPurchaseOrder} submitLabel="Create">
            <Field label="Supplier">
              <select name="supplierId" className={inputClass}>
                <option value="">—</option>
                {(suppliers.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Receive at">
              <select name="branchId" required className={inputClass}>
                {(branches.data ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
            <Field label="Product">
              <select name="variantId" required className={inputClass}>
                {(variants.data ?? []).map((v) => <option key={v.variantId} value={v.variantId}>{v.productName} — {v.variantName}</option>)}
              </select>
            </Field>
            <Field label="Qty"><input name="quantity" type="number" min={1} required className={`${inputClass} w-20`} /></Field>
            <Field label="Unit cost (₦)"><input name="unitCost" type="number" min={0} required className={`${inputClass} w-28`} /></Field>
          </ActionForm>
        </Card>
      </div>
      <Card title="Suppliers" className="mb-4">
        <DataTable
          rows={suppliers.data ?? []}
          columns={[
            { header: "Name", cell: (s) => s.name },
            { header: "Contact", cell: (s) => s.contactName ?? "—" },
            { header: "Phone", cell: (s) => s.phone ?? "—" },
            { header: "Email", cell: (s) => s.email ?? "—" },
          ]}
        />
      </Card>
      <Card title="Purchase orders">
        <DataTable
          rows={orders.data ?? []}
          columns={[
            { header: "Supplier", cell: (o) => o.supplierName ?? "—" },
            { header: "Branch", cell: (o) => o.branchName },
            { header: "Total cost", cell: (o) => formatNaira(o.totalCost) },
            { header: "Status", cell: (o) => <StatusBadge status={o.status} /> },
            { header: "Ordered", cell: (o) => formatDate(o.orderedAt) },
            {
              header: "",
              cell: (o) =>
                o.status === "ordered" ? (
                  <ActionForm action={receivePurchaseOrder} submitLabel="Receive stock">
                    <input type="hidden" name="id" value={o.id} />
                  </ActionForm>
                ) : (
                  formatDate(o.receivedAt)
                ),
            },
          ]}
        />
      </Card>
    </>
  );
}
