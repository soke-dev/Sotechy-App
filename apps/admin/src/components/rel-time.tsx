"use client";

import { useSyncExternalStore } from "react";

const STEP = 30_000;
const subscribe = (onChange: () => void) => {
  const t = setInterval(onChange, STEP);
  return () => clearInterval(t);
};
const clock = () => Math.floor(Date.now() / STEP);

export function timeAgo(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

/** "5 min ago", worked out in the browser (the server's clock would make React's first render disagree) and refreshed every 30 seconds. */
export function RelTime({ iso }: { iso: string }) {
  useSyncExternalStore(subscribe, clock, () => 0);
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {timeAgo(iso)}
    </time>
  );
}
