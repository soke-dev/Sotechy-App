// Building blocks for the merchant dashboard, in the customer app's look.
import type { ReactNode } from "react";
import { Illo, type IlloName } from "./illustrations";

// `illo` is accepted for older call sites but no longer drawn: headers are plain text
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode; illo?: IlloName }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-[26px] font-bold leading-tight sm:text-3xl">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, description, actions, children, className = "", padded = true, required }: { title?: string; description?: string; actions?: ReactNode; children: ReactNode; className?: string; padded?: boolean; required?: boolean }) {
  return (
    <section className={`min-w-0 rounded-2xl border border-line bg-surface ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
          <div className="min-w-0">
            {title && <h2 className="text-lg font-bold">{title}{required && <Req />}</h2>}
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}

/** A number with its label: a small icon beside the label, the value, an optional hint. `accent` tints it. */
export function StatCard({ illo, label, value, hint, accent }: { illo: IlloName; label: string; value: ReactNode; hint?: ReactNode; accent?: boolean; wide?: boolean }) {
  return (
    <div className={`min-w-0 rounded-2xl border px-4 py-3 ${accent ? "border-brand/30 bg-brand-soft" : "border-line bg-surface"}`}>
      <p className="flex items-start gap-1.5 text-xs font-medium leading-snug text-muted">
        <span className="shrink-0">
          <Illo name={illo} size={16} />
        </span>
        <span className="line-clamp-2 min-w-0">{label}</span>
      </p>
      <p className="font-display mt-1 truncate text-xl font-bold leading-tight sm:text-[22px]">{value}</p>
      {hint && <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted">{hint}</p>}
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
/** A product photo on the brand tile; a box illustration when there's no photo */
export function ProductThumb({ src, size = 56, rounded = "rounded-2xl" }: { src: string | null; size?: number | "fluid"; rounded?: string }) {
  const box = size === "fluid" ? { className: "aspect-square w-full", style: undefined } : { className: "shrink-0", style: { width: size, height: size } };
  return (
    <span className={`relative flex items-center justify-center overflow-hidden ${src ? "bg-surface-alt" : "bg-brand"} ${box.className} ${rounded}`} style={box.style}>
      {src ? (
        // A photo fills its tile; the orange tile is only for "no photo yet"
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <>
          <span className="absolute inset-[18%] rounded-full bg-white/25" />
          <span className="relative">
            <Illo name="box" size={typeof size === "number" ? Math.round(size * 0.5) : 40} />
          </span>
        </>
      )}
    </span>
  );
}

export function EmptyState({ illo, title, message, action }: { illo: IlloName; title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      <Illo name={illo} size={64} />
      <p className="font-display text-lg font-bold">{title}</p>
      {message && <p className="max-w-sm text-sm text-muted">{message}</p>}
      {action}
    </div>
  );
}

export interface TabItem<T extends string> {
  id: T;
  label: string;
  count?: number;
  /** Highlight the count, e.g. things waiting for the merchant */
  urgent?: boolean;
}

export function Tabs<T extends string>({ tabs, value, onChange, className = "" }: { tabs: TabItem<T>[]; value: T; onChange: (id: T) => void; className?: string }) {
  return (
    <div role="tablist" className={`no-scrollbar -mx-1 flex min-w-0 gap-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible ${className}`}>
      {tabs.map((t) => {
        const on = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={on}
            // Keep the selected tab visible when the row scrolls sideways on a phone
            ref={on ? (el) => el?.scrollIntoView({ block: "nearest", inline: "nearest" }) : undefined}
            onClick={() => onChange(t.id)}
            className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${on ? "border-inverse bg-inverse text-on-inverse" : "border-line bg-surface text-ink-2 hover:bg-surface-alt"}`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={`rounded-full px-1.5 text-xs ${on ? "bg-white/15" : t.urgent && t.count ? "bg-brand text-white" : "bg-surface-alt"}`}>{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Red asterisk for something that must be filled in */
export function Req() {
  return (
    <span className="ml-0.5 text-bad" aria-label="required">
      *
    </span>
  );
}

export function Field({ label, hint, children, required }: { label: string; hint?: string; children: ReactNode; required?: boolean }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-sm font-semibold text-ink-2">
        {label}
        {required && <Req />}
      </span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "min-h-12 w-full rounded-2xl border border-line bg-surface px-4 py-2.5 text-[15px] text-ink outline-none transition placeholder:text-faint focus:border-ink focus:ring-4 focus:ring-brand/15";
export const btn = {
  primary: "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-strong disabled:opacity-50",
  dark: "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-inverse px-5 text-sm font-semibold text-on-inverse transition hover:opacity-90 disabled:opacity-50",
  outline: "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-surface px-5 text-sm font-semibold text-ink transition hover:bg-surface-alt disabled:opacity-50",
  ghost: "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold text-ink-2 transition hover:bg-surface-alt",
  danger: "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-surface px-5 text-sm font-semibold text-bad transition hover:bg-bad-soft",
  /** The big orange button of the sign-in and sign-up forms, with an arrow chip at its end */
  auth: "pop inline-flex min-h-[60px] w-full items-center justify-center gap-3 rounded-[18px] border-[2.5px] border-[#17120E] bg-brand pl-6 pr-3.5 font-display text-lg font-extrabold text-[#17120E] disabled:opacity-50",
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
