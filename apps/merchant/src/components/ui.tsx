// Building blocks for the merchant dashboard, in the customer app's look.
import type { ReactNode } from "react";
import { Illo, type IlloName } from "./illustrations";

export function PageHeader({ title, description, actions, illo }: { title: string; description?: string; actions?: ReactNode; illo?: IlloName }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        {illo && (
          <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-soft sm:flex">
            <Illo name={illo} size={38} />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-[26px] font-bold leading-tight sm:text-3xl">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, description, actions, children, className = "", padded = true }: { title?: string; description?: string; actions?: ReactNode; children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={`min-w-0 rounded-3xl border border-line bg-surface ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
          <div className="min-w-0">
            {title && <h2 className="text-lg font-bold">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}

export function StatCard({ illo, label, value, hint, accent }: { illo: IlloName; label: string; value: ReactNode; hint?: ReactNode; accent?: boolean }) {
  return (
    <div className={`flex min-w-0 flex-col items-start gap-3 rounded-3xl border p-4 sm:flex-row sm:items-center sm:gap-4 ${accent ? "border-transparent bg-panel text-white" : "border-line bg-surface"}`}>
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl sm:h-14 sm:w-14 ${accent ? "bg-white/10" : "bg-brand-soft"}`}>
        <Illo name={illo} size={32} />
      </span>
      <div className="min-w-0">
        <p className={`text-xs font-medium ${accent ? "text-white/60" : "text-muted"}`}>{label}</p>
        <p className="font-display truncate text-xl font-bold sm:text-2xl">{value}</p>
        {hint && <p className={`text-xs ${accent ? "text-white/60" : "text-muted"}`}>{hint}</p>}
      </div>
    </div>
  );
}

const tones = {
  brand: "bg-brand-soft text-brand-strong",
  good: "bg-good-soft text-good",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  info: "bg-sky-50 text-sky-800",
  neutral: "bg-surface-alt text-ink-2",
  dark: "bg-panel text-white",
} as const;
export type Tone = keyof typeof tones;

export function Pill({ children, tone = "neutral", dot = true }: { children: ReactNode; tone?: Tone; dot?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}

/** Product picture on Sotechy orange, like the customer app. `size="fluid"` fills the width as a square. */
export function ProductThumb({ src, size = 56, rounded = "rounded-2xl" }: { src: string; size?: number | "fluid"; rounded?: string }) {
  const box = size === "fluid" ? { className: "aspect-square w-full", style: undefined } : { className: "shrink-0", style: { width: size, height: size } };
  return (
    <span className={`relative flex items-center justify-center overflow-hidden bg-brand ${box.className} ${rounded}`} style={box.style}>
      <span className="absolute inset-[18%] rounded-full bg-white/25" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="relative h-[78%] w-[78%] object-contain" />
    </span>
  );
}

export function EmptyState({ illo, title, message, action }: { illo: IlloName; title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-line px-6 py-12 text-center">
      <Illo name={illo} size={64} />
      <p className="font-display text-lg font-bold">{title}</p>
      {message && <p className="max-w-sm text-sm text-muted">{message}</p>}
      {action}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-sm font-semibold text-ink-2">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "min-h-12 w-full rounded-2xl border border-line bg-surface px-4 py-2.5 text-[15px] text-ink outline-none transition placeholder:text-faint focus:border-ink focus:ring-4 focus:ring-brand/15";
export const btn = {
  primary: "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-strong disabled:opacity-50",
  dark: "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-panel px-5 text-sm font-semibold text-white transition hover:bg-ink-2 disabled:opacity-50",
  outline: "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-surface px-5 text-sm font-semibold text-ink transition hover:bg-surface-alt disabled:opacity-50",
  ghost: "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold text-ink-2 transition hover:bg-surface-alt",
  danger: "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-surface px-5 text-sm font-semibold text-bad transition hover:bg-bad-soft",
};

/** A $TICKER amount with the coin illustration. */
export function TokenAmount({ amount, ticker, size = "md" }: { amount: string; ticker: string; size?: "md" | "lg" }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold ${size === "lg" ? "text-2xl" : "text-sm"}`}>
      <Illo name="coin" size={size === "lg" ? 26 : 16} />
      {amount} <span className="text-brand-strong">${ticker}</span>
    </span>
  );
}
