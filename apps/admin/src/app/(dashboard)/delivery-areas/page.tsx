"use client";

import { Check, Home, MapPin, Store } from "lucide-react";
import { useState } from "react";
import { formatNaira } from "@sotechy/shared";
import { RelTime } from "@/components/rel-time";
import { dangerButtonClass, EmptyState, inputClass, PageHeader, Pill, primaryButtonClass, SampleBadge, secondaryButtonClass, Sheet, Tabs } from "@/components/ui";
import { zoneRequests, type ZoneRequest, type ZoneReview } from "@/lib/marketplace";

const label = (z: Pick<ZoneRequest, "state" | "areas">) => (z.areas.length ? `${z.areas.join(", ")} (${z.state})` : `All of ${z.state}`);
const price = (n: number) => (n ? formatNaira(n) : "Free");

export default function DeliveryAreasPage() {
  const [list, setList] = useState(zoneRequests);
  const [tab, setTab] = useState<ZoneReview>("pending");
  const [declining, setDeclining] = useState<ZoneRequest | null>(null);
  const [note, setNote] = useState("");
  const count = (r: ZoneReview) => list.filter((z) => z.review === r).length;
  const shown = list.filter((z) => z.review === tab);

  const decide = (id: string, review: ZoneReview, reason?: string) => setList(list.map((z) => (z.id === id ? { ...z, review, note: reason } : z)));

  return (
    <>
      <PageHeader
        illo="pin"
        title="Delivery areas"
        badge={<SampleBadge />}
        description="Merchants can only deliver where you've approved. Check they really can (a courier, waybills, a shop there) before customers see it. Price changes go live without a check."
      />

      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "pending", label: "Waiting", count: count("pending"), urgent: true },
          { id: "approved", label: "Approved", count: count("approved") },
          { id: "declined", label: "Declined", count: count("declined") },
        ]}
      />

      {shown.length === 0 ? (
        <EmptyState illo="pin" title={tab === "pending" ? "All caught up" : "Nothing here"} message={tab === "pending" ? "No delivery areas waiting. New ones and changes to a place arrive here." : undefined} />
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {shown.map((z) => (
            <li key={z.id} className={`flex min-w-0 flex-col gap-3 rounded-3xl border bg-surface p-4 ${z.review === "pending" ? "border-brand/40" : "border-line"}`}>
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft">
                  <MapPin size={19} className="text-brand-strong" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg font-bold leading-snug">{label(z)}</p>
                  <p className="text-sm text-muted">
                    {z.merchant} · <span className="font-semibold text-brand-strong">${z.ticker}</span> · <RelTime iso={z.requestedAt} />
                  </p>
                </div>
                {z.change && <Pill tone="info">{z.change}</Pill>}
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span className="inline-flex items-center gap-1.5"><Home size={14} className="text-muted" /> Home {price(z.homeFee)}</span>
                {z.pickup && <span className="inline-flex items-center gap-1.5"><Store size={14} className="text-muted" /> Pickup {price(z.pickup.fee)} at {z.pickup.point}</span>}
                <span className="text-muted">{z.days}</span>
              </div>
              <p className="rounded-2xl bg-surface-alt px-3 py-2 text-sm"><b>Evidence:</b> {z.evidence}</p>
              {z.note && <p className="rounded-2xl bg-bad-soft px-3 py-2 text-sm text-bad">{z.note}</p>}

              {z.review === "pending" ? (
                <div className="flex gap-2">
                  <button onClick={() => decide(z.id, "approved")} className={`${primaryButtonClass} flex-1`}>
                    <Check size={16} /> Approve
                  </button>
                  <button onClick={() => setDeclining(z)} className={dangerButtonClass}>Decline</button>
                </div>
              ) : (
                <button onClick={() => decide(z.id, "pending")} className={`${secondaryButtonClass} self-start`}>
                  Move back to waiting
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <Sheet open={declining !== null} onClose={() => setDeclining(null)} title="Decline delivery area">
        {declining && (
          <div className="flex flex-col gap-3 text-sm">
            <p>
              <b>{label(declining)}</b> for {declining.merchant}. Tell them what would change your mind; they see this on their Delivery page.
            </p>
            <textarea autoFocus rows={3} value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} placeholder="e.g. Send a waybill receipt for this city and we'll look again." />
            <button
              disabled={!note.trim()}
              onClick={() => {
                decide(declining.id, "declined", note.trim());
                setDeclining(null);
                setNote("");
              }}
              className={dangerButtonClass}
            >
              Decline
            </button>
          </div>
        )}
      </Sheet>
    </>
  );
}
