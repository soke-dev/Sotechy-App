import { ArrowLeft, BadgeCheck, ExternalLink, PauseCircle } from "lucide-react";
import Link from "next/link";
import { formatNaira, type BranchStock, type Category, type Product, type ProductVariant } from "@sotechy/shared";
import { ActionForm } from "@/components/action-form";
import { ProductFields } from "@/components/product-fields";
import { Card, DataTable, ErrorNote, Field, inputClass, PageHeader, Pill } from "@/components/ui";
import { ProductControls } from "./product-controls";
import { load } from "@/lib/api";
import { addVariant, updateProduct, updateVariant } from "../../actions";

type AdminProduct = Product & {
  variants: (ProductVariant & { costPrice: number | null })[];
  stock: BranchStock[];
  pausedAt?: string | null;
  pauseNote?: string | null;
  isHidden?: boolean;
  storeCategory?: string | null;
  highlights?: string[];
  specifications?: Record<string, string>;
  /** The store selling it; null for Sotechy's own */
  store: { id: string; name: string; slug: string; logoUrl: string | null; sellerKind: "registered" | "individual"; status: string; contactPhone: string | null } | null;
};

/** Where the product stands, in a word or two */
function status(p: AdminProduct) {
  if (p.pausedAt) return { label: "Paused by Sotechy", tone: "bad" as const };
  if (p.isPublished) return { label: "On sale", tone: "good" as const };
  return { label: p.isHidden ? "Hidden by the store" : "Draft", tone: "neutral" as const };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ data: product, error }, { data: categories }] = await Promise.all([
    load<AdminProduct>(`/admin/products/${id}`),
    load<Category[]>("/admin/categories"),
  ]);
  if (!product) return <ErrorNote error={error ?? "Product not found"} />;
  const st = status(product);
  const store = product.store;
  const stockLeft = product.stock.reduce((n, s) => n + Math.max(0, s.quantity - s.reserved), 0);

  const controls = (
    <Card title={store ? "Sold by" : "Sotechy's product"}>
      <div className="flex flex-col gap-4">
        {store && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand text-white">
              {store.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={store.logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="font-display font-bold">{store.name.slice(0, 2).toUpperCase()}</span>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 font-semibold">
                {store.name}
                <BadgeCheck size={16} className={`text-white ${store.sellerKind === "registered" ? "fill-[#F7931E]" : "fill-[#2F6FB3]"}`} />
              </p>
              <p className="text-xs text-muted">
                {store.sellerKind === "registered" ? "Official store (registered business)" : "Freelancer"} · store {store.status}
                {store.contactPhone ? ` · ${store.contactPhone}` : ""}
              </p>
            </div>
            <Link href={`/merchants/${store.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-strong hover:underline">
              Store details <ExternalLink size={13} />
            </Link>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Pill tone={st.tone}>{st.label}</Pill>
          {product.pausedAt && product.pauseNote && <span className="text-muted">“{product.pauseNote}”</span>}
        </div>
        {product.pausedAt && (
          <p className="flex items-start gap-2 rounded-2xl bg-bad-soft px-3 py-2 text-xs text-bad">
            <PauseCircle size={15} className="mt-px shrink-0" />
            {store ? `${store.name} sees this as paused by Sotechy and can't put it back on sale until you resume it.` : "Off sale until you resume it."}
          </p>
        )}
        <ProductControls id={product.id} name={product.name} paused={!!product.pausedAt} storeName={store?.name ?? null} />
      </div>
    </Card>
  );

  // A store's product: what the store listed, to check (the store edits it in its own dashboard)
  if (store) {
    const specs = Object.entries(product.specifications ?? {});
    return (
      <>
        <Link href="/products" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
          <ArrowLeft size={15} /> Products
        </Link>
        <PageHeader title={product.name} description={`${store.name}'s product · ${product.storeCategory ?? "No category"}`} />
        <div className="flex flex-col gap-4">
          {controls}
          <Card title="What the store listed">
            <div className="flex flex-col gap-5 text-sm">
              {product.images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto">
                  {product.images.map((src) => (
                    <a key={src} href={src} target="_blank" rel="noreferrer" className="shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="h-28 w-28 rounded-2xl border border-line object-cover" />
                    </a>
                  ))}
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-3">
                <div><p className="text-xs text-muted">Price</p><p className="font-display text-xl font-bold">{formatNaira(product.variants[0]?.price ?? 0)}</p></div>
                <div><p className="text-xs text-muted">In stock</p><p className="font-display text-xl font-bold">{stockLeft}</p></div>
                <div><p className="text-xs text-muted">Brand</p><p className="font-semibold">{product.brand ?? "—"}</p></div>
              </div>
              {product.variants.length > 1 && <p><span className="text-muted">Options:</span> {product.variants.map((v) => v.name).join(", ")}</p>}
              {product.description && <p className="whitespace-pre-line text-ink-2">{product.description}</p>}
              {(product.highlights ?? []).length > 0 && (
                <div>
                  <p className="mb-1 font-semibold">Key features</p>
                  <ul className="list-disc pl-5 text-ink-2">{product.highlights!.map((h) => <li key={h}>{h}</li>)}</ul>
                </div>
              )}
              {specs.length > 0 && (
                <div>
                  <p className="mb-1 font-semibold">Specifications</p>
                  <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[180px_1fr]">
                    {specs.map(([k, v]) => (
                      <div key={k} className="contents"><dt className="text-muted">{k}</dt><dd>{v}</dd></div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Link href="/products" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft size={15} /> Products
      </Link>
      <PageHeader title={product.name} description={product.isDemo ? "Demo product — replace with real inventory" : undefined} />
      <div className="flex flex-col gap-4">
        {controls}
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
                  <p className="text-muted">{v.sku}</p>
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
