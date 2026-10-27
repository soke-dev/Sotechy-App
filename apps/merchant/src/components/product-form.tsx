"use client";

import { ArrowLeft, Check, ChevronLeft, ChevronRight, ImagePlus, Lightbulb, Pencil, Plus, Star, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useState, type ReactNode } from "react";
import { CategoryPicker } from "./category-picker";
import { Illo } from "./illustrations";
import { btn, Card, Field, inputClass, ProductThumb, Req } from "./ui";
import { Sheet, ZoneForm, ZonePrices } from "./zone-form";
import { formatNaira, formatTokens, SOTECHY_CROSS_BONUS } from "@/lib/money";
import { isStandardCategory } from "@/lib/categories";
import { hintsFor } from "@/lib/category-hints";
import { deliveryZones, OFFER_HOURS, pickup as storePickup, products, zoneLabel, type DeliveryZone, type OfferHours, type Product } from "@/lib/mock";
import { useAccount } from "@/components/account-context";

// Categories this store made up itself under "Other", offered first next time
const OWN_CATEGORIES = [...new Set(products.map((p) => p.category).filter((c) => !isStandardCategory(c)))];

interface Option {
  name: string;
  stock: number;
  price?: number;
}

/** One block of the review sheet */
function Review({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5 border-t border-line pt-3">
      <p className="text-xs font-bold uppercase tracking-wider text-muted">{title}</p>
      {children}
    </section>
  );
}

