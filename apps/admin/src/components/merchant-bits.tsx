// Small pieces shared by the merchant list and the merchant page.
import { Check, CircleHelp, X } from "lucide-react";
import { docsChecked, type Merchant } from "@/lib/marketplace";

export function MerchantAvatar({ m, size = 44, dark }: { m: Merchant; size?: number; dark?: boolean }) {
  const letters = m.name
    .split(/\s+/)
    .filter((w) => /[a-z]/i.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  return (
    <span
      className={`font-display flex shrink-0 items-center justify-center rounded-2xl font-extrabold ${dark ? "bg-brand text-white" : "bg-brand-soft text-brand-strong"}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {letters}
    </span>
  );
}

/** One bar segment per document: green accepted, red not acceptable, grey not checked yet */
export function DocsBar({ m }: { m: Merchant }) {
  return (
    <span className="flex min-w-0 flex-col gap-1">
      <span className="flex w-24 gap-1">
        {m.docs.map((d) => (
          <span key={d.id} className={`h-1.5 flex-1 rounded-full ${d.status === "accepted" ? "bg-good" : d.status === "rejected" ? "bg-bad" : "bg-line"}`} />
        ))}
      </span>
      <span className="text-xs text-muted">
        {docsChecked(m)} of {m.docs.length} checked
      </span>
    </span>
  );
}

export function CheckIcon({ ok, size = 16 }: { ok: boolean | null; size?: number }) {
  if (ok === null) return <CircleHelp size={size} className="shrink-0 text-warn" />;
  return ok ? <Check size={size} className="shrink-0 text-good" /> : <X size={size} className="shrink-0 text-bad" />;
}

/** "5 hours", "26 hours", "2 days" */
export function waitedFor(iso: string) {
  const hours = Math.max(0, (Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) return `${Math.round(hours)} hour${Math.round(hours) === 1 ? "" : "s"}`;
  return `${Math.round(hours / 24)} days`;
}

/** Past the 24-hour mark we aim to answer within */
export const waitedTooLong = (iso: string) => Date.now() - new Date(iso).getTime() > 24 * 3_600_000;

export const isWaiting = (m: Merchant) => m.status === "review" || m.status === "info";
