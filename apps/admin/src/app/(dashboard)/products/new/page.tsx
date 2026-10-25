import type { Category } from "@sotechy/shared";
import { ActionForm } from "@/components/action-form";
import { ProductFields } from "@/components/product-fields";
import { Card, Field, inputClass, PageHeader } from "@/components/ui";
import { load } from "@/lib/api";
import { createProduct } from "../../actions";

export default async function NewProductPage() {
  const { data: categories } = await load<Category[]>("/admin/categories");
  return (
    <>
      <PageHeader title="Add product" description="Add stock per branch from Inventory after saving" />
      <Card>
        <ActionForm action={createProduct} submitLabel="Create product" className="flex flex-col gap-6">
          <ProductFields categories={categories ?? []} />
          <div>
            <h3 className="mb-2 font-medium">First variant & pricing</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="SKU *"><input name="sku" required className={inputClass} /></Field>
              <Field label="Variant name"><input name="variantName" placeholder="Standard / 128GB Black" className={inputClass} /></Field>
              <Field label="Price (₦) *"><input name="price" type="number" min={0} step="0.01" required className={inputClass} /></Field>
              <Field label="Compare-at price (₦)"><input name="compareAtPrice" type="number" min={0} step="0.01" className={inputClass} /></Field>
              <Field label="Cost price (₦) — for profit reports"><input name="costPrice" type="number" min={0} step="0.01" className={inputClass} /></Field>
            </div>
          </div>
        </ActionForm>
      </Card>
    </>
  );
}
