import type { Category } from "@sotechy/shared";
import { ActionForm } from "@/components/action-form";
import { Card, DataTable, ErrorNote, Field, inputClass, PageHeader } from "@/components/ui";
import { load } from "@/lib/api";
import { createCategory, toggleCategory } from "../actions";

export default async function CategoriesPage() {
  const { data, error } = await load<Category[]>("/admin/categories");
  return (
    <>
      <PageHeader title="Categories" description="Add categories without code changes" />
      <Card title="Add category" className="mb-4">
        <ActionForm action={createCategory} submitLabel="Add">
          <Field label="Name"><input name="name" required className={inputClass} /></Field>
          <Field label="Sort order"><input name="sortOrder" type="number" defaultValue={0} className={inputClass} /></Field>
          <Field label="Image URL"><input name="imageUrl" className={inputClass} /></Field>
        </ActionForm>
      </Card>
      <Card>
        <ErrorNote error={error} />
        <DataTable
          rows={data ?? []}
          columns={[
            { header: "Name", cell: (c) => c.name },
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
          ]}
        />
      </Card>
    </>
  );
}