export function ProductForm({ product }: { product?: Product }) {
  const { store } = useAccount();
  const [name, setName] = useState(product?.name ?? "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [price, setPrice] = useState(product?.price ?? 0);
  const [compareAt, setCompareAt] = useState(product?.compareAt ?? 0);
  // Offers: customers can negotiate the price with the store
  const [negotiable, setNegotiable] = useState(Boolean(product?.negotiable));
  const [floor, setFloor] = useState(product?.negotiable?.floor ?? 0);
  const [offerHours, setOfferHours] = useState<OfferHours>(product?.negotiable?.hours ?? 12);
  const [photos, setPhotos] = useState<string[]>(product ? [product.image] : []);
  // Photo being arranged (tap to pick on a phone; drag on a computer)
  const [picked, setPicked] = useState<number | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [tried, setTried] = useState(false);
  const router = useRouter();
  const [options, setOptions] = useState<Option[]>(product?.options?.map((o) => ({ name: o, stock: Math.ceil(product.stock / product.options!.length) })) ?? []);
  const [stock, setStock] = useState(product?.stock ?? 0);
  const [brand, setBrand] = useState("");
  const [condition, setCondition] = useState("New");
  const [warranty, setWarranty] = useState("No warranty");
  const [inBox, setInBox] = useState("");
  const [about, setAbout] = useState("");
  // Review sheet shown before the product is saved
  const [confirming, setConfirming] = useState(false);
  const [features, setFeatures] = useState<string[]>(["", ""]);
  const [specs, setSpecs] = useState<[string, string][]>([["", ""]]);
  const [status, setStatus] = useState<Product["status"]>(product?.status ?? "live");
  // Delivery: tick saved areas (all of them by default) or add a new one here
  const [zones, setZones] = useState<DeliveryZone[]>(deliveryZones.filter((z) => z.active && z.review !== "declined"));
  const [ticked, setTicked] = useState<Set<string>>(new Set(deliveryZones.filter((z) => z.active && z.review !== "declined").map((z) => z.id)));
  const [pickup, setPickup] = useState(storePickup.enabled);
  const [editingZone, setEditingZone] = useState<DeliveryZone | "new" | null>(null);

  const hints = hintsFor(category);
  const usedSpecs = new Set(specs.map(([k]) => k.trim().toLowerCase()));
  const specExample = (k: string) => hints.specs.find(([label]) => label.toLowerCase() === k.trim().toLowerCase())?.[1];

  const totalStock = options.length ? options.reduce((n, o) => n + o.stock, 0) : stock;
  const tokens = price;
  // What still has to be filled in before the product can be saved
  const missing = [
    !photos.length && "a photo",
    !name.trim() && "the product name",
    !category && "a category",
    !(price > 0) && "the price",
    !about.trim() && "a description (About this product)",
    !features.some((f) => f.trim()) && "at least one key feature",
    !specs.some(([k, v]) => k.trim() && v.trim()) && "at least one specification",
    options.some((o) => !o.name.trim()) && "a name for each option",
    !ticked.size && !pickup && "a delivery area or shop pickup",
  ].filter(Boolean) as string[];

  function addPhotos(files: FileList | null) {
    if (!files) return;
    setPhotos((p) => [...p, ...Array.from(files).map((f) => URL.createObjectURL(f))].slice(0, 8));
  }

  function movePhoto(from: number, to: number) {
    if (from === to) return;
    const next = [...photos];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setPhotos(next);
    setPicked(to);
  }

  function addSpec(label: string) {
    const empty = specs.findIndex(([k, v]) => !k.trim() && !v.trim());
    setSpecs(empty >= 0 ? specs.map((x, j) => (j === empty ? [label, ""] : x)) : [...specs, [label, ""]]);
  }

  return (
    <>
      <Link href="/products" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft size={16} /> Products
      </Link>
      <h1 className="text-3xl font-extrabold">{product ? "Edit product" : "Add a product"}</h1>
      <p className="mb-6 mt-1 text-sm text-muted">Fields marked <Req /> are required. Everything else is optional but helps you sell.</p>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-6">
          <Card required title="Photos" description="Up to 8. The main photo shows first everywhere. Tap a photo to make it the main one or move it. On a computer you can also drag photos into order.">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {photos.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  draggable
                  onDragStart={() => setDragFrom(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragFrom !== null) movePhoto(dragFrom, i);
                    setDragFrom(null);
                  }}
                  onDragEnd={() => setDragFrom(null)}
                  onClick={() => setPicked(picked === i ? null : i)}
                  aria-label={`Photo ${i + 1}${i === 0 ? ", main photo" : ""}`}
                  className={`relative cursor-grab rounded-2xl transition active:cursor-grabbing ${picked === i ? "ring-4 ring-ink ring-offset-2" : ""} ${dragFrom === i ? "opacity-40" : ""}`}
                >
                  <ProductThumb src={src} size="fluid" rounded="rounded-2xl" />
                  {i === 0 ? (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-panel px-2 py-0.5 text-[10px] font-bold text-white"><Star size={10} fill="currentColor" /> Main</span>
                  ) : (
                    <span className="absolute left-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-surface/90 px-1.5 text-[10px] font-bold text-ink">{i + 1}</span>
                  )}
                </button>
              ))}
              {photos.length < 8 && (
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-line text-sm font-semibold text-muted hover:border-brand hover:text-brand-strong">
                  <ImagePlus size={24} />
                  Add photos
                  <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={(e) => addPhotos(e.target.files)} />
                </label>
              )}
            </div>
            {picked !== null && photos[picked] && (
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-surface-alt p-2">
                <span className="px-2 text-sm font-semibold">{picked === 0 ? "Main photo" : `Photo ${picked + 1}`}</span>
                <button type="button" disabled={picked === 0} onClick={() => movePhoto(picked, 0)} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-inverse px-4 text-sm font-semibold text-on-inverse disabled:opacity-30">
                  <Star size={14} /> Make main
                </button>
                <button type="button" disabled={picked === 0} onClick={() => movePhoto(picked, picked - 1)} aria-label="Move left" className="flex h-10 w-10 items-center justify-center rounded-full bg-surface disabled:opacity-30">
                  <ChevronLeft size={18} />
                </button>
                <button type="button" disabled={picked === photos.length - 1} onClick={() => movePhoto(picked, picked + 1)} aria-label="Move right" className="flex h-10 w-10 items-center justify-center rounded-full bg-surface disabled:opacity-30">
                  <ChevronRight size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPhotos(photos.filter((_, j) => j !== picked));
                    setPicked(null);
                  }}
                  aria-label="Remove photo"
                  className="ml-auto inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-bad hover:bg-bad-soft"
                >
                  <Trash2 size={15} /> <span className="hidden sm:inline">Remove</span>
                </button>
              </div>
            )}
          </Card>

          <Card title="Basics">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field required label="Product name">
                  <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="e.g. Spark 20 Smartphone 128GB" />
                </Field>
              </div>
              <Field required label="Category">
                <CategoryPicker value={category} onChange={setCategory} yours={OWN_CATEGORIES} />
              </Field>
              <Field label="Brand">
                <input value={brand} onChange={(e) => setBrand(e.target.value)} className={inputClass} placeholder="e.g. Tecno" />
              </Field>
              <Field required label="Condition">
                <select value={condition} onChange={(e) => setCondition(e.target.value)} className={inputClass}>
                  <option>New</option>
                  <option>Used, like new</option>
                  <option>Refurbished</option>
                </select>
              </Field>
              <Field label="Warranty">
                <select value={warranty} onChange={(e) => setWarranty(e.target.value)} className={inputClass}>
                  <option>No warranty</option>
                  <option>3 months</option>
                  <option>6 months</option>
                  <option>12 months</option>
                </select>
              </Field>
            </div>
          </Card>

          <Card title="Price">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field required label="Price (₦)">
                <input type="number" min={0} value={price || ""} onChange={(e) => setPrice(Number(e.target.value))} className={inputClass} />
              </Field>
              <Field label="Was (₦)" hint="Shows a discount on the product.">
                <input type="number" min={0} value={compareAt || ""} onChange={(e) => setCompareAt(Number(e.target.value))} className={inputClass} />
              </Field>
            </div>
            {price > 0 && (
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-brand-soft px-4 py-3 text-sm">
                <Illo name="coin" size={26} />
                <span>
                  Buyers earn <b>{formatTokens(tokens)} ${store.ticker}</b> and <b>{formatTokens(Math.round(price * SOTECHY_CROSS_BONUS))} $SOTECHY</b> for each one. You receive {formatNaira(price * 0.98)} after Sotechy&apos;s 2% fee.
                </span>
              </div>
            )}

            {/* Negotiation */}
            <div className="mt-4 rounded-2xl border border-line p-4">
              <label className="flex cursor-pointer items-start justify-between gap-4">
                <span>
                  <span className="block font-semibold">Customers can make an offer</span>
                  <span className="block text-sm text-muted">They message you a price for this product. If you agree, only that customer can buy at it, for a time you choose.</span>
                </span>
                <input type="checkbox" checked={negotiable} onChange={(e) => setNegotiable(e.target.checked)} className="mt-1" />
              </label>
              {negotiable && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Lowest price you'd consider (₦)" hint="Only you see this. We flag offers below it.">
                    <input type="number" min={0} value={floor || ""} onChange={(e) => setFloor(Number(e.target.value))} className={inputClass} placeholder="Optional" />
                  </Field>
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <span className="text-sm font-semibold text-ink-2">An agreed price lasts</span>
                    <div className="flex rounded-full bg-surface-alt p-1">
                      {OFFER_HOURS.map((h) => (
                        <button key={h} type="button" onClick={() => setOfferHours(h)} className={`flex-1 rounded-full py-2 text-sm font-semibold ${offerHours === h ? "bg-surface shadow-sm" : "text-muted"}`}>
                          {h} hours
                        </button>
                      ))}
                    </div>
                    <span className="text-xs text-muted">The default when you agree. You can pick another for each deal, up to 24 hours.</span>
                  </div>
                  {floor > 0 && price > 0 && floor >= price && <p className="text-xs text-warn sm:col-span-2">Your lowest price is at or above the price itself, so every offer will be flagged.</p>}
                </div>
              )}
            </div>
          </Card>

          <Card title="Options and stock" description="Add options like colour, size or storage, each with its own stock.">
            {options.length === 0 ? (
              <div className="flex flex-wrap items-end gap-3">
                <Field required label="Stock">
                  <input type="number" min={0} value={stock} onChange={(e) => setStock(Number(e.target.value))} className={`${inputClass} w-32`} />
                </Field>
                <button type="button" onClick={() => setOptions([{ name: "", stock: 0 }])} className={btn.outline}>
                  <Plus size={16} /> Add options
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {options.map((o, i) => (
                  <div key={i} className="grid grid-cols-[1fr_90px_110px_auto] items-center gap-2">
                    <input value={o.name} onChange={(e) => setOptions(options.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className={inputClass} placeholder="e.g. 128GB · Black" />
                    <input type="number" min={0} value={o.stock} onChange={(e) => setOptions(options.map((x, j) => (j === i ? { ...x, stock: Number(e.target.value) } : x)))} className={inputClass} aria-label="Stock" />
                    <input type="number" min={0} value={o.price ?? ""} onChange={(e) => setOptions(options.map((x, j) => (j === i ? { ...x, price: Number(e.target.value) || undefined } : x)))} className={inputClass} placeholder="Price" aria-label="Price" />
                    <button type="button" onClick={() => setOptions(options.filter((_, j) => j !== i))} aria-label="Remove option" className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-bad-soft hover:text-bad">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-1">
                  <button type="button" onClick={() => setOptions([...options, { name: "", stock: 0 }])} className={btn.ghost}>
                    <Plus size={16} /> Another option
                  </button>
                  <span className="text-sm text-muted">{totalStock} in stock in total</span>
                </div>
              </div>
            )}
          </Card>

          <Card required title="Details" description="What customers see on the product page.">
            <div className="flex flex-col gap-4">
              <p className="flex items-start gap-2 rounded-2xl bg-brand-soft px-3 py-2.5 text-sm text-ink-2">
                <Lightbulb size={16} className="mt-0.5 shrink-0 text-brand-strong" />
                {category ? (
                  <span><b>{category}:</b> {hints.tip}</span>
                ) : (
                  <span>Pick a category above and we&apos;ll suggest what to fill in.</span>
                )}
              </p>
              <Field required label="About this product">
                <textarea rows={4} value={about} onChange={(e) => setAbout(e.target.value)} className={inputClass} placeholder="What it is, who it's for and why it's good." />
              </Field>
              <Field required label="Key features" hint="At least one.">
                <div className="flex flex-col gap-2">
                  {features.map((f, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={f} onChange={(e) => setFeatures(features.map((x, j) => (j === i ? e.target.value : x)))} className={inputClass} placeholder={hints.features[i] ? `e.g. ${hints.features[i]}` : "Another feature"} />
                      {features.length > 1 && (
                        <button type="button" onClick={() => setFeatures(features.filter((_, j) => j !== i))} aria-label="Remove feature" className="flex h-12 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:text-bad">
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => setFeatures([...features, ""])} className={`${btn.ghost} self-start`}>
                    <Plus size={16} /> Add a feature
                  </button>
                </div>
              </Field>
              <Field label="What's in the box" hint="Separate items with commas.">
                <input value={inBox} onChange={(e) => setInBox(e.target.value)} className={inputClass} placeholder={`e.g. ${hints.inBox}`} />
              </Field>
              <Field required label="Specifications" hint="At least one, with its value.">
                <div className="flex flex-col gap-2">
                  {hints.specs.some(([label]) => !usedSpecs.has(label.toLowerCase())) && (
                    <div className="flex flex-wrap gap-1.5">
                      <span className="self-center text-xs font-semibold text-muted">Tap to add:</span>
                      {hints.specs
                        .filter(([label]) => !usedSpecs.has(label.toLowerCase()))
                        .map(([label]) => (
                          <button key={label} type="button" onClick={() => addSpec(label)} className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold hover:border-ink">
                            <Plus size={12} /> {label}
                          </button>
                        ))}
                    </div>
                  )}
                  {specs.map(([k, v], i) => (
                    <div key={i} className="flex gap-2">
                      <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
                        <input value={k} onChange={(e) => setSpecs(specs.map((x, j) => (j === i ? [e.target.value, x[1]] : x)))} className={inputClass} placeholder={`e.g. ${hints.specs[0][0]}`} />
                        <input value={v} onChange={(e) => setSpecs(specs.map((x, j) => (j === i ? [x[0], e.target.value] : x)))} className={inputClass} placeholder={`e.g. ${specExample(k) ?? hints.specs[0][1]}`} />
                      </div>
                      {specs.length > 1 && (
                        <button type="button" onClick={() => setSpecs(specs.filter((_, j) => j !== i))} aria-label="Remove spec" className="flex h-12 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:text-bad">
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => setSpecs([...specs, ["", ""]])} className={`${btn.ghost} self-start`}>
                    <Plus size={16} /> Add a spec
                  </button>
                </div>
              </Field>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6 lg:sticky lg:top-8 lg:self-start">
          <Card title="Preview" description="How it looks in the Sotechy app">
            <div className="mx-auto w-48 overflow-hidden rounded-2xl border border-line bg-surface">
              <ProductThumb src={photos[0] ?? "/demo/item-phone.png"} size="fluid" rounded="rounded-none" />
              <div className="p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{store.name}</p>
                <p className="line-clamp-2 text-sm font-semibold">{name || "Product name"}</p>
                <p className="mt-1 font-display font-bold">{formatNaira(price)}</p>
                {compareAt > price && <p className="text-xs text-faint line-through">{formatNaira(compareAt)}</p>}
              </div>
            </div>
          </Card>

          <Card required title="Delivery" description="Tick where customers can get this product. Tap the pencil to change an area's place or prices.">
            <div className="flex flex-col gap-2">
              {zones.map((z) => {
                const on = ticked.has(z.id);
                return (
                  <div key={z.id} className={`flex items-stretch rounded-2xl border transition ${on ? "border-ink bg-surface" : "border-line"}`}>
                    <button
                      type="button"
                      onClick={() => {
                        const next = new Set(ticked);
                        if (on) next.delete(z.id);
                        else next.add(z.id);
                        setTicked(next);
                      }}
                      className={`flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-3 text-left ${on ? "" : "opacity-70"}`}
                    >
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${on ? "border-inverse bg-inverse text-on-inverse" : "border-faint"}`}>{on && <Check size={13} />}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{zoneLabel(z)}</span>
                        <ZonePrices zone={z} />
                        {z.review === "pending" && <span className="mt-0.5 block text-xs font-semibold text-warn">Waiting for approval · goes live once Sotechy approves</span>}
                      </span>
                    </button>
                    <button type="button" onClick={() => setEditingZone(z)} aria-label={`Edit ${zoneLabel(z)}`} className="flex w-12 shrink-0 items-center justify-center rounded-r-2xl text-muted hover:bg-surface-alt hover:text-ink">
                      <Pencil size={16} />
                    </button>
                  </div>
                );
              })}
              <button type="button" onClick={() => setEditingZone("new")} className={`${btn.ghost} justify-start`}>
                <Plus size={16} /> Add a new delivery area
              </button>
              <label className="mt-1 flex items-center justify-between gap-3 border-t border-line pt-3 text-sm">
                <span>
                  <span className="block font-semibold">Pickup at your shop</span>
                  <span className="text-xs text-muted">{storePickup.address}</span>
                </span>
                <input type="checkbox" checked={pickup} onChange={(e) => setPickup(e.target.checked)} />
              </label>
              {ticked.size === 0 && !pickup && <p className="rounded-2xl bg-warn-soft px-3 py-2 text-xs text-warn">Tick at least one delivery area or allow pickup, or customers can&apos;t buy this.</p>}
              {ticked.size === 0 && pickup && <p className="text-xs text-muted">Pickup only: good for big or fragile items.</p>}
            </div>
          </Card>

          <Card title="Selling">
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex rounded-full bg-surface-alt p-1">
                {(["live", "draft", "hidden"] as const).map((s) => (
                  <button key={s} type="button" onClick={() => setStatus(s)} className={`flex-1 rounded-full py-2 text-sm font-semibold capitalize ${status === s ? "bg-surface shadow-sm" : "text-muted"}`}>
                    {s}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted">{status === "live" ? "Visible on your storefront and in Sotechy Shop." : status === "draft" ? "Only you can see it." : "Taken off sale but kept."}</p>
            </div>
          </Card>

          {tried && missing.length > 0 && (
            <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">
              Still needed: {missing.join(", ")}.
            </p>
          )}
          <div className="flex gap-2">
            <Link href="/products" className={`${btn.outline} flex-1`}>Cancel</Link>
            <button
              type="button"
              onClick={() => {
                setTried(true);
                if (!missing.length) setConfirming(true);
              }}
              className={`${btn.primary} flex-1`}
            >
              {product ? "Save changes" : "Add product"}
            </button>
          </div>
        </div>
      </div>

      <Sheet open={confirming} onClose={() => setConfirming(false)} title={product ? "Check your changes" : "Check your product"}>
        <div className="flex flex-col gap-4 text-sm">
          <div className="flex items-center gap-3">
            {photos[0] && <ProductThumb src={photos[0]} size={72} />}
            <div className="min-w-0">
              <p className="font-display text-lg font-bold leading-snug">{name}</p>
              <p className="text-muted">
                {category} · {condition}
                {brand.trim() && ` · ${brand.trim()}`}
              </p>
              <p className="text-xs text-muted">
                {photos.length} photo{photos.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <Review title="Price">
            <p>
              <b className="font-display text-lg">{formatNaira(price)}</b>
              {compareAt > price && <span className="ml-2 text-faint line-through">{formatNaira(compareAt)}</span>}
            </p>
            <p className="text-muted">
              You receive {formatNaira(price * 0.98)} after Sotechy&apos;s 2% fee. Buyers earn {formatTokens(tokens)} ${store.ticker} + {formatTokens(Math.round(price * SOTECHY_CROSS_BONUS))} $SOTECHY.
            </p>
          </Review>

          {negotiable && (
            <Review title="Offers">
              <p>
                Customers can make an offer{floor > 0 ? `, lowest you'd consider ${formatNaira(floor)}` : ""}. Agreed prices last {offerHours} hours.
              </p>
            </Review>
          )}

          <Review title="Stock">
            <p>
              {totalStock} in stock
              {options.length > 0 && `: ${options.map((o) => `${o.name} (${o.stock})`).join(", ")}`}
            </p>
            {warranty !== "No warranty" && <p className="text-muted">{warranty} warranty</p>}
          </Review>

          <Review title="Delivery">
            {zones
              .filter((z) => ticked.has(z.id))
              .map((z) => (
                <div key={z.id}>
                  <p className="font-semibold">{zoneLabel(z)}</p>
                  <ZonePrices zone={z} />
                  {z.review === "pending" && <p className="text-xs font-semibold text-warn">Waiting for approval</p>}
                </div>
              ))}
            {pickup && <p>Pickup at your shop: free</p>}
          </Review>

          <Review title="Details">
            <p className="line-clamp-3 whitespace-pre-line">{about}</p>
            <ul className="list-disc pl-5">
              {features.filter((f) => f.trim()).map((f) => <li key={f}>{f}</li>)}
            </ul>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              {specs
                .filter(([k, v]) => k.trim() && v.trim())
                .map(([k, v]) => (
                  <Fragment key={k}>
                    <dt className="text-muted">{k}</dt>
                    <dd className="font-semibold">{v}</dd>
                  </Fragment>
                ))}
            </dl>
            {inBox.trim() && <p className="text-muted">In the box: {inBox.trim()}</p>}
          </Review>

          <p className="rounded-2xl bg-surface-alt px-3 py-2.5">
            {status === "live" ? "It goes on sale straight away on your storefront and in Sotechy Shop." : status === "draft" ? "Saved as a draft. Only you can see it." : "Saved but hidden from customers."}
          </p>

          {/* Stays at the bottom of the sheet while the summary scrolls */}
          <div className="sticky -bottom-6 -mx-6 -mb-6 flex gap-2 border-t border-line bg-surface px-6 pb-6 pt-3">
            <button type="button" onClick={() => setConfirming(false)} className={`${btn.outline} flex-1`}>
              Edit
            </button>
            <button type="button" onClick={() => router.push("/products")} className={`${btn.primary} flex-1`}>
              {product ? "Save changes" : status === "live" ? "Add product" : "Save product"}
            </button>
          </div>
        </div>
      </Sheet>

      <Sheet open={editingZone !== null} onClose={() => setEditingZone(null)} title={editingZone === "new" ? "Add delivery area" : "Edit delivery area"}>
        {editingZone !== null && (
          <>
            {editingZone !== "new" && <p className="mb-4 rounded-2xl bg-surface-alt px-3 py-2.5 text-sm text-ink-2">Changes apply to every product that uses this area.</p>}
            <ZoneForm
              key={editingZone === "new" ? "new" : editingZone.id}
              zone={editingZone === "new" ? undefined : editingZone}
              onSave={(z) => {
                // Saved to the store's delivery areas; a new one is ticked for this product
                if (zones.some((x) => x.id === z.id)) setZones(zones.map((x) => (x.id === z.id ? z : x)));
                else {
                  setZones([...zones, z]);
                  setTicked(new Set(ticked).add(z.id));
                }
                setEditingZone(null);
              }}
            />
          </>
        )}
      </Sheet>
    </>
  );
}
