"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { loadQueue } from "@/app/(dashboard)/actions";

/** What's waiting for a decision: loaded with the page, then checked again every 20 seconds, on every
 *  page change and when the tab comes back, since things fall due without anything changing (a payout's time) */
export interface Queue {
  merchants: number;
  /** Stores' new details waiting for approval */
  storeChanges: number;
  zones: number;
  cases: number;
  /** Support conversations waiting on Sotechy */
  support: number;
  /** Store payouts to send now, and customers' refunds waiting */
  payouts: number;
  refunds: number;
  /** Store owners' ID checks waiting for a decision */
  idChecks: number;
}

const EMPTY: Queue = { merchants: 0, storeChanges: 0, zones: 0, cases: 0, support: 0, payouts: 0, refunds: 0, idChecks: 0 };
const QueueContext = createContext<Queue>(EMPTY);

export function QueueProvider({ value, children }: { value: Queue; children: ReactNode }) {
  const [queue, setQueue] = useState(value);
  const pathname = usePathname();
  useEffect(() => setQueue(value), [value]);
  useEffect(() => {
    const check = () => {
      if (document.visibilityState !== "visible") return;
      void loadQueue().then((q) => q && setQueue({ ...EMPTY, ...q }));
    };
    check();
    const t = setInterval(check, 20_000);
    window.addEventListener("focus", check);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", check);
    };
  }, [pathname]);
  return <QueueContext value={queue}>{children}</QueueContext>;
}

export const useQueue = () => useContext(QueueContext);
