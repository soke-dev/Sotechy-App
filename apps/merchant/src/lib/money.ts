// The marketplace's money rules (docs/tokens/README.md). Used by the demo data and every screen,
// so the numbers always agree. Rates come from admin settings later.

export const PLATFORM_FEE = 0.02; // split 1:1 between the token reserve and Sotechy revenue
export const MAX_REVIEW_BONUS = 0.1;
export const SOTECHY_CROSS_BONUS = 0.1;
/** Store value of one token: the 1% reserve share spread over base tokens + the full review bonus. */
export const STORE_VALUE_PER_TOKEN = PLATFORM_FEE / 2 / (1 + MAX_REVIEW_BONUS);

export function splitOrder(total: number) {
  const fee = Math.round(total * PLATFORM_FEE);
  const share = total - fee;
  const first = Math.round(share / 2);
  return { fee, reserve: fee / 2, revenue: fee / 2, share, first, second: share - first };
}

/** Sotechy's fee for showing, e.g. "3%" */
export const feeLabel = (rate: number) => `${Math.round(rate * 1000) / 10}%`;

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
export const formatNaira = (n: number) => naira.format(n);

const whole = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat("en-NG", { notation: "compact", maximumFractionDigits: 1 });
export const formatTokens = (n: number, ticker?: string) => `${n >= 1_000_000 ? compact.format(n) : whole.format(n)}${ticker ? ` $${ticker}` : ""}`;

export function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

export function timeLeft(iso: string) {
  const mins = Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60_000));
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m left`;
  return `${mins}m left`;
}
