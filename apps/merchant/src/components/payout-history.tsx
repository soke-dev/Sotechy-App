"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";
import type { PayoutRow, PayoutStatus } from "@sotechy/shared";
import { Illo } from "./illustrations";
import { RelTime } from "./rel-time";
import { Card, Pill, type Tone } from "./ui";
import { Sheet } from "./zone-form";
import { formatNaira } from "@/lib/money";

/** On a phone the newest few payouts show, and the rest open in a sheet from the bottom. */
const PHONE_SHOWS = 3;

const STAGE = {
  first: { label: "First payment", when: "When you accepted", illo: "box", tint: "bg-brand-soft" },
  final: { label: "Final payment", when: "After delivery", illo: "bank", tint: "bg-good-soft" },
  payback: { label: "To pay back", when: "Order cancelled after payment", illo: "doc", tint: "bg-bad-soft" },
} as const;

const STATUS: Record<PayoutStatus, { label: string; tone: Tone }> = {
  scheduled: { label: "Coming", tone: "info" },
  sending: { label: "On its way", tone: "brand" },
  paid: { label: "Paid", tone: "good" },
  failed: { label: "Delayed", tone: "warn" },
  held: { label: "On hold", tone: "warn" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  owed: { label: "You owe this", tone: "bad" },
  settled: { label: "Settled", tone: "good" },
};

function Row({ p }: { p: PayoutRow }) {
  const stage = STAGE[p.stage];
  const status = STATUS[p.status];
  // When it happened, or when it's due
  const at = p.paidAt ?? (p.status === "scheduled" ? p.dueAt : (p.sentAt ?? p.createdAt));
  return (
    <>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl sm:h-11 sm:w-11 ${stage.tint}`}>
        <Illo name={stage.illo} size={26} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {stage.label} · <span className="whitespace-nowrap">{p.orderNumber}</span>
        </p>
        <p className="text-sm text-muted">
          {p.status === "scheduled" ? "Due " : `${stage.when} · `}
          <RelTime iso={at} />
          {p.fee > 0 ? ` · ${formatNaira(p.fee)} fee` : ""}
        </p>
      </div>
      <div className="text-right">
        <p className={`font-display text-lg font-bold ${p.stage === "payback" ? "text-bad" : ""}`}>
          {p.stage === "payback" ? "−" : ""}
          {formatNaira(p.amount)}
        </p>
        <Pill tone={status.tone}>{status.label}</Pill>
      </div>
    </>
  );
}

export function PayoutHistory({ payouts }: { payouts: PayoutRow[] }) {
  const [all, setAll] = useState(false);
  return (
    <Card title="Payout history" padded={false}>
      {payouts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <Illo name="wallet" size={56} />
          <p className="font-semibold">No payouts yet</p>
          <p className="max-w-sm text-sm text-muted">When you accept an order, its first payment shows here, and the rest follows after delivery.</p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {payouts.map((p, i) => (
            <li key={p.id} className={`items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5 sm:py-4 ${i >= PHONE_SHOWS ? "hidden sm:flex" : "flex"}`}>
              <Row p={p} />
            </li>
          ))}
        </ul>
      )}
      {payouts.length > PHONE_SHOWS && (
        <button type="button" onClick={() => setAll(true)} className="flex w-full items-center justify-center gap-1 border-t border-line py-4 text-sm font-semibold text-brand-strong sm:hidden">
          See all {payouts.length} payouts <ChevronRight size={16} />
        </button>
      )}

      <Sheet open={all} onClose={() => setAll(false)} title="All payouts">
        <ul className="-mx-6 flex flex-col divide-y divide-line">
          {payouts.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-6 py-3">
              <Row p={p} />
            </li>
          ))}
        </ul>
      </Sheet>
    </Card>
  );
}
