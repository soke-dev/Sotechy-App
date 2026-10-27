"use client";

import { Check, Home, MapPin, Store } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatNaira } from "@sotechy/shared";
import { RelTime } from "@/components/rel-time";
import { dangerButtonClass, EmptyState, inputClass, PageHeader, primaryButtonClass, secondaryButtonClass, Sheet, Tabs } from "@/components/ui";
import { reviewZone } from "../merchants/actions";
import type { AdminZone } from "../merchants/store-types";

export type ZoneRow = AdminZone & { merchantId: string; updatedAt: string; storeName: string; storeSlug: string; storeStatus: "pending" | "approved" | "suspended" };
type Review = AdminZone["review"];

const label = (z: Pick<AdminZone, "state" | "areas">) => (z.areas.length ? `${z.areas.join(", ")} (${z.state})` : `All of ${z.state}`);
const price = (n: number | null) => (n ? formatNaira(n) : "Free");

export function ZonesView({ zones }: { zones: ZoneRow[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<Review>("pending");
  const [declining, setDeclining] = useState<ZoneRow | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const count = (r: Review) => zones.filter((z) => z.review === r).length;
  const shown = zones.filter((z) => z.review === tab);

  const decide = (z: ZoneRow, review: Review, reason?: string, after?: () => void) =>
    start(async () => {
      setError(null);
      const r = await reviewZone(z.merchantId, z.id, review === "pending" ? "approved" : review, reason);
      if ("error" in r) setError(r.error);
      else {
        after?.();
        router.refresh();
      }
    });

  return (
    <>
      <PageHeader
        illo="pin"
        title="Delivery areas"
        description="Stores can only deliver where you've approved. Check they really can (a courier, waybills, a shop there) before customers see it. Price changes go live without a check; a new place comes back here."
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
      {error && <p className="mb-4 rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}

      {shown.length === 0 ? (
        <EmptyState illo="pin" title={tab === "pending" ? "All caught up" : "Nothing here"} message={tab === "pending" ? "No delivery areas waiting. New ones, and changes to where one covers, arrive here." : undefined} />
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
                    <Link href={`/merchants/${z.merchantId}`} className="font-semibold text-brand-strong hover:underline">
                      {z.storeName}
                    </Link>{" "}
                    · <RelTime iso={z.updatedAt} />
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span className="inline-flex items-center gap-1.5"><Home size={14} className="text-muted" /> Home {price(z.homeFee)}</span>
                {z.pickupPoint && <span className="inline-flex items-center gap-1.5"><Store size={14} className="text-muted" /> Pickup {price(z.pickupFee)} at {z.pickupPoint}</span>}
                <span className="text-muted">{z.days}</span>
                {z.freeOver && <span className="text-muted">Free over {formatNaira(z.freeOver)}</span>}
              </div>
              {z.reviewNote && <p className="rounded-2xl bg-bad-soft px-3 py-2 text-sm text-bad">{z.reviewNote}</p>}

              {z.review === "pending" ? (
                <div className="flex gap-2">
                  <button disabled={busy} onClick={() => decide(z, "approved")} className={`${primaryButtonClass} flex-1`}>
                    <Check size={16} /> Approve
                  </button>
                  <button disabled={busy} onClick={() => setDeclining(z)} className={dangerButtonClass}>Decline</button>
                </div>
              ) : z.review === "declined" ? (
                <button disabled={busy} onClick={() => decide(z, "approved")} className={`${secondaryButtonClass} self-start`}>
                  Approve after all
                </button>
              ) : (
                <button disabled={busy} onClick={() => setDeclining(z)} className={`${secondaryButtonClass} self-start`}>
                  Take it back (decline)
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
              <b>{label(declining)}</b> for {declining.storeName}. Tell them what would change your mind; they see this on their Delivery page.
            </p>
            <textarea autoFocus rows={3} value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} placeholder="e.g. Send a waybill receipt for this city and we'll look again." />
            <button
              disabled={!note.trim() || busy}
              onClick={() =>
                decide(declining, "declined", note.trim(), () => {
                  setDeclining(null);
                  setNote("");
                })
              }
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
