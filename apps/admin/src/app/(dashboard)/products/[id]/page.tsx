import { formatNaira, type BranchStock, type Category, type Product, type ProductVariant } from "@sotechy/shared";
import { ActionForm } from "@/components/action-form";
import { ProductFields } from "@/components/product-fields";
import { Card, DataTable, ErrorNote, Field, inputClass, PageHeader } from "@/components/ui";
import { load } from "@/lib/api";
import { addVariant, updateProduct, updateVariant } from "../../actions";

type AdminProduct = Product & { variants: (ProductVariant & { costPrice: number | null })[]; stock: BranchStock[] };

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ data: product, error }, { data: categories }] = await Promise.all([
    load<AdminProduct>(`/admin/products/${id}`),
    load<Category[]>("/admin/categories"),
  ]);
  if (!product) return <ErrorNote error={error ?? "Product not found"} />;

  return (
    <>
      <PageHeader title={product.name} description={product.isDemo ? "Demo product — replace with real inventory" : undefined} />
      <div className="flex flex-col gap-4">
        <Card title="Details">
          <ActionForm action={updateProduct} className="flex flex-col gap-4">
            <input type="hidden" name="id" value={product.id} />
            <ProductFields categories={categories ?? []} product={product} />
          </ActionForm>
        </Card>

        <Card title="Variants & pricing">
          <div className="flex flex-col gap-3">
            {product.variants.map((v) => (
              <ActionForm key={v.id} action={updateVariant} submitLabel="Save">
                <input type="hidden" name="id" value={v.id} />
                <input type="hidden" name="productId" value={product.id} />
                <div className="w-48 text-sm">
                  <p className="font-medium">{v.name}</p>
                  <p className="text-neutral-500">{v.sku}</p>
                </div>
                <Field label="Price (₦)"><input name="price" type="number" step="0.01" defaultValue={v.price} className={inputClass} /></Field>
                <Field label="Compare-at"><input name="compareAtPrice" type="number" step="0.01" defaultValue={v.compareAtPrice ?? ""} className={inputClass} /></Field>
                <Field label="Cost"><input name="costPrice" type="number" step="0.01" defaultValue={v.costPrice ?? ""} className={inputClass} /></Field>
                <label className="text-sm"><input type="checkbox" name="isActive" defaultChecked={v.isActive} /> Active</label>
              </ActionForm>
            ))}
          </div>
          <h3 className="mb-2 mt-6 text-sm font-medium">Add variant</h3>
          <ActionForm action={addVariant} submitLabel="Add variant">
            <input type="hidden" name="productId" value={product.id} />
            <Field label="SKU"><input name="sku" required className={inputClass} /></Field>
            <Field label="Name"><input name="name" placeholder="256GB / Blue" required className={inputClass} /></Field>
            <Field label="Price (₦)"><input name="price" type="number" step="0.01" required className={inputClass} /></Field>
            <Field label="Cost (₦)"><input name="costPrice" type="number" step="0.01" className={inputClass} /></Field>
          </ActionForm>
        </Card>

        <Card title="Stock by branch">
          <DataTable
            rows={product.stock}
            empty="No stock recorded yet. Use Inventory → Adjust stock to add quantities per branch."
            columns={[
              { header: "Variant", cell: (s) => product.variants.find((v) => v.id === s.variantId)?.name ?? s.variantId },
              { header: "Branch", cell: (s) => s.branchName },
              { header: "On hand", cell: (s) => s.quantity },
              { header: "Reserved", cell: (s) => s.reserved },
              { header: "Available", cell: (s) => s.quantity - s.reserved },
              { header: "Value at price", cell: (s) => formatNaira((product.variants.find((v) => v.id === s.variantId)?.price ?? 0) * s.quantity) },
            ]}
          />
        </Card>
      </div>
    </>
  );
}
