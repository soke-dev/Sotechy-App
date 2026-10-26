"use client";

import { MapPin, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { Illo } from "@/components/illustrations";
import { btn, Card, EmptyState, Field, inputClass, PageHeader, Pill } from "@/components/ui";
import { Sheet, ZoneForm, ZonePrices } from "@/components/zone-form";
import { formatNaira } from "@/lib/money";
import { deliveryZones, pickup as initialPickup, zoneLabel, zoneLive, type DeliveryZone } from "@/lib/mock";

const REVIEW = {
  pending: { label: "Waiting for approval", tone: "warn" },
  declined: { label: "Not approved", tone: "bad" },
} as const;

function Switch({ on, label, onChange }: { on: boolean; label: string; onChange: () => void }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={onChange} className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? "bg-brand" : "bg-line"}`}>
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

export default function DeliveryPage() {
  const [zones, setZones] = useState(deliveryZones);
  const [editing, setEditing] = useState<DeliveryZone | "new" | null>(null);
  const [pickup, setPickup] = useState(initialPickup);
  const live = zones.filter(zoneLive);
  const states = [...new Set(live.map((z) => z.state))];
  const waiting = zones.filter((z) => z.review === "pending").length;

  const save = (z: DeliveryZone) => {
    setZones(zones.some((x) => x.id === z.id) ? zones.map((x) => (x.id === z.id ? z : x)) : [...zones, z]);
    setEditing(null);
  };

  return (
    <>
      <PageHeader
        illo="bike"
        title="Delivery"
        description="Where you deliver, what home delivery and pickup cost, and how long it takes. Set an area up once, then tick it on any product."
        actions={
          <button onClick={() => setEditing("new")} className={btn.primary}>
            <Plus size={17} /> Add delivery area
          </button>
        }
      />

      <section className="mb-6 flex flex-wrap items-center gap-4 rounded-[28px] bg-panel p-5 text-white sm:p-6">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 sm:h-16 sm:w-16">
          <Illo name="pin" size={34} />
        </span>
        <div className="min-w-0 flex-1 basis-48">
          <p className="font-display text-xl font-bold sm:text-2xl">
            {live.length ? `You deliver to ${states.length} state${states.length === 1 ? "" : "s"}` : "No delivery areas live yet"}
          </p>
          <p className="text-sm text-white/70">
            {live.length ? states.join(", ") : "Customers can still pick up from your shop."} {pickup.enabled && "· Shop pickup on"}
          </p>
        </div>
        {waiting > 0 && <span className="rounded-full bg-sun px-3 py-1 text-xs font-bold text-ink">{waiting} waiting for approval</span>}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex min-w-0 flex-col gap-3">
          {zones.length === 0 ? (
            <EmptyState illo="bike" title="Add your first delivery area" message="Pick a state, the cities you cover, and your home delivery and pickup prices." action={<button onClick={() => setEditing("new")} className={`${btn.primary} mt-2`}>Add delivery area</button>} />
          ) : (
            zones.map((z) => {
              const approved = z.review === "approved";
              return (
                <div key={z.id} className={`relative rounded-3xl border bg-surface transition hover:border-faint ${zoneLive(z) ? "border-line" : "border-dashed border-line"}`}>
                  <button onClick={() => setEditing(z)} className={`flex w-full items-start gap-3 p-4 text-left sm:gap-4 ${approved ? "pr-20" : ""}`}>
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${zoneLive(z) ? "bg-brand-soft" : "bg-surface-alt"}`}>
                      <MapPin size={19} className={zoneLive(z) ? "text-brand-strong" : "text-muted"} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{zoneLabel(z)}</span>
                      <span className="mt-1 block"><ZonePrices zone={z} /></span>
                      <span className="mt-1 block text-xs text-muted">
                        {z.days}
                        {z.freeOver ? ` · free home delivery over ${formatNaira(z.freeOver)}` : ""}
                        {z.pickup ? ` · pickup at ${z.pickup.point}` : ""}
                      </span>
                      {z.review !== "approved" && (
                        <span className="mt-2 block">
                          <Pill tone={REVIEW[z.review].tone}>{REVIEW[z.review].label}</Pill>
                        </span>
                      )}
                      {z.review === "declined" && z.reviewNote && <span className="mt-2 block rounded-2xl bg-bad-soft px-3 py-2 text-xs text-bad">{z.reviewNote}</span>}
                      <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-strong">
                        <Pencil size={12} /> Edit area and prices
                      </span>
                    </span>
                  </button>
                  {approved && (
                    <span className="absolute right-4 top-4">
                      <Switch on={z.active} label={`Deliver to ${zoneLabel(z)}`} onChange={() => setZones(zones.map((x) => (x.id === z.id ? { ...x, active: !x.active } : x)))} />
                    </span>
                  )}
                </div>
              );
            })
          )}
          <p className="px-1 text-xs text-muted">
            Customers choose home delivery or pickup at checkout and pay that price. New areas, and changes to an area&apos;s state or cities, are checked by Sotechy first. Delivery fees are paid to you in full with the first 50% of each order; Sotechy&apos;s 2% fee is only on the goods.
          </p>
        </div>

        <div className="min-w-0">
          <Card title="Pickup at your shop">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">Let customers collect</p>
                  <p className="text-sm text-muted">Always free. Works for any customer, anywhere, even outside your delivery areas.</p>
                </div>
                <Switch on={pickup.enabled} label="Pickup at your shop" onChange={() => setPickup({ ...pickup, enabled: !pickup.enabled })} />
              </div>
              {pickup.enabled && (
                <>
                  <Field label="Shop address"><input value={pickup.address} onChange={(e) => setPickup({ ...pickup, address: e.target.value })} className={inputClass} /></Field>
                  <Field label="Opening hours"><input value={pickup.hours} onChange={(e) => setPickup({ ...pickup, hours: e.target.value })} className={inputClass} /></Field>
                </>
              )}
            </div>
          </Card>
        </div>
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
