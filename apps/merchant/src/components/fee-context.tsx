"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_PAYOUT_SETTINGS } from "@sotechy/shared";

/** Sotechy's fee on each sale, as admin sets it (loaded on the server, passed down here) */
const FeeContext = createContext<number>(DEFAULT_PAYOUT_SETTINGS.feeRate);

export function FeeProvider({ fee, children }: { fee: number; children: ReactNode }) {
  return <FeeContext.Provider value={fee}>{children}</FeeContext.Provider>;
}

/** The fee as a fraction, e.g. 0.03 */
export const useFeeRate = () => useContext(FeeContext);

// For showing it: feeLabel in @/lib/money (usable on the server too)
export { feeLabel } from "@/lib/money";
