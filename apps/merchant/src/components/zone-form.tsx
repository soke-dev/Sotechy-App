"use client";

import { Plus, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { btn, Field, inputClass } from "./ui";
import { NIGERIAN_STATES, type DeliveryZone } from "@/lib/mock";

const TIMES = ["Same day", "Same day – 1 day", "1–2 days", "2–3 days", "3–5 days", "5–7 days"];

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-surface p-6 sm:rounded-[28px]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-alt">
            <X size={17} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Add or edit a delivery area: state, optional cities, fee, time and free-delivery amount. */
export function ZoneForm({ zone, onSave, onDelete }: { zone?: DeliveryZone; onSave: (z: DeliveryZone) => void; onDelete?: () => void }) {
  const [state, setState] = useState(zone?.state ?? "Edo");
  const [whole, setWhole] = useState(zone ? zone.areas.length === 0 : false);
  const [areas, setAreas] = useState<string[]>(zone?.areas ?? []);
  const [area, setArea] = useState("");
  const [fee, setFee] = useState(zone?.fee ?? 0);
  const [days, setDays] = useState(zone?.days ?? "1–2 days");
  const [freeOver, setFreeOver] = useState(zone?.freeOver ?? 0);

  const addArea = () => {
    const a = area.trim();
    if (a && !areas.includes(a)) setAreas([...areas, a]);
    setArea("");
  };
  const valid = whole || areas.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <Field label="State">
        <select value={state} onChange={(e) => setState(e.target.value)} className={inputClass}>
          {NIGERIAN_STATES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </Field>

      <div className="flex rounded-full bg-surface-alt p-1">
        {([[false, "Some cities"], [true, "Whole state"]] as const).map(([v, label]) => (
          <button key={label} type="button" onClick={() => setWhole(v)} className={`flex-1 rounded-full py-2.5 text-sm font-semibold ${whole === v ? "bg-surface shadow-sm" : "text-muted"}`}>
            {label}
          </button>
        ))}
      </div>

      {!whole && (
        <Field label="Cities or areas" hint="Press Enter after each one.">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-2">
            {areas.map((a) => (
              <span key={a} className="inline-flex items-center gap-1 rounded-full bg-brand-soft py-1 pl-3 pr-1.5 text-sm font-semibold">
                {a}
                <button type="button" onClick={() => setAreas(areas.filter((x) => x !== a))} aria-label={`Remove ${a}`} className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-white">
                  <X size={12} />
                </button>
              </span>
            ))}
            <input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addArea();
                }
              }}
              onBlur={addArea}
              className="min-h-9 min-w-32 flex-1 bg-transparent px-2 text-[15px] outline-none"
              placeholder={areas.length ? "Add another" : "e.g. Benin City"}
            />
          </div>
        </Field>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Delivery fee (₦)">
          <input type="number" min={0} value={fee || ""} onChange={(e) => setFee(Number(e.target.value))} className={inputClass} placeholder="0 = free" />
        </Field>
        <Field label="Delivery time">
          <select value={days} onChange={(e) => setDays(e.target.value)} className={inputClass}>
            {TIMES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Free delivery over (₦)" hint="Optional. Orders above this amount ship free to this area.">
        <input type="number" min={0} value={freeOver || ""} onChange={(e) => setFreeOver(Number(e.target.value))} className={inputClass} />
      </Field>

      <div className="mt-1 flex gap-2">
        {onDelete && (
          <button type="button" onClick={onDelete} className={btn.danger}>Delete</button>
        )}
        <button
          type="button"
          disabled={!valid}
          onClick={() => onSave({ id: zone?.id ?? `z${Date.now()}`, state, areas: whole ? [] : areas, fee, days, freeOver: freeOver || undefined, active: zone?.active ?? true })}
          className={`${btn.dark} flex-1`}
        >
          <Plus size={16} /> {zone ? "Save delivery area" : "Add delivery area"}
        </button>
      </div>
    </div>
  );
}
