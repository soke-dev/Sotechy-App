import Link from "next/link";
import { formatNaira, type CatalogProduct } from "@sotechy/shared";
import { Card, DataTable, ErrorNote, PageHeader, buttonClass } from "@/components/ui";
import { load } from "@/lib/api";

export default async function ProductsPage() {
  const { data, error } = await load<CatalogProduct[]>("/admin/products");
  return (
    <>
      <PageHeader
        title="Products"
        description="Central catalogue shared by the app, website and stores"
        actions={<Link href="/products/new" className={buttonClass}>Add product</Link>}
      />
      <Card>
        <ErrorNote error={error} />
        <DataTable
          rows={data ?? []}
          columns={[
            {
              header: "Product",
              cell: (p) => (
                <Link href={`/products/${p.id}`} className="font-medium underline">
                  {p.name}
                </Link>
              ),
            },
            { header: "Brand", cell: (p) => p.brand ?? "—" },
            { header: "Category", cell: (p) => p.categoryName ?? "—" },
            { header: "From", cell: (p) => formatNaira(p.minPrice) },
            { header: "Available", cell: (p) => p.totalAvailable },
            { header: "Status", cell: (p) => (p.isPublished ? "Published" : "Hidden") + (p.isFeatured ? " · Featured" : "") + (p.isDemo ? " · DEMO" : "") },
          ]}
        />
      </Card>
    </>
  );
}
