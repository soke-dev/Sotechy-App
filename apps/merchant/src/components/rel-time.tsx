"use client";

import { useEffect, useState } from "react";
import { timeAgo, timeLeft } from "@/lib/money";

/**
 * "5 min ago" / "23h 10m left". Worked out in the browser (the server's clock and render time
 * differ, which would make React's first render disagree) and refreshed every 30 seconds.
 */
export function RelTime({ iso, left }: { iso: string; left?: boolean }) {
  const [, tick] = useState(0);
  useEffect(() => {
    tick(1);
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {left ? timeLeft(iso) : timeAgo(iso)}
    </time>
  );
}
