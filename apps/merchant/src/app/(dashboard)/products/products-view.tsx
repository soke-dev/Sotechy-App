"use client";

import { Check, ChevronDown, Copy, Eye, EyeOff, MoreHorizontal, PackageX, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { btn, EmptyState, inputClass, PageHeader, Pill, ProductThumb } from "@/components/ui";
import { duplicateProduct, productActions } from "@/lib/market-actions";
import { ImportProducts } from "./import-products";
import { formatNaira } from "@/lib/money";
import type { Product } from "@/lib/mock";

type Action = "live" | "hidden" | "out_of_stock" | "delete";

const FILTERS: { id: string; label: string; match: (p: Product) => boolean }[] = [
  { id: "all", label: "All", match: () => true },
  { id: "live", label: "Live", match: (p) => p.status === "live" },
  { id: "draft", label: "Drafts", match: (p) => p.status === "draft" },
  { id: "hidden", label: "Hidden", match: (p) => p.status === "hidden" },
  { id: "paused", label: "Paused by Sotechy", match: (p) => p.status === "paused" },
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



/** Pill-shaped dropdown used for the Type, Price and Sort filters. */
function PillSelect({ value, onChange, options, active }: { value: string; onChange: (v: string) => void; options: { id: string; label: string }[]; active: boolean }) {
  return (
    <span className="relative inline-flex min-w-0 sm:flex-none">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`min-h-11 w-full appearance-none truncate rounded-full border py-2 pl-4 pr-9 text-sm font-semibold outline-none ${active ? "border-inverse bg-inverse text-on-inverse" : "border-line bg-surface text-ink-2"}`}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={15} className={`pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 ${active ? "text-white" : "text-muted"}`} />
    </span>
  );
}

/** Asks before something that can't be undone */
function ConfirmDialog({ open, title, message, confirmLabel, busy, onConfirm, onCancel }: { open: boolean; title: string; message: ReactNode; confirmLabel: string; busy: boolean; onConfirm: () => void; onCancel: () => void }) {
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onCancel]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center" onClick={onCancel}>
      <div role="alertdialog" aria-modal className="w-full max-w-sm rounded-3xl bg-surface p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-bad-soft text-bad">
          <Trash2 size={22} />
        </span>
        <h2 className="font-display text-xl font-bold">{title}</h2>
        <div className="mt-2 text-sm text-ink-2">{message}</div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onCancel} className={btn.ghost} disabled={busy}>Cancel</button>
          <button onClick={onConfirm} disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-bad px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50">
            {busy ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** A card's "⋯" menu */
function CardMenu({ p, onAct, onDuplicate, onDelete }: { p: Product; onAct: (a: Action) => void; onDuplicate: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);
  const item = "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium hover:bg-surface-alt";
  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };
  return (
    <div ref={ref} className="absolute right-2 top-2 z-10">
      <button onClick={() => setOpen(!open)} aria-label={`More for ${p.name}`} className="grid h-8 w-8 place-items-center rounded-full bg-surface/95 text-ink shadow-sm ring-1 ring-line hover:bg-surface">
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-9 w-52 rounded-2xl border border-line bg-surface p-1.5 shadow-[0_14px_40px_rgba(23,18,14,0.16)]">
          <Link href={`/products/${p.id}`} className={item}>
            <Pencil size={15} /> Edit
          </Link>
          <button onClick={run(onDuplicate)} className={item}>
            <Copy size={15} /> Duplicate
          </button>
          {p.status !== "live" && p.status !== "paused" && (
            <button onClick={run(() => onAct("live"))} className={item}>
              <Eye size={15} /> Make active
            </button>
          )}
          {p.status !== "hidden" && (
            <button onClick={run(() => onAct("hidden"))} className={item}>
              <EyeOff size={15} /> Hide from store
            </button>
          )}
          {p.stock > 0 && (
            <button onClick={run(() => onAct("out_of_stock"))} className={item}>
              <PackageX size={15} /> Mark out of stock
            </button>
          )}
          <div className="my-1 h-px bg-line" />
          <button onClick={run(onDelete)} className={`${item} text-bad hover:bg-bad-soft`}>
            <Trash2 size={15} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

export function ProductsView({ products }: { products: Product[] }) {
  const TYPES = [...new Set(products.map((p) => p.category))].sort();
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

  // Picking several products for one change
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState<string[] | null>(null);
  const [note, setNote] = useState<{ text: string; bad?: boolean; href?: string } | null>(null);
  const [busy, start] = useTransition();
  const live = new Set(products.map((p) => p.id));
  const chosen = [...picked].filter((id) => live.has(id));
  const toggle = (id: string) => setPicked((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });
  const allShown = list.length > 0 && list.every((p) => picked.has(p.id));

  const DONE: Record<Action, string> = { live: "made active", hidden: "hidden from your store", out_of_stock: "marked out of stock", delete: "deleted" };
  function act(ids: string[], action: Action) {
    start(async () => {
      const r = await productActions(ids, action);
      if ("error" in r) return setNote({ text: r.error, bad: true });
      const n = r.ok.done;
      const kept = r.ok.archived ? ` ${r.ok.archived} had sold, so ${r.ok.archived === 1 ? "it's" : "they're"} kept for past orders but gone from your store.` : "";
      setNote({ text: `${n} product${n === 1 ? "" : "s"} ${DONE[action]}.${kept}` });
      setPicked(new Set());
      setConfirming(null);
    });
  }
  function duplicate(id: string) {
    start(async () => {
      const r = await duplicateProduct(id);
      if ("error" in r) return setNote({ text: r.error, bad: true });
      setNote({ text: `Copy made: “${r.ok.name}”, saved as a draft with no stock.`, href: `/products/${r.ok.id}` });
    });
  }
  const toDelete = products.filter((p) => confirming?.includes(p.id));

  return (
    <>
      <PageHeader
        illo="bag"
        title="Products"
        description="Everything on your storefront. Live products also appear in Sotechy's Shop and search."
        actions={
          <div className="flex gap-2">
            <ImportProducts />
            <Link href="/products/new" className={btn.primary}>
              <Plus size={17} /> Add product
            </Link>
          </div>
        }
      />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start">
        <div className="no-scrollbar -mx-1 flex min-w-0 gap-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible lg:flex-1">
          {FILTERS.map((x) => (
            <button
              key={x.id}
              onClick={() => setFilter(x.id)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${filter === x.id ? "border-inverse bg-inverse text-on-inverse" : "border-line bg-surface text-ink-2 hover:bg-surface-alt"}`}
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

      <div className="mb-5 grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap">
        <PillSelect value={type} onChange={setType} active={type !== "all"} options={[{ id: "all", label: "All categories" }, ...TYPES.map((t) => ({ id: t, label: t }))]} />
        <PillSelect value={price} onChange={setPrice} active={price !== "any"} options={PRICES} />
        <PillSelect value={sort} onChange={setSort} active={false} options={SORTS} />
        {narrowed && (
          <button onClick={() => { setType("all"); setPrice("any"); }} className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold text-brand-strong hover:bg-brand-soft">
            <X size={15} /> Clear
          </button>
        )}
        <span className="ml-auto hidden text-sm text-muted sm:inline">{list.length} product{list.length === 1 ? "" : "s"}</span>
        {list.length > 0 && (
          <button
            onClick={() => setPicked(allShown ? new Set() : new Set(list.map((p) => p.id)))}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink-2 hover:bg-surface-alt"
          >
            {allShown ? "Clear selection" : "Select all"}
          </button>
        )}
      </div>

      {note && (
        <div className={`mb-4 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm ${note.bad ? "bg-bad-soft text-bad" : "bg-good-soft text-good"}`}>
          <span className="flex-1">{note.text}</span>
          {note.href && <Link href={note.href} className="font-semibold underline">Edit the copy</Link>}
          <button onClick={() => setNote(null)} aria-label="Dismiss"><X size={16} /></button>
        </div>
      )}

      {list.length === 0 ? (
        <EmptyState illo="bag" title="No products here" message="Add your first product and it goes live on your storefront." action={<Link href="/products/new" className={`${btn.primary} mt-2`}>Add product</Link>} />
      ) : (
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {list.map((p) => {
            const on = picked.has(p.id);
            return (
              <li key={p.id} className="relative">
                <Link
                  href={`/products/${p.id}`}
                  className={`group flex h-full flex-col overflow-hidden rounded-2xl border bg-surface transition hover:shadow-[0_10px_28px_rgba(23,18,14,0.08)] ${on ? "border-brand ring-2 ring-brand/30" : "border-line"}`}
                >
                  <div className="relative">
                    <ProductThumb src={p.image} size="fluid" rounded="rounded-none" />
                    <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
                      {p.status === "paused" ? <Pill tone="bad">Paused by Sotechy</Pill> : p.status !== "live" && <Pill tone="dark">{p.status === "draft" ? "Draft" : "Hidden"}</Pill>}
                      {p.stock === 0 ? <Pill tone="bad">Sold out</Pill> : p.stock <= 3 ? <Pill tone="warn">{p.stock} left</Pill> : null}
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5 p-2.5">
                    <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted">{p.category}</p>
                    <p className="line-clamp-2 text-[13px] font-semibold leading-snug">{p.name}</p>
                    <div className="mt-auto flex items-baseline gap-1.5 pt-1">
                      <span className="font-display font-bold">{formatNaira(p.price)}</span>
                      {p.compareAt && <span className="text-[11px] text-faint line-through">{formatNaira(p.compareAt)}</span>}
                    </div>
                    <p className="text-[11px] text-muted">{p.stock} in stock · {p.sold} sold</p>
                  </div>
                </Link>
                {/* Pick it for a change to several products */}
                <button
                  onClick={() => toggle(p.id)}
                  aria-label={on ? `Unselect ${p.name}` : `Select ${p.name}`}
                  aria-pressed={on}
                  className={`absolute left-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-lg border-2 shadow-sm transition ${on ? "border-brand bg-brand text-white" : "border-white bg-surface/90 text-transparent hover:text-faint"}`}
                >
                  <Check size={15} strokeWidth={3} />
                </button>
                <CardMenu p={p} onAct={(a) => act([p.id], a)} onDuplicate={() => duplicate(p.id)} onDelete={() => setConfirming([p.id])} />
              </li>
            );
          })}
        </ul>
      )}

      {chosen.length > 0 && (
        <div className="sticky bottom-4 z-20 mt-5 flex flex-wrap items-center gap-2 rounded-3xl bg-inverse px-4 py-3 text-on-inverse shadow-[0_16px_40px_rgba(23,18,14,0.28)]">
          <span className="mr-auto text-sm font-semibold">{chosen.length} selected</span>
          <button disabled={busy} onClick={() => act(chosen, "live")} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"><Eye size={15} /> Make active</button>
          <button disabled={busy} onClick={() => act(chosen, "hidden")} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"><EyeOff size={15} /> Hide</button>
          <button disabled={busy} onClick={() => act(chosen, "out_of_stock")} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"><PackageX size={15} /> Out of stock</button>
          <button disabled={busy} onClick={() => setConfirming(chosen)} className="inline-flex items-center gap-1.5 rounded-full bg-bad px-3.5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"><Trash2 size={15} /> Delete</button>
          <button onClick={() => setPicked(new Set())} aria-label="Clear selection" className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10"><X size={16} /></button>
        </div>
      )}

      <ConfirmDialog
        open={!!confirming?.length}
        title={toDelete.length === 1 ? `Delete “${toDelete[0].name}”?` : `Delete ${toDelete.length} products?`}
        message={
          <>
            {toDelete.length === 1 ? "It comes off your store straight away" : "They come off your store straight away"} and this can&apos;t be undone. Products that have sold are kept for your past orders, but you won&apos;t see them here any more.
            <p className="mt-2 text-xs text-muted">Only want it off the store for now? Use Hide instead.</p>
          </>
        }
        confirmLabel={toDelete.length === 1 ? "Delete product" : `Delete ${toDelete.length}`}
        busy={busy}
        onConfirm={() => confirming && act(confirming, "delete")}
        onCancel={() => setConfirming(null)}
      />
    </>
  );
}
