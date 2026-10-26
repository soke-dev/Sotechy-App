"use client";

import { ChevronDown, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { btn, EmptyState, inputClass, PageHeader, Pill, ProductThumb } from "@/components/ui";
import { formatNaira } from "@/lib/money";
import { products, type Product } from "@/lib/mock";

const FILTERS: { id: string; label: string; match: (p: Product) => boolean }[] = [
  { id: "all", label: "All", match: () => true },
  { id: "live", label: "Live", match: (p) => p.status === "live" },
  { id: "draft", label: "Drafts", match: (p) => p.status === "draft" },
  { id: "hidden", label: "Hidden", match: (p) => p.status === "hidden" },
  { id: "low", label: "Low stock", match: (p) => p.stock <= 3 },
];

const PRICES: { id: string; label: string; min?: number; max?: number }[] = [
  { id: "any", label: "Any price" },
  { id: "u20", label: "Under ₦20k", max: 20_000 },
  { id: "20-100", label: "₦20k – ₦100k", min: 20_000, max: 100_000 },
  { id: "100-400", label: "₦100k – ₦400k", min: 100_000, max: 400_000 },
  { id: "o400", label: "Over ₦400k", min: 400_000 },
];

const SORTS: { id: string; label: string; by: (a: Product, b: Product) => number }[] = [
  { id: "best", label: "Best selling", by: (a, b) => b.sold - a.sold },
  { id: "price-up", label: "Price: low to high", by: (a, b) => a.price - b.price },
  { id: "price-down", label: "Price: high to low", by: (a, b) => b.price - a.price },
  { id: "stock", label: "Stock left", by: (a, b) => a.stock - b.stock },
];

const TYPES = [...new Set(products.map((p) => p.category))].sort();

/** Pill-shaped dropdown used for the Type, Price and Sort filters. */
function PillSelect({ value, onChange, options, active }: { value: string; onChange: (v: string) => void; options: { id: string; label: string }[]; active: boolean }) {
  return (
    <span className="relative inline-flex min-w-0 flex-1 sm:flex-none">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`min-h-11 w-full appearance-none truncate rounded-full border py-2 pl-4 pr-9 text-sm font-semibold outline-none ${active ? "border-panel bg-panel text-white" : "border-line bg-surface text-ink-2"}`}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={15} className={`pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 ${active ? "text-white" : "text-muted"}`} />
    </span>
  );
}

export default function ProductsPage() {
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [price, setPrice] = useState("any");
  const [sort, setSort] = useState("best");
  const f = FILTERS.find((x) => x.id === filter)!;
  const range = PRICES.find((x) => x.id === price)!;
  const list = products
    .filter(f.match)
    .filter((p) => type === "all" || p.category === type)
    .filter((p) => (range.min === undefined || p.price >= range.min) && (range.max === undefined || p.price <= range.max))
    .filter((p) => !q.trim() || p.name.toLowerCase().includes(q.trim().toLowerCase()))
    .sort(SORTS.find((x) => x.id === sort)!.by);
  const narrowed = type !== "all" || price !== "any";

  return (
    <>
      <PageHeader
        illo="bag"
        title="Products"
        description="Everything on your storefront. Live products also appear in Sotechy's Shop and search."
        actions={
          <Link href="/products/new" className={btn.primary}>
            <Plus size={17} /> Add product
          </Link>
        }
      />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start">
        <div className="no-scrollbar -mx-1 flex min-w-0 gap-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible lg:flex-1">
          {FILTERS.map((x) => (
            <button
              key={x.id}
              onClick={() => setFilter(x.id)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${filter === x.id ? "border-panel bg-panel text-white" : "border-line bg-surface text-ink-2 hover:bg-surface-alt"}`}
            >
              {x.label} <span className="opacity-60">{products.filter(x.match).length}</span>
            </button>
          ))}
        </div>
        <div className="relative lg:w-72 lg:shrink-0">
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" className={`${inputClass} pl-11`} />
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <PillSelect value={type} onChange={setType} active={type !== "all"} options={[{ id: "all", label: "All types" }, ...TYPES.map((t) => ({ id: t, label: t }))]} />
        <PillSelect value={price} onChange={setPrice} active={price !== "any"} options={PRICES} />
        <PillSelect value={sort} onChange={setSort} active={false} options={SORTS} />
        {narrowed && (
          <button onClick={() => { setType("all"); setPrice("any"); }} className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold text-brand-strong hover:bg-brand-soft">
            <X size={15} /> Clear
          </button>
        )}
        <span className="ml-auto hidden text-sm text-muted sm:inline">{list.length} product{list.length === 1 ? "" : "s"}</span>
      </div>

      {list.length === 0 ? (
        <EmptyState illo="bag" title="No products here" message="Add your first product and it goes live on your storefront." action={<Link href="/products/new" className={`${btn.primary} mt-2`}>Add product</Link>} />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {list.map((p) => (
            <li key={p.id}>
              <Link href={`/products/${p.id}`} className="group flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-surface transition hover:shadow-[0_10px_28px_rgba(23,18,14,0.08)]">
                <div className="relative">
                  <ProductThumb src={p.image} size="fluid" rounded="rounded-none" />
                  <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                    {p.status !== "live" && <Pill tone="dark">{p.status === "draft" ? "Draft" : "Hidden"}</Pill>}
                    {p.stock === 0 ? <Pill tone="bad">Sold out</Pill> : p.stock <= 3 ? <Pill tone="warn">{p.stock} left</Pill> : null}
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-0.5 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{p.category}</p>
                  <p className="line-clamp-2 text-sm font-semibold leading-snug">{p.name}</p>
                  <div className="mt-auto flex items-baseline gap-2 pt-1">
                    <span className="font-display font-bold sm:text-lg">{formatNaira(p.price)}</span>
                    {p.compareAt && <span className="text-xs text-faint line-through">{formatNaira(p.compareAt)}</span>}
                  </div>
                  <p className="text-xs text-muted">{p.stock} in stock · {p.sold} sold</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
