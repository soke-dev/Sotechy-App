"use client";

import { ArrowLeft, Check, ImagePlus, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Illo } from "./illustrations";
import { btn, Card, Field, inputClass, ProductThumb } from "./ui";
import { Sheet, ZoneForm, ZonePrices } from "./zone-form";
import { formatNaira, formatTokens, SOTECHY_CROSS_BONUS } from "@/lib/money";
import { deliveryZones, pickup as storePickup, store, zoneLabel, type DeliveryZone, type Product } from "@/lib/mock";

const CATEGORIES = ["Phones", "Accessories", "Computers", "TV & Audio", "Cooling", "Kitchen", "Fashion", "Beauty", "Groceries", "Other"];

interface Option {
  name: string;
  stock: number;
  price?: number;
}

export function ProductForm({ product }: { product?: Product }) {
  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(product?.price ?? 0);
  const [compareAt, setCompareAt] = useState(product?.compareAt ?? 0);
  const [photos, setPhotos] = useState<string[]>(product ? [product.image] : []);
  const [options, setOptions] = useState<Option[]>(product?.options?.map((o) => ({ name: o, stock: Math.ceil(product.stock / product.options!.length) })) ?? []);
  const [stock, setStock] = useState(product?.stock ?? 0);
  const [features, setFeatures] = useState<string[]>(["", ""]);
  const [specs, setSpecs] = useState<[string, string][]>([["", ""]]);
  const [status, setStatus] = useState<Product["status"]>(product?.status ?? "live");
  // Delivery: tick saved areas (all of them by default) or add a new one here
  const [zones, setZones] = useState<DeliveryZone[]>(deliveryZones.filter((z) => z.active && z.review !== "declined"));
  const [ticked, setTicked] = useState<Set<string>>(new Set(deliveryZones.filter((z) => z.active && z.review !== "declined").map((z) => z.id)));
  const [pickup, setPickup] = useState(storePickup.enabled);
  const [adding, setAdding] = useState(false);

  const totalStock = options.length ? options.reduce((n, o) => n + o.stock, 0) : stock;
  const tokens = price;

  function addPhotos(files: FileList | null) {
    if (!files) return;
    setPhotos((p) => [...p, ...Array.from(files).map((f) => URL.createObjectURL(f))].slice(0, 8));
  }

  return (
    <>
      <Link href="/products" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft size={16} /> Products
      </Link>
      <h1 className="mb-6 text-3xl font-extrabold">{product ? "Edit product" : "Add a product"}</h1>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-6">
          <Card title="Photos" description="Up to 8. The first one is the main photo. Clear photos on a plain background look best on Sotechy orange.">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {photos.map((src, i) => (
                <div key={src} className="group relative">
                  <ProductThumb src={src} size="fluid" rounded="rounded-2xl" />
                  {i === 0 && <span className="absolute left-2 top-2 rounded-full bg-panel px-2 py-0.5 text-[10px] font-bold text-white">Main</span>}
                  <button type="button" onClick={() => setPhotos((p) => p.filter((x) => x !== src))} aria-label="Remove photo" className="absolute right-2 top-2 hidden h-8 w-8 items-center justify-center rounded-full bg-surface text-bad shadow group-hover:flex">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              {photos.length < 8 && (
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-line text-sm font-semibold text-muted hover:border-brand hover:text-brand-strong">
                  <ImagePlus size={24} />
                  Add photos
                  <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={(e) => addPhotos(e.target.files)} />
                </label>
              )}
            </div>
          </Card>

          <Card title="Basics">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Product name">
                  <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="e.g. Spark 20 Smartphone 128GB" />
                </Field>
              </div>
              <Field label="Category">
                <select defaultValue={product?.category ?? ""} className={inputClass}>
                  <option value="" disabled>Choose…</option>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Brand">
                <input className={inputClass} placeholder="e.g. Tecno" />
              </Field>
              <Field label="Condition">
                <select className={inputClass}>
                  <option>New</option>
                  <option>Used, like new</option>
                  <option>Refurbished</option>
                </select>
              </Field>
              <Field label="Warranty">
                <select className={inputClass}>
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
              <Field label="Price (₦)">
                <input type="number" min={0} value={price || ""} onChange={(e) => setPrice(Number(e.target.value))} className={inputClass} />
              </Field>
              <Field label="Was (₦)" hint="Optional. Shows a discount on the product.">
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
          </Card>

          <Card title="Options and stock" description="Add options like colour, size or storage, each with its own stock.">
            {options.length === 0 ? (
              <div className="flex flex-wrap items-end gap-3">
                <Field label="Stock">
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

          <Card title="Details" description="What customers see on the product page.">
            <div className="flex flex-col gap-4">
              <Field label="About this product">
                <textarea rows={4} className={inputClass} placeholder="What it is, who it's for and why it's good." />
              </Field>
              <Field label="Key features">
                <div className="flex flex-col gap-2">
                  {features.map((f, i) => (
                    <input key={i} value={f} onChange={(e) => setFeatures(features.map((x, j) => (j === i ? e.target.value : x)))} className={inputClass} placeholder={i === 0 ? "e.g. 5,000mAh battery" : "Another feature"} />
                  ))}
                  <button type="button" onClick={() => setFeatures([...features, ""])} className={`${btn.ghost} self-start`}>
                    <Plus size={16} /> Add a feature
                  </button>
                </div>
              </Field>
              <Field label="What's in the box" hint="Separate items with commas.">
                <input className={inputClass} placeholder="Phone, charger, USB-C cable, case" />
              </Field>
              <Field label="Specifications">
                <div className="flex flex-col gap-2">
                  {specs.map(([k, v], i) => (
                    <div key={i} className="grid grid-cols-2 gap-2">
                      <input value={k} onChange={(e) => setSpecs(specs.map((x, j) => (j === i ? [e.target.value, x[1]] : x)))} className={inputClass} placeholder="e.g. Storage" />
                      <input value={v} onChange={(e) => setSpecs(specs.map((x, j) => (j === i ? [x[0], e.target.value] : x)))} className={inputClass} placeholder="e.g. 128GB" />
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
            <div className="mx-auto w-48 overflow-hidden rounded-3xl border border-line bg-surface">
              <ProductThumb src={photos[0] ?? "/demo/item-phone.png"} size="fluid" rounded="rounded-none" />
              <div className="p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{store.name}</p>
                <p className="line-clamp-2 text-sm font-semibold">{name || "Product name"}</p>
                <p className="mt-1 font-display font-bold">{formatNaira(price)}</p>
                {compareAt > price && <p className="text-xs text-faint line-through">{formatNaira(compareAt)}</p>}
              </div>
            </div>
          </Card>

          <Card title="Delivery" description="Where customers can get this product.">
            <div className="flex flex-col gap-2">
              {zones.map((z) => {
                const on = ticked.has(z.id);
                return (
                  <button
                    key={z.id}
                    type="button"
                    onClick={() => {
                      const next = new Set(ticked);
                      if (on) next.delete(z.id);
                      else next.add(z.id);
                      setTicked(next);
                    }}
                    className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition ${on ? "border-ink bg-surface" : "border-line opacity-70"}`}
                  >
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${on ? "border-ink bg-ink text-white" : "border-faint"}`}>{on && <Check size={13} />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{zoneLabel(z)}</span>
                      <ZonePrices zone={z} />
                      {z.review === "pending" && <span className="mt-0.5 block text-xs font-semibold text-warn">Waiting for approval · goes live once Sotechy approves</span>}
                    </span>
                  </button>
                );
              })}
              <button type="button" onClick={() => setAdding(true)} className={`${btn.ghost} justify-start`}>
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

          <div className="flex gap-2">
            <Link href="/products" className={`${btn.outline} flex-1`}>Cancel</Link>
            <Link href="/products" className={`${btn.primary} flex-1`}>{product ? "Save changes" : "Add product"}</Link>
          </div>
        </div>
      </div>

      <Sheet open={adding} onClose={() => setAdding(false)} title="Add delivery area">
        <ZoneForm
          onSave={(z) => {
            // Saved to the store's delivery areas and ticked for this product
            setZones([...zones, z]);
            setTicked(new Set(ticked).add(z.id));
            setAdding(false);
          }}
        />
      </Sheet>
    </>
  );
}
