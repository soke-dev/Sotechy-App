"use client";

import { MapPin, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { Illo } from "@/components/illustrations";
import { btn, Card, EmptyState, Field, inputClass, PageHeader, Pill } from "@/components/ui";
import { Sheet, ZoneForm } from "@/components/zone-form";
import { formatNaira } from "@/lib/money";
import { deliveryZones, pickup as initialPickup, zoneLabel, type DeliveryZone } from "@/lib/mock";

export default function DeliveryPage() {
  const [zones, setZones] = useState(deliveryZones);
  const [editing, setEditing] = useState<DeliveryZone | "new" | null>(null);
  const [pickup, setPickup] = useState(initialPickup);
  const active = zones.filter((z) => z.active);
  const states = [...new Set(active.map((z) => z.state))];

  const save = (z: DeliveryZone) => {
    setZones(zones.some((x) => x.id === z.id) ? zones.map((x) => (x.id === z.id ? z : x)) : [...zones, z]);
    setEditing(null);
  };

  return (
    <>
      <PageHeader
        illo="bike"
        title="Delivery"
        description="Where you deliver, what it costs and how long it takes. Set an area up once, then tick it on any product."
        actions={
          <button onClick={() => setEditing("new")} className={btn.primary}>
            <Plus size={17} /> Add delivery area
          </button>
        }
      />

      <section className="mb-6 flex flex-col gap-4 rounded-[28px] bg-panel p-6 text-white sm:flex-row sm:items-center">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10">
          <Illo name="pin" size={42} />
        </span>
        <div className="flex-1">
          <p className="font-display text-2xl font-bold">
            {active.length ? `You deliver to ${states.length} state${states.length === 1 ? "" : "s"}` : "No delivery areas yet"}
          </p>
          <p className="text-sm text-white/70">
            {active.length ? states.join(", ") : "Customers can still order for pickup."} {pickup.enabled && "· Pickup available"}
          </p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-3">
          {zones.length === 0 ? (
            <EmptyState illo="bike" title="Add your first delivery area" message="Pick a state, the cities you cover, your fee and how long it takes." action={<button onClick={() => setEditing("new")} className={`${btn.primary} mt-2`}>Add delivery area</button>} />
          ) : (
            zones.map((z) => (
              <div key={z.id} className={`flex items-center gap-4 rounded-3xl border bg-surface p-4 ${z.active ? "border-line" : "border-dashed border-line opacity-70"}`}>
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft">
                  <MapPin size={20} className="text-brand-strong" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{zoneLabel(z)}</p>
                  <p className="text-sm text-muted">
                    {z.fee ? formatNaira(z.fee) : "Free"} · {z.days}
                    {z.freeOver ? ` · free over ${formatNaira(z.freeOver)}` : ""}
                  </p>
                </div>
                <Pill tone={z.active ? "good" : "neutral"}>{z.active ? "On" : "Off"}</Pill>
                <button
                  role="switch"
                  aria-checked={z.active}
                  aria-label={`Deliver to ${zoneLabel(z)}`}
                  onClick={() => setZones(zones.map((x) => (x.id === z.id ? { ...x, active: !x.active } : x)))}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition ${z.active ? "bg-brand" : "bg-line"}`}
                >
                  <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${z.active ? "left-[22px]" : "left-0.5"}`} />
                </button>
                <button onClick={() => setEditing(z)} aria-label="Edit" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-alt">
                  <Pencil size={16} />
                </button>
              </div>
            ))
          )}
          <p className="px-1 text-xs text-muted">Delivery fees are paid to you in full with the first 50% of each order. Sotechy&apos;s 2% fee is only on the goods.</p>
        </div>

        <Card title="Store pickup">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">Let customers pick up</p>
                <p className="text-sm text-muted">Always free. Works for any customer, anywhere.</p>
              </div>
              <button
                role="switch"
                aria-checked={pickup.enabled}
                onClick={() => setPickup({ ...pickup, enabled: !pickup.enabled })}
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${pickup.enabled ? "bg-brand" : "bg-line"}`}
              >
                <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${pickup.enabled ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>
            {pickup.enabled && (
              <>
                <Field label="Pickup address"><input value={pickup.address} onChange={(e) => setPickup({ ...pickup, address: e.target.value })} className={inputClass} /></Field>
                <Field label="Opening hours"><input value={pickup.hours} onChange={(e) => setPickup({ ...pickup, hours: e.target.value })} className={inputClass} /></Field>
              </>
            )}
          </div>
        </Card>
      </div>

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Add delivery area" : "Edit delivery area"}>
        {editing !== null && (
          <ZoneForm
            key={editing === "new" ? "new" : editing.id}
            zone={editing === "new" ? undefined : editing}
            onSave={save}
            onDelete={editing === "new" ? undefined : () => { setZones(zones.filter((x) => x.id !== editing.id)); setEditing(null); }}
          />
        )}
      </Sheet>
    </>
  );
}
