"use client";

import { useSyncExternalStore } from "react";
import { timeAgo, timeLeft } from "@/lib/money";

const STEP = 30_000;
const subscribe = (onChange: () => void) => {
  const t = setInterval(onChange, STEP);
  return () => clearInterval(t);
};
const clock = () => Math.floor(Date.now() / STEP);

/**
 * "5 min ago" / "23h 10m left". Worked out in the browser (the server's clock and render time
 * differ, which would make React's first render disagree) and refreshed every 30 seconds.
 */
export function RelTime({ iso, left }: { iso: string; left?: boolean }) {
  // The server snapshot differs from the browser's, so React re-renders with browser time after hydrating
  useSyncExternalStore(subscribe, clock, () => 0);
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {left ? timeLeft(iso) : timeAgo(iso)}
    </time>
  );
}
