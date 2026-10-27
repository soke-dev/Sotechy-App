// How many of each store's token the signed-in customer holds, for store cards and pages. Loaded once
// and kept for a minute, so a list of stores doesn't ask the API once per card.
import { useEffect, useSyncExternalStore } from "react";
import { api } from "./api";

let held: Record<string, number> = {};
let loadedAt = 0;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

/** Reloads balances (call after anything that changes them, or when the account changes) */
export function refreshHeldTokens() {
  loading ??= api
    .wallet()
    .then((w) => {
      held = Object.fromEntries(w.balances.map((b) => [b.ticker, b.amount]));
    })
    .catch(() => {
      // Signed out or offline: show nothing rather than an old account's balances
      held = {};
    })
    .finally(() => {
      loadedAt = Date.now();
      loading = null;
      listeners.forEach((l) => l());
    });
  return loading;
}

export function clearHeldTokens() {
  held = {};
  loadedAt = 0;
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Tokens of this ticker the customer holds (0 until loaded) */
export function useHeldTokens(ticker: string) {
  const amount = useSyncExternalStore(subscribe, () => held[ticker] ?? 0, () => 0);
  useEffect(() => {
    if (Date.now() - loadedAt > 60_000) void refreshHeldTokens();
  }, []);
  return amount;
}
