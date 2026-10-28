"use client";

import { Check, Clock, Home, Plus, Store, X } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";
import { btn, Field, inputClass } from "./ui";
import { formatNaira } from "@/lib/money";
import { STATE_CITIES, isMapLink } from "@sotechy/shared";
import type { DeliveryZone } from "@/lib/mock";
import { removeZone, saveZone } from "@/lib/market-actions";
import { AddressInput } from "./address-input";
import { StatePicker } from "./state-picker";

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
 *  New areas, and changes to the state, cities or pickup location, go to Sotechy for approval. */
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
  // Up to 5 pickup points in the area, all at the area's pickup price
  const [places, setPlaces] = useState<{ name: string; address: string; mapUrl?: string | null }[]>(
    zone?.pickup?.places?.length ? zone.pickup.places : zone?.pickup ? [{ name: zone.pickup.point, address: zone.pickup.address ?? "" }] : [{ name: "", address: "" }],
  );
  const setPlace = (i: number, patch: Partial<{ name: string; address: string; mapUrl: string }>) => setPlaces((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  // A map link is optional; without one, Directions searches the address
  const cleanPlaces = places.map((p) => ({ name: p.name.trim(), address: p.address.trim(), ...(p.mapUrl?.trim() ? { mapUrl: p.mapUrl.trim() } : {}) }));
  const badLink = cleanPlaces.some((p) => p.mapUrl && !isMapLink(p.mapUrl));
  const [days, setDays] = useState(zone?.days ?? "1–2 days");
  const [freeOver, setFreeOver] = useState(zone?.freeOver ?? 0);

  const addArea = () => {
    const a = area.trim();
    if (a && !areas.some((x) => x.toLowerCase() === a.toLowerCase())) setAreas([...areas, a]);
    setArea("");
  };
  const toggleCity = (c: string) => setAreas(areas.includes(c) ? areas.filter((x) => x !== c) : [...areas, c]);
  const cities = STATE_CITIES[state] ?? [];
  // Places the store typed that aren't in the list
  const ownAreas = areas.filter((a) => !cities.includes(a));
  const changeState = (s: string) => {
    if (s === state) return;
    setState(s);
    setAreas([]);
  };
  const placeChanged =
    !zone ||
    zone.state !== state ||
    (whole ? zone.areas.length > 0 : zone.areas.join("|") !== areas.join("|")) ||
    JSON.stringify(zone.pickup?.places ?? (zone.pickup ? [{ name: zone.pickup.point, address: zone.pickup.address ?? "" }] : [])) !== JSON.stringify(hasPickup ? cleanPlaces : []);
  const valid = (whole || areas.length > 0) && (!hasPickup || (cleanPlaces.every((p) => p.name.length >= 3 && p.address.length >= 3) && !badLink));
  const cheaper = hasPickup && homeFee > 0 && pickupFee >= homeFee;

  return (
    <div className="flex flex-col gap-4">
      {placeChanged && (
        <p className="flex items-start gap-2 rounded-2xl bg-warn-soft px-3 py-2.5 text-sm text-warn">
          <Clock size={16} className="mt-0.5 shrink-0" />
          {zone ? "Changing the state, cities or pickup location sends this area back to Sotechy for approval." : "Sotechy checks you can really deliver here before customers see it. Usually within a day."}
        </p>
      )}
      <Field required label="State">
        <StatePicker value={state} onChange={changeState} />
      </Field>

      <div className="flex rounded-full bg-surface-alt p-1">
        {([[false, "Some cities"], [true, "Whole state"]] as const).map(([v, label]) => (
          <button key={label} type="button" onClick={() => setWhole(v)} className={`flex-1 rounded-full py-2.5 text-sm font-semibold ${whole === v ? "bg-surface shadow-sm" : "text-muted"}`}>
            {label}
          </button>
        ))}
      </div>

      {!whole && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-ink-2">
            Cities and towns in {state} <span className="text-bad">*</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {cities.map((c) => {
              const on = areas.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleCity(c)}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium transition ${on ? "border-ink bg-ink text-white" : "border-line bg-surface hover:border-ink"}`}
                >
                  {on && <Check size={13} strokeWidth={3} />}
                  {c}
                </button>
              );
            })}
            {ownAreas.map((a) => (
              <span key={a} className="inline-flex items-center gap-1 rounded-full border border-ink bg-ink py-1.5 pl-3 pr-1.5 text-sm font-medium text-white">
                {a}
                <button type="button" onClick={() => setAreas(areas.filter((x) => x !== a))} aria-label={`Remove ${a}`} className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-white/15">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addArea();
                }
              }}
              className={`${inputClass} flex-1`}
              placeholder="Somewhere not listed? Type it"
            />
            <button type="button" onClick={addArea} disabled={!area.trim()} className={`${btn.outline} shrink-0`}>
              <Plus size={16} /> Add
            </button>
          </div>
          <p className="text-xs text-muted">{areas.length ? `${areas.length} chosen` : "Tap every place you deliver to."}</p>
        </div>
      )}

      <div className="rounded-2xl border border-line p-4">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><Home size={16} className="text-brand-strong" /> Home delivery</p>
        <div className="flex flex-col gap-3">
          <Field required label="Price (₦)">
            <input type="number" inputMode="numeric" min={0} value={homeFee || ""} onChange={(e) => setHomeFee(Number(e.target.value))} className={inputClass} placeholder="0 = free" />
          </Field>
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-semibold text-ink-2">
              Takes <span className="text-bad">*</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {TIMES.map((t) => (
                <button key={t} type="button" aria-pressed={days === t} onClick={() => setDays(t)} className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${days === t ? "border-ink bg-ink text-white" : "border-line bg-surface hover:border-ink"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-line p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm font-semibold"><Store size={16} className="text-brand-strong" /> Pickup in this area</span>
          <button
            type="button"
            role="switch"
            aria-checked={hasPickup}
            aria-label="Pickup in this area"
            onClick={() => setHasPickup(!hasPickup)}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${hasPickup ? "bg-brand" : "bg-line"}`}
          >
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${hasPickup ? "left-6" : "left-1"}`} />
          </button>
        </div>
        <p className="mt-1 text-xs text-muted">Customers collect from a park, courier office or your shop. Usually cheaper than home delivery.</p>
        {hasPickup && (
          <div className="mt-3 flex flex-col gap-3">
            <Field required label="Pickup price (₦)">
              <input type="number" inputMode="numeric" min={0} value={pickupFee || ""} onChange={(e) => setPickupFee(Number(e.target.value))} className={inputClass} placeholder="0 = free" />
            </Field>
            {places.map((p, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-2xl border border-line p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Pickup point {i + 1}</p>
                  {places.length > 1 && (
                    <button type="button" onClick={() => setPlaces(places.filter((_, j) => j !== i))} className="text-xs font-semibold text-muted hover:text-bad">
                      Remove
                    </button>
                  )}
                </div>
                <Field required label="Name" hint={i === 0 ? "What customers look for, e.g. the park, courier office or your shop's name." : undefined}>
                  <input value={p.name} onChange={(e) => setPlace(i, { name: e.target.value })} maxLength={140} className={inputClass} placeholder="e.g. Edo Line Park" />
                </Field>
                <Field required label="Address">
                  <AddressInput value={p.address} onChange={(v) => setPlace(i, { address: v })} placeholder="e.g. 2 Ring Road, Benin City" />
                </Field>
                <Field label="Google Maps link" hint={p.mapUrl?.trim() && !isMapLink(p.mapUrl) ? "That isn't a Google Maps link. In Google Maps, tap Share and copy the link." : "Optional. Takes customers to the exact spot; without it we search the address."}>
                  <input value={p.mapUrl ?? ""} onChange={(e) => setPlace(i, { mapUrl: e.target.value })} inputMode="url" maxLength={500} className={inputClass} placeholder="https://maps.app.goo.gl/…" />
                </Field>
              </div>
            ))}
            {places.length < 5 && (
              <button type="button" onClick={() => setPlaces([...places, { name: "", address: "" }])} className="self-start text-sm font-semibold text-brand-strong hover:underline">
                + Add another pickup point ({places.length}/5)
              </button>
            )}
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
                pickup: hasPickup ? { fee: pickupFee, point: cleanPlaces[0].name, address: cleanPlaces[0].address || null, places: cleanPlaces } : undefined,
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
      {zone.pickup && <span className="inline-flex items-center gap-1"><Store size={13} className="text-muted" /> Pickup {price(zone.pickup.fee)} at {zone.pickup.point}{(zone.pickup.places?.length ?? 1) > 1 ? ` +${(zone.pickup.places?.length ?? 1) - 1} more` : ""}</span>}
    </span>
  );
}
