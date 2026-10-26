"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { Illo } from "./illustrations";
import { RelTime } from "./rel-time";
import { Card, Pill } from "./ui";
import { Sheet } from "./zone-form";
import { formatNaira } from "@/lib/money";
import type { payouts as Payouts } from "@/lib/mock";

type Payout = (typeof Payouts)[number];

/** On a phone the newest few payouts show, and the rest open in a sheet from the bottom. */
const PHONE_SHOWS = 3;

function Row({ p }: { p: Payout }) {
  return (
    <>
      <span className={`flex h-10 w-10 shrink-0 sm:h-11 sm:w-11 items-center justify-center rounded-2xl ${p.half === "First 50%" ? "bg-brand-soft" : "bg-good-soft"}`}>
        <Illo name={p.half === "First 50%" ? "box" : "sparkle"} size={26} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {p.half} · <span className="whitespace-nowrap">{p.orderNumber}</span>
        </p>
        <p className="text-sm text-muted">
          {p.half === "First 50%" ? "On accept" : "On delivery"} · <RelTime iso={p.at} />
        </p>
      </div>
      <div className="text-right">
        <p className="font-display text-lg font-bold">{formatNaira(p.amount)}</p>
        <Pill tone="good">Paid</Pill>
      </div>
    </>
  );
}

export function PayoutHistory({ payouts }: { payouts: Payout[] }) {
  const [all, setAll] = useState(false);
  return (
    <Card title="Payout history" padded={false}>
      <ul className="flex flex-col divide-y divide-line">
        {payouts.map((p, i) => (
          <li key={p.id} className={`items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5 sm:py-4 ${i >= PHONE_SHOWS ? "hidden sm:flex" : "flex"}`}>
            <Row p={p} />
          </li>
        ))}
      </ul>
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
