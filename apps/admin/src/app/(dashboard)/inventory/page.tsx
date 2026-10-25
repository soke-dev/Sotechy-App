import Link from "next/link";
import { formatDate, type Branch } from "@sotechy/shared";
import { ActionForm } from "@/components/action-form";
import { Card, DataTable, ErrorNote, Field, inputClass, PageHeader } from "@/components/ui";
import { load } from "@/lib/api";
import type { InventoryRow, PosSearchRow, StockMovementRow } from "@/lib/types";
import { adjustStock, transferStock } from "../actions";

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ branchId?: string }> }) {
  const { branchId } = await searchParams;
  const [inv, branches, variants, movements] = await Promise.all([
    load<InventoryRow[]>(`/admin/inventory${branchId ? `?branchId=${branchId}` : ""}`),
    load<Branch[]>("/admin/branches"),
    load<PosSearchRow[]>("/admin/pos/search"),
    load<StockMovementRow[]>("/admin/inventory/movements"),
  ]);
  const branchOptions = (branches.data ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>);
  const variantOptions = (variants.data ?? []).map((v) => (
    <option key={v.variantId} value={v.variantId}>{v.productName} — {v.variantName} ({v.sku})</option>
  ));

  return (
    <>
      <PageHeader title="Inventory" description="Stock per branch. Reserved = held by unpaid orders." />
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href="/inventory" className="rounded-full border border-neutral-300 bg-white px-3 py-1">All branches</Link>
        {(branches.data ?? []).map((b) => (
          <Link key={b.id} href={`/inventory?branchId=${b.id}`} className="rounded-full border border-neutral-300 bg-white px-3 py-1">{b.name}</Link>
        ))}
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card title="Adjust stock (managers)">
          <ActionForm action={adjustStock} submitLabel="Apply">
            <Field label="Product"><select name="variantId" required className={inputClass}>{variantOptions}</select></Field>
            <Field label="Branch"><select name="branchId" required className={inputClass}>{branchOptions}</select></Field>
            <Field label="Type">
              <select name="type" className={inputClass}>
                <option value="restock">Restock (+)</option>
                <option value="adjustment">Count correction (+/-)</option>
                <option value="return">Customer return (+)</option>
              </select>
            </Field>
            <Field label="Change"><input name="delta" type="number" required className={`${inputClass} w-24`} /></Field>
            <Field label="Note"><input name="note" className={inputClass} /></Field>
          </ActionForm>
        </Card>
        <Card title="Transfer between branches (managers)">
          <ActionForm action={transferStock} submitLabel="Transfer">
            <Field label="Product"><select name="variantId" required className={inputClass}>{variantOptions}</select></Field>
            <Field label="From"><select name="fromBranchId" required className={inputClass}>{branchOptions}</select></Field>
            <Field label="To"><select name="toBranchId" required className={inputClass}>{branchOptions}</select></Field>
            <Field label="Qty"><input name="quantity" type="number" min={1} required className={`${inputClass} w-20`} /></Field>
          </ActionForm>
        </Card>
      </div>

      <Card title="Stock levels" className="mb-4">
        <ErrorNote error={inv.error} />
        <DataTable
          rows={inv.data ?? []}
          columns={[
            { header: "Product", cell: (r) => <Link href={`/products/${r.productId}`} className="underline">{r.productName}</Link> },
            { header: "Variant", cell: (r) => r.variantName },
            { header: "SKU", cell: (r) => r.sku },
            { header: "Branch", cell: (r) => r.branchName },
            { header: "On hand", cell: (r) => r.quantity },
            { header: "Reserved", cell: (r) => r.reserved },
            { header: "Available", cell: (r) => <span className={r.isLow ? "font-semibold text-red-600" : ""}>{r.available}{r.isLow ? " · low" : ""}</span> },
          ]}
        />
      </Card>

      <Card title="Recent stock movements">
        <DataTable
          rows={movements.data ?? []}
          columns={[
            { header: "When", cell: (m) => formatDate(m.createdAt) },
            { header: "Type", cell: (m) => m.movementType },
            { header: "Product", cell: (m) => `${m.productName} (${m.sku})` },
            { header: "Branch", cell: (m) => m.branchName },
            { header: "Change", cell: (m) => (m.quantity > 0 ? `+${m.quantity}` : m.quantity) },
            { header: "By", cell: (m) => m.performedBy ?? "system" },
            { header: "Note", cell: (m) => m.note ?? "" },
          ]}
        />
      </Card>
    </>
  );
}
