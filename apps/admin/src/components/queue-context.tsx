"use client";

import { createContext, useContext, type ReactNode } from "react";

/** What's waiting for a decision, loaded once per page by the dashboard layout */
export interface Queue {
  merchants: number;
  zones: number;
  cases: number;
  /** Support conversations waiting on Sotechy */
  support: number;
  /** Store payouts to send now, and customers' refunds waiting */
  payouts: number;
  refunds: number;
}

const QueueContext = createContext<Queue>({ merchants: 0, zones: 0, cases: 0, support: 0, payouts: 0, refunds: 0 });

export function QueueProvider({ value, children }: { value: Queue; children: ReactNode }) {
  return <QueueContext value={value}>{children}</QueueContext>;
}

export const useQueue = () => useContext(QueueContext);
