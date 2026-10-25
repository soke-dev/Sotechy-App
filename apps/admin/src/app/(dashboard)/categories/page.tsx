import type { Category } from "@sotechy/shared";
import { ActionForm } from "@/components/action-form";
import { Card, DataTable, ErrorNote, Field, inputClass, PageHeader } from "@/components/ui";
import { load } from "@/lib/api";
import { createCategory, toggleCategory, updateCategory } from "../actions";

function CategoryFields({ category, tops }: { category?: Category; tops: Category[] }) {
  return (
    <>
      {category && <input type="hidden" name="id" value={category.id} />}
      <Field label="Name"><input name="name" required defaultValue={category?.name} className={inputClass} /></Field>
      <Field label="Parent (leave empty for a main category)">
        <select name="parentId" defaultValue={category?.parentId ?? ""} className={inputClass}>
          <option value="">— Main category —</option>
          {tops.filter((c) => c.id !== category?.id).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Sort order"><input name="sortOrder" type="number" defaultValue={category?.sortOrder ?? 0} className={inputClass} /></Field>
      <Field label="Picture">
        <input name="image" type="file" accept="image/png,image/jpeg,image/webp" className="text-sm" />
        {category?.imageUrl && <input type="hidden" name="imageUrl" value={category.imageUrl} />}
      </Field>
    </>
  );
}

export default async function CategoriesPage() {
  const { data, error } = await load<Category[]>("/admin/categories");
  const tops = (data ?? []).filter((c) => !c.parentId);
  return (
    <>
      <PageHeader title="Categories" description="Main categories show on the app's Home and Shop screens; sub-categories appear under them." />
      <Card title="Add category" className="mb-4">
        <ActionForm action={createCategory} submitLabel="Add">
          <CategoryFields tops={tops} />
        </ActionForm>
      </Card>
      <Card>
        <ErrorNote error={error} />
        <DataTable
          rows={tops.flatMap((top) => [top, ...(data ?? []).filter((c) => c.parentId === top.id)])}
          columns={[
            {
              header: "Name",
              cell: (c) => (
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {c.imageUrl ? <img src={c.imageUrl} alt="" className="h-8 w-8 rounded object-cover" /> : <span className="h-8 w-8 rounded bg-neutral-100" />}
                  {c.parentId ? <span className="pl-3 text-neutral-600">↳ {c.name}</span> : <span className="font-medium">{c.name}</span>}
                </div>
              ),
            },
            { header: "Slug", cell: (c) => c.slug },
            { header: "Order", cell: (c) => c.sortOrder },
            {
              header: "Visible",
              cell: (c) => (
                <ActionForm action={toggleCategory} submitLabel={c.isActive ? "Hide" : "Show"}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="isActive" value={String(!c.isActive)} />
                  <span className="text-sm">{c.isActive ? "Yes" : "No"}</span>
                </ActionForm>
              ),
            },
            {
              header: "",
              cell: (c) => (
                <details>
                  <summary className="cursor-pointer text-sm text-neutral-700">Edit</summary>
                  <div className="mt-2 min-w-80">
                    <ActionForm action={updateCategory} submitLabel="Save" className="flex flex-col items-start gap-2">
                      <CategoryFields category={c} tops={tops} />
                    </ActionForm>
                  </div>
                </details>
              ),
            },
          ]}
        />
      </Card>
    </>
  );
}
