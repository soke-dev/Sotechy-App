"use client";

import { Clock, Home, Plus, Store, X } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";
import { btn, Field, inputClass } from "./ui";
import { formatNaira } from "@/lib/money";
import { NIGERIAN_STATES, type DeliveryZone } from "@/lib/mock";
import { removeZone, saveZone } from "@/lib/market-actions";

const TIMES = ["Same day", "Same day – 1 day", "1–2 days", "2–3 days", "3–5 days", "5–7 days"];

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-surface p-6 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
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

/** Add or edit a delivery area: state, optional cities, home and pickup prices, time and free-delivery amount.
 *  New areas, and changes to the state or cities, go to Sotechy for approval. */
/** Saves to the store's delivery areas, then hands back the saved area */
export function ZoneForm({ zone, onSave, onDelete }: { zone?: DeliveryZone; onSave: (z: DeliveryZone) => void; onDelete?: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const [state, setState] = useState(zone?.state ?? "Edo");
  const [whole, setWhole] = useState(zone ? zone.areas.length === 0 : false);
  const [areas, setAreas] = useState<string[]>(zone?.areas ?? []);
  const [area, setArea] = useState("");
  const [homeFee, setHomeFee] = useState(zone?.homeFee ?? 0);
  const [hasPickup, setHasPickup] = useState(zone ? Boolean(zone.pickup) : true);
  const [pickupFee, setPickupFee] = useState(zone?.pickup?.fee ?? 0);
  const [point, setPoint] = useState(zone?.pickup?.point ?? "");
  const [days, setDays] = useState(zone?.days ?? "1–2 days");
  const [freeOver, setFreeOver] = useState(zone?.freeOver ?? 0);

  const addArea = () => {
    const a = area.trim();
    if (a && !areas.includes(a)) setAreas([...areas, a]);
    setArea("");
  };
  const placeChanged = !zone || zone.state !== state || (whole ? zone.areas.length > 0 : zone.areas.join("|") !== areas.join("|"));
  const valid = (whole || areas.length > 0) && (!hasPickup || point.trim().length > 0);
  const cheaper = hasPickup && homeFee > 0 && pickupFee >= homeFee;

  return (
    <div className="flex flex-col gap-4">
      {placeChanged && (
        <p className="flex items-start gap-2 rounded-2xl bg-warn-soft px-3 py-2.5 text-sm text-warn">
          <Clock size={16} className="mt-0.5 shrink-0" />
          {zone ? "Changing the state or cities sends this area back to Sotechy for approval." : "Sotechy checks you can really deliver here before customers see it. Usually within a day."}
        </p>
      )}
      <Field required label="State">
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
        <Field required label="Cities or areas" hint="Press Enter after each one.">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-2">
            {areas.map((a) => (
              <span key={a} className="inline-flex items-center gap-1 rounded-full bg-brand-soft py-1 pl-3 pr-1.5 text-sm font-semibold">
                {a}
                <button type="button" onClick={() => setAreas(areas.filter((x) => x !== a))} aria-label={`Remove ${a}`} className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-surface">
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

      <div className="rounded-2xl border border-line p-4">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><Home size={16} className="text-brand-strong" /> Home delivery</p>
        <div className="grid grid-cols-2 gap-3">
          <Field required label="Price (₦)">
            <input type="number" inputMode="numeric" min={0} value={homeFee || ""} onChange={(e) => setHomeFee(Number(e.target.value))} className={inputClass} placeholder="0 = free" />
          </Field>
          <Field required label="Takes">
            <select value={days} onChange={(e) => setDays(e.target.value)} className={inputClass}>
              {TIMES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
        </div>
      </div>

      <div className="rounded-2xl border border-line p-4">
        <label className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm font-semibold"><Store size={16} className="text-brand-strong" /> Pickup in this area</span>
          <input type="checkbox" checked={hasPickup} onChange={(e) => setHasPickup(e.target.checked)} />
        </label>
        <p className="mt-1 text-xs text-muted">Customers collect from a park, courier office or your shop. Usually cheaper than home delivery.</p>
        {hasPickup && (
          <div className="mt-3 flex flex-col gap-3">
            <Field required label="Pickup price (₦)">
              <input type="number" inputMode="numeric" min={0} value={pickupFee || ""} onChange={(e) => setPickupFee(Number(e.target.value))} className={inputClass} placeholder="0 = free" />
            </Field>
            <Field required label="Pickup point">
              <input value={point} onChange={(e) => setPoint(e.target.value)} className={inputClass} placeholder="e.g. GIG Logistics hub, Ekpoma" />
            </Field>
            {cheaper && <p className="text-xs text-warn">Pickup usually costs less than home delivery ({formatNaira(homeFee)}).</p>}
          </div>
        )}
      </div>

      <Field label="Free home delivery over (₦)" hint="Optional. Orders above this amount get home delivery free.">
        <input type="number" min={0} value={freeOver || ""} onChange={(e) => setFreeOver(Number(e.target.value))} className={inputClass} />
      </Field>

      {error && <p className="rounded-2xl bg-bad-soft px-3 py-2.5 text-sm text-bad">{error}</p>}
      <div className="mt-1 flex gap-2">
        {onDelete && zone && (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              start(async () => {
                const r = await removeZone(zone.id);
                if ("error" in r) setError(r.error);
                else onDelete();
              })
            }
            className={btn.danger}
          >
            Delete
          </button>
        )}
        <button
          type="button"
          disabled={!valid || busy}
          onClick={() =>
            start(async () => {
              setError(null);
              const r = await saveZone(zone?.id ?? null, {
                state,
                areas: whole ? [] : areas,
                homeFee,
                pickup: hasPickup ? { fee: pickupFee, point: point.trim() } : undefined,
                days,
                freeOver: freeOver || undefined,
                active: zone?.active ?? true,
              });
              if ("error" in r) setError(r.error);
              else onSave(r.ok);
            })
          }
          className={`${btn.dark} flex-1`}
        >
          {busy ? "Saving…" : zone ? (placeChanged ? "Save and send for approval" : "Save changes") : <><Plus size={16} /> Send for approval</>}
        </button>
      </div>
    </div>
  );
}

const price = (n: number) => (n ? formatNaira(n) : "Free");

/** The two prices a customer chooses between for an area. */
export function ZonePrices({ zone }: { zone: DeliveryZone }) {
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-2">
      <span className="inline-flex items-center gap-1"><Home size={13} className="text-muted" /> Home {price(zone.homeFee)}</span>
      {zone.pickup && <span className="inline-flex items-center gap-1"><Store size={13} className="text-muted" /> Pickup {price(zone.pickup.fee)}</span>}
    </span>
  );
}
