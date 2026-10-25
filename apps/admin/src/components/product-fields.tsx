import type { Category, Product } from "@sotechy/shared";
import { Field, inputClass } from "./ui";

/** Shared product form fields for create and edit. */
export function ProductFields({ categories, product }: { categories: Category[]; product?: Product }) {
  const specText = product ? Object.entries(product.specifications).map(([k, v]) => `${k}: ${v}`).join("\n") : "";
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Name *">
        <input name="name" required defaultValue={product?.name} className={inputClass} />
      </Field>
      <Field label="Category">
        <select name="categoryId" defaultValue={product?.categoryId ?? ""} className={inputClass}>
          <option value="">—</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Brand">
        <input name="brand" defaultValue={product?.brand ?? ""} className={inputClass} />
      </Field>
      <Field label="Model">
        <input name="model" defaultValue={product?.model ?? ""} className={inputClass} />
      </Field>
      <Field label="Condition">
        <select name="condition" defaultValue={product?.condition ?? "new"} className={inputClass}>
          <option value="new">New</option>
          <option value="used">Used</option>
          <option value="refurbished">Refurbished</option>
        </select>
      </Field>
      <Field label="Warranty (months)">
        <input name="warrantyMonths" type="number" min={0} defaultValue={product?.warrantyMonths ?? ""} className={inputClass} />
      </Field>
      <Field label="Low-stock alert at">
        <input name="lowStockThreshold" type="number" min={0} defaultValue={product?.lowStockThreshold ?? 3} className={inputClass} />
      </Field>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label><input type="checkbox" name="isPublished" defaultChecked={product?.isPublished ?? false} /> Published</label>
        <label><input type="checkbox" name="isFeatured" defaultChecked={product?.isFeatured ?? false} /> Featured</label>
        <label><input type="checkbox" name="allowDelivery" defaultChecked={product?.allowDelivery ?? true} /> Delivery</label>
        <label><input type="checkbox" name="allowPickup" defaultChecked={product?.allowPickup ?? true} /> Pickup</label>
      </div>
      <div className="sm:col-span-2">
        <Field label="Description">
          <textarea name="description" rows={3} defaultValue={product?.description ?? ""} className={inputClass} />
        </Field>
      </div>
      <Field label="Specifications (one per line, Key: Value)">
        <textarea name="specifications" rows={4} defaultValue={specText} className={inputClass} placeholder={"RAM: 8GB\nStorage: 256GB"} />
      </Field>
      <Field label="Image URLs (one per line)">
        <textarea name="images" rows={4} defaultValue={product?.images.join("\n")} className={inputClass} placeholder="https://…" />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Return policy">
          <input name="returnPolicy" defaultValue={product?.returnPolicy ?? ""} className={inputClass} />
        </Field>
      </div>
    </div>
  );
}
