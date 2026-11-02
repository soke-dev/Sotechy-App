"use client";

// Products page → Import: a CSV (saved from Excel or Google Sheets) becomes many products at once. They're
// added as drafts, since each needs photos before it can go on sale.
import { FileSpreadsheet, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { btn } from "@/components/ui";
import { Sheet } from "@/components/zone-form";
import { importProducts, type ImportItem } from "@/lib/market-actions";
import { formatNaira } from "@/lib/money";

/** Rows of a CSV, with quoted fields (commas, quotes and line breaks inside quotes) */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

/** Columns by their heading (any order, any case): Name, Brand, Category, Price, Stock, Key features, Specifications, Description */
function toItems(rows: string[][]): { items: ImportItem[]; problems: string[] } {
  const [head, ...body] = rows;
  const col = (...names: string[]) => head.findIndex((h) => names.includes(h.trim().toLowerCase()));
  const at = { name: col("name", "product name"), brand: col("brand"), category: col("category"), price: col("price", "selling price"), stock: col("stock", "quantity"), features: col("key features", "highlights", "features"), specs: col("specifications", "specs"), description: col("description") };
  const problems: string[] = [];
  if (at.name < 0 || at.category < 0 || at.price < 0) return { items: [], problems: ["The first row needs the headings Name, Category and Price."] };
  const items: ImportItem[] = [];
  body.forEach((r, i) => {
    const cell = (n: number) => (n >= 0 ? (r[n] ?? "").trim() : "");
    const name = cell(at.name);
    const price = Number(cell(at.price).replace(/[₦,\s]/g, ""));
    if (!name) return;
    if (!cell(at.category) || !(price > 0)) {
      problems.push(`Row ${i + 2} (${name}): needs a category and a price`);
      return;
    }
    const specifications: Record<string, string> = {};
    for (const part of cell(at.specs).split("|")) {
      const [k, ...v] = part.split(":");
      if (k?.trim() && v.join(":").trim()) specifications[k.trim().slice(0, 60)] = v.join(":").trim().slice(0, 200);
    }
    items.push({
      name: name.slice(0, 140),
      brand: cell(at.brand) || null,
      category: cell(at.category).slice(0, 60),
      price,
      stock: Math.max(0, Math.floor(Number(cell(at.stock)) || 0)),
      highlights: cell(at.features).split("|").map((s) => s.trim()).filter(Boolean).slice(0, 10),
      specifications,
      description: cell(at.description) || null,
    });
  });
  return { items, problems };
}

export function ImportProducts() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<string | null>(null);
  const [items, setItems] = useState<ImportItem[]>([]);
  const [problems, setProblems] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ added: number; skipped: string[] } | null>(null);
  const [busy, start] = useTransition();

  const reset = () => {
    setFile(null);
    setItems([]);
    setProblems([]);
    setError(null);
    setDone(null);
  };
  const pick = async (f: File | undefined) => {
    reset();
    if (!f) return;
    if (!/\.csv$/i.test(f.name)) return setError("Choose a .csv file. In Excel: File → Save As → CSV (Comma delimited).");
    const parsed = toItems(parseCsv(await f.text()));
    setFile(f.name);
    setItems(parsed.items);
    setProblems(parsed.problems);
  };
  const run = () =>
    start(async () => {
      setError(null);
      const r = await importProducts(items);
      if ("error" in r) return setError(r.error);
      setDone(r.ok);
      router.refresh();
    });

  return (
    <>
      <button type="button" onClick={() => (reset(), setOpen(true))} className={btn.outline}>
        <FileSpreadsheet size={17} /> Import
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Import products">
        <div className="flex flex-col gap-4 text-sm">
          {done ? (
            <>
              <p className="rounded-xl bg-good-soft px-3 py-3 font-semibold text-good">
                {done.added} product{done.added === 1 ? "" : "s"} added as drafts.
              </p>
              {done.skipped.length > 0 && <p className="text-muted">Skipped {done.skipped.length} you already have: {done.skipped.slice(0, 5).join(", ")}{done.skipped.length > 5 ? "…" : ""}</p>}
              <p className="text-ink-2">Open each one, add its photos, and set it live. Drafts aren&apos;t shown to shoppers.</p>
              <button type="button" onClick={() => setOpen(false)} className={btn.primary}>Done</button>
            </>
          ) : (
            <>
              <p className="text-ink-2">
                Upload a <b>CSV</b> with the headings <b>Name, Category, Price</b>, and if you have them <b>Brand, Stock, Key features, Specifications, Description</b>. Separate several features
                with <b>|</b>, and specifications as <b>Size: 55 inches | Brand: Hisense</b>. Products are added as drafts, ready for their photos.
              </p>
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-line px-4 py-6 text-center hover:bg-surface-alt">
                <Upload size={22} className="text-muted" />
                <span className="font-semibold">{file ?? "Choose a CSV file"}</span>
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
              </label>
              {items.length > 0 && (
                <div className="rounded-2xl border border-line">
                  <p className="border-b border-line px-3 py-2 font-semibold">{items.length} products found</p>
                  <ul className="max-h-48 divide-y divide-line overflow-y-auto">
                    {items.slice(0, 50).map((it, i) => (
                      <li key={i} className="flex justify-between gap-3 px-3 py-1.5">
                        <span className="min-w-0 truncate">{it.name}</span>
                        <span className="shrink-0 text-muted">{formatNaira(it.price)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {problems.length > 0 && (
                <div className="rounded-xl bg-warn-soft px-3 py-2 text-warn">
                  {problems.slice(0, 5).map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                  {problems.length > 5 && <p>and {problems.length - 5} more</p>}
                </div>
              )}
              {error && <p className="rounded-xl bg-bad-soft px-3 py-2 text-bad">{error}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className={btn.ghost}>Cancel</button>
                <button type="button" disabled={!items.length || busy} onClick={run} className={btn.primary}>
                  {busy ? "Importing…" : `Import ${items.length || ""} as drafts`}
                </button>
              </div>
            </>
          )}
        </div>
      </Sheet>
    </>
  );
}
