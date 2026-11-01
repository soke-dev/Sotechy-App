import { ChevronRight, Package, Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { formatNaira, type CatalogProduct } from "@sotechy/shared";
import { Card, ErrorNote, PageHeader, Pill, primaryButtonClass } from "@/components/ui";
import { UrlSearch, UrlSelect } from "@/components/url-controls";
import { load } from "@/lib/api";

type Params = { q?: string; category?: string; show?: string; sort?: string; store?: string };
/** Admin's list: every store's products and Sotechy's own, with when Sotechy paused one */
type Row = CatalogProduct & { pausedAt?: string | null; storeCategory?: string | null };

const SHOW: Record<string, (p: Row) => boolean> = {
  published: (p) => p.isPublished,
  hidden: (p) => !p.isPublished,
  paused: (p) => !!p.pausedAt,
  featured: (p) => p.isFeatured,
  low: (p) => p.totalAvailable <= 3,
  demo: (p) => p.isDemo,
};

const SORTS: Record<string, (a: Row, b: Row) => number> = {
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  name: (a, b) => a.name.localeCompare(b.name),
  "price-high": (a, b) => b.minPrice - a.minPrice,
  "price-low": (a, b) => a.minPrice - b.minPrice,
  "stock-low": (a, b) => a.totalAvailable - b.totalAvailable,
};

function Thumb({ p, size }: { p: Row; size: number }) {
  return (
    <span className="flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand" style={{ width: size, height: size }}>
      {p.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.imageUrl} alt="" className="h-[82%] w-[82%] object-contain" />
      ) : (
        <Package size={size * 0.45} className="text-white/80" />
      )}
    </span>
  );
}

function Flags({ p }: { p: Row }) {
  return (
    <>
      {p.pausedAt ? <Pill tone="bad">Paused</Pill> : !p.isPublished && <Pill tone="neutral">Hidden</Pill>}
      {p.isFeatured && <Pill tone="brand">Featured</Pill>}
      {p.isDemo && <Pill tone="info" dot={false}>Demo</Pill>}
    </>
  );
}

const stockTone = (n: number) => (n === 0 ? "text-bad" : n <= 3 ? "text-warn" : "text-ink");

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { q, category = "", show = "", sort = "newest", store = "" } = await searchParams;
  const { data, error } = await load<Row[]>("/admin/products");
  const all = data ?? [];
  const categoryOf = (p: Row) => p.categoryName ?? p.storeCategory ?? null;
  const categories = [...new Set(all.map(categoryOf).filter(Boolean) as string[])].sort();
  // Each store with products, by name; "sotechy" = Sotechy's own catalogue
  const stores = [...new Map(all.filter((p) => p.storeSlug).map((p) => [p.storeSlug!, p.storeName ?? p.storeSlug!])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const term = q?.toLowerCase();
  const rows = all
    .filter((p) => !term || `${p.name} ${p.brand ?? ""} ${p.model ?? ""}`.toLowerCase().includes(term))
    .filter((p) => !category || categoryOf(p) === category)
    .filter((p) => !store || (store === "sotechy" ? !p.storeSlug : p.storeSlug === store))
    .filter((p) => !show || (SHOW[show]?.(p) ?? true))
    .sort(SORTS[sort] ?? SORTS.newest);

  return (
    <>
      <PageHeader
        icon={Package}
        title="Products"
        description="Every store's products and Sotechy's own. Open one to see who sells it, pause it or delete it."
        actions={
          <>
            <Suspense>
              <UrlSearch placeholder="Name, brand or model" />
            </Suspense>
            <Link href="/products/new" className={primaryButtonClass}>
              <Plus size={16} /> Add product
            </Link>
          </>
        }
      />

      <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap">
        <Suspense>
          <UrlSelect param="store" label="Store" options={[{ value: "", label: "All" }, { value: "sotechy", label: "Sotechy" }, ...stores.map(([slug, name]) => ({ value: slug, label: name }))]} />
          <UrlSelect param="category" label="Category" options={[{ value: "", label: "All" }, ...categories.map((c) => ({ value: c, label: c }))]} />
          <UrlSelect
            param="show"
            label="Show"
            options={[
              { value: "", label: "Everything" },
              { value: "published", label: "On sale" },
              { value: "hidden", label: "Hidden" },
              { value: "paused", label: "Paused by Sotechy" },
              { value: "featured", label: "Featured" },
              { value: "low", label: "Low stock" },
              { value: "demo", label: "Demo items" },
            ]}
          />
          <UrlSelect
            param="sort"
            label="Sort"
            options={[
              { value: "newest", label: "Newest first" },
              { value: "name", label: "Name A–Z" },
              { value: "price-high", label: "Price: high to low" },
              { value: "price-low", label: "Price: low to high" },
              { value: "stock-low", label: "Lowest stock" },
            ]}
          />
        </Suspense>
      </div>

      <Card>
        <ErrorNote error={error} />
        <p className="mb-3 text-sm text-muted">
          {rows.length} of {all.length} products
        </p>
        {rows.length === 0 ? (
          <p className="rounded-3xl border-2 border-dashed border-line py-10 text-center text-sm text-muted">No products match. Try another filter.</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {["Product", "Store", "Category", "From", "Available", "", ""].map((h, i) => (
                      <th key={i} className="whitespace-nowrap bg-surface-alt px-3 py-2.5 first:rounded-l-xl last:rounded-r-xl">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id} className="border-b border-line/70 transition-colors last:border-0 hover:bg-canvas">
                      <td className="px-3 py-3">
                        <Link href={`/products/${p.id}`} className="flex items-center gap-3 font-semibold hover:text-brand-strong">
                          <Thumb p={p} size={44} />
                          <span className="min-w-0">
                            <span className="block">{p.name}</span>
                            <span className="block text-xs font-normal text-muted">{p.brand ?? "No brand"}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-ink-2">{p.storeName ?? "Sotechy"}</td>
                      <td className="px-3 py-3 text-ink-2">{categoryOf(p) ?? "—"}</td>
                      <td className="whitespace-nowrap px-3 py-3 font-semibold">{formatNaira(p.minPrice)}</td>
                      <td className={`px-3 py-3 font-semibold ${stockTone(p.totalAvailable)}`}>{p.totalAvailable}</td>
                      <td className="px-3 py-3">
                        <span className="flex flex-wrap gap-1.5">
                          <Flags p={p} />
                        </span>
                      </td>
                      <td className="pr-2"><ChevronRight size={16} className="text-faint" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Phones: two lines per product */}
            <ul className="flex flex-col gap-2 md:hidden">
              {rows.map((p) => (
                <li key={p.id}>
                  <Link href={`/products/${p.id}`} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-2.5">
                    <Thumb p={p} size={48} />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex items-baseline gap-2">
                        <span className="min-w-0 flex-1 truncate font-semibold">{p.name}</span>
                        <span className="font-display shrink-0 font-bold">{formatNaira(p.minPrice)}</span>
                      </span>
                      <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
                        <span className="truncate">{p.storeName ?? "Sotechy"} · {categoryOf(p) ?? "No category"}</span>·
                        <span className={`shrink-0 font-semibold ${stockTone(p.totalAvailable)}`}>{p.totalAvailable} left</span>
                        <span className="ml-auto flex shrink-0 gap-1">
                          <Flags p={p} />
                        </span>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </>
  );
}
