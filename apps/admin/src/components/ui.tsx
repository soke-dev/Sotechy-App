// Building blocks for the dashboard: page headers, cards, stats, tables, badges, tabs, sheets and form styles.
// Same look as the merchant dashboard: rounded cards, illustrated icons, Sotechy orange.
import Link from "next/link";
import type { ReactNode } from "react";
import {
  BadgePercent,
  BarChart3,
  Boxes,
  Building2,
  CreditCard,
  FolderTree,
  Images,
  LayoutDashboard,
  LifeBuoy,
  Package,
  ScanBarcode,
  ScrollText,
  Settings,
  ShoppingBag,
  Star,
  ToggleRight,
  Truck,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@sotechy/shared";
import { Illo, type IlloName } from "./illustrations";

/** Pages pass a line icon; the header shows the matching illustration. */
const ILLO_FOR_ICON = new Map<LucideIcon, IlloName>([
  [LayoutDashboard, "home"],
  [BarChart3, "wallet"],
  [ShoppingBag, "receipt"],
  [ScanBarcode, "cart"],
  [CreditCard, "card"],
  [Users, "user"],
  [LifeBuoy, "chat"],
  [Package, "bag"],
  [FolderTree, "tag"],
  [Boxes, "box"],
  [Truck, "bike"],
  [BadgePercent, "tag"],
  [ToggleRight, "phone"],
  [Images, "sparkle"],
  [Star, "heart"],
  [Building2, "store"],
  [UserCog, "user"],
  [Settings, "shield"],
  [ScrollText, "doc"],
]);

export function PageHeader({
  title,
  description,
  actions,
  icon: Icon,
  illo,
  badge,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  icon?: LucideIcon;
  illo?: IlloName;
  /** Small label next to the title, e.g. "Sample data" */
  badge?: ReactNode;
}) {
  const picture = illo ?? (Icon ? ILLO_FOR_ICON.get(Icon) : undefined);
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      {/* Grows from zero so the actions stay on the same line on wide screens */}
      <div className="flex min-w-[min(100%,18rem)] flex-1 basis-0 items-center gap-4">
        {picture ? (
          <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-soft sm:flex">
            <Illo name={picture} size={38} />
          </span>
        ) : (
          Icon && (
            <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong sm:flex">
              <Icon size={24} />
            </span>
          )
        )}
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xl font-extrabold sm:text-3xl">
            {title}
            {badge}
          </h1>
          {description && <p className="mt-1 max-w-3xl text-sm text-muted sm:text-[15px]">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex max-w-full flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  description,
  actions,
  children,
  className = "",
  padded = true,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
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
      <div className={padded ? "p-5" : "pt-3"}>{children}</div>
    </section>
  );
}

type Tone = "neutral" | "brand" | "good" | "warn" | "bad" | "info";

const tileTones: Record<Tone, string> = {
  neutral: "bg-surface-alt",
  brand: "bg-white/10",
  good: "bg-good-soft",
  warn: "bg-warn-soft",
  bad: "bg-bad-soft",
  info: "bg-info-soft",
};

/** A number with its label. `tone="brand"` is the dark headline card. */
export function StatCard({ label, value, hint, icon: Icon, illo, tone = "neutral" }: { label: string; value: ReactNode; hint?: ReactNode; icon?: LucideIcon; illo?: IlloName; tone?: Tone }) {
  const dark = tone === "brand";
  return (
    <div className={`flex min-w-0 flex-col items-start gap-2 rounded-3xl border p-3.5 sm:flex-row sm:items-center sm:gap-4 sm:p-4 ${dark ? "border-transparent bg-panel text-white" : "border-line bg-surface"}`}>
      {(illo || Icon) && (
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 sm:rounded-2xl ${tileTones[tone]}`}>
          {illo ? <Illo name={illo} size={26} /> : Icon && <Icon size={19} className={dark ? "text-brand" : "text-ink-2"} />}
        </span>
      )}
      <div className="min-w-0">
        <p className={`text-xs font-medium ${dark ? "text-white/60" : "text-muted"}`}>{label}</p>
        <p className="font-display truncate text-lg font-bold sm:text-2xl">{value}</p>
        {hint && <p className={`text-xs ${dark ? "text-white/60" : "text-muted"}`}>{hint}</p>}
      </div>
    </div>
  );
}

const tones: Record<Tone, string> = {
  neutral: "bg-surface-alt text-ink-2",
  brand: "bg-brand-soft text-brand-strong",
  good: "bg-good-soft text-good",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  info: "bg-info-soft text-info",
};

export function Pill({ children, tone = "neutral", dot = true }: { children: ReactNode; tone?: Tone; dot?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}

/** Marks pages that show example data until the marketplace backend is connected. */
export function SampleBadge() {
  return (
    <span className="rounded-full border border-dashed border-faint px-2.5 py-0.5 font-sans text-xs font-semibold tracking-normal text-muted">
      Sample data
    </span>
  );
}

const statusTone: Partial<Record<string, Tone>> = {
  pending_payment: "warn",
  pending: "warn",
  open: "warn",
  paid: "info",
  confirmed: "good",
  processing: "info",
  ready_for_pickup: "brand",
  dispatched: "brand",
  delivered: "good",
  resolved: "good",
  received: "good",
  cancelled: "neutral",
  closed: "neutral",
  expired: "neutral",
  payment_failed: "bad",
  failed: "bad",
  refunded: "bad",
};

export function StatusBadge({ status }: { status: string }) {
  const label = ORDER_STATUS_LABELS[status as OrderStatus] ?? status.replace(/_/g, " ");
  return (
    <span className="capitalize">
      <Pill tone={statusTone[status] ?? "neutral"}>{label}</Pill>
    </span>
  );
}

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

/** A table on wide screens; on phones each row becomes a card of label/value pairs. */
export function DataTable<T>({ rows, columns, empty = "Nothing here yet" }: { rows: T[]; columns: Column<T>[]; empty?: string }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-line py-10 text-center">
        <Illo name="search" size={44} />
        <p className="max-w-sm text-sm text-muted">{empty}</p>
      </div>
    );
  }
  const [first, ...rest] = columns;
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              {columns.map((c, i) => (
                <th
                  key={c.header || i}
                  className={`whitespace-nowrap bg-surface-alt px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted first:rounded-l-xl last:rounded-r-xl ${c.className ?? ""}`}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-line/70 transition-colors last:border-0 hover:bg-canvas">
                {columns.map((c, j) => (
                  <td key={c.header || j} className={`px-3 py-3.5 align-middle first:whitespace-nowrap ${c.className ?? ""}`}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map((row, i) => (
          <li key={i} className="rounded-2xl border border-line bg-surface p-4">
            <div className="mb-2 font-semibold">{first.cell(row)}</div>
            <dl className="grid grid-cols-1 gap-2 text-sm">
              {rest.map((c, j) => (
                <div key={c.header || j} className={c.header ? "grid grid-cols-[110px_1fr] items-start gap-3" : ""}>
                  {c.header && <dt className="pt-0.5 text-xs text-muted">{c.header}</dt>}
                  <dd className="min-w-0 break-words">{c.cell(row)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}

export function EmptyState({ illo, title, message, action }: { illo: IlloName; title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-line px-6 py-12 text-center">
      <Illo name={illo} size={56} />
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
  /** Highlight the count, e.g. things waiting for a decision */
  urgent?: boolean;
}

/** Chip tabs: swipe sideways on phones, wrap on wider screens. */
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
            ref={on ? (el) => el?.scrollIntoView({ block: "nearest", inline: "nearest" }) : undefined}
            onClick={() => onChange(t.id)}
            className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${on ? "border-panel bg-panel text-white" : "border-line bg-surface text-ink-2 hover:bg-surface-alt"}`}
          >
            {t.label}
            {t.count !== undefined && <span className={`rounded-full px-1.5 text-xs ${on ? "bg-white/15" : t.urgent && t.count ? "bg-brand text-white" : "bg-surface-alt"}`}>{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Filter chips that are links (for server pages that filter by the URL) */
export function FilterLinks({ items, className = "" }: { items: { label: string; href: string; active: boolean }[]; className?: string }) {
  return (
    <nav className={`no-scrollbar -mx-1 mb-4 flex min-w-0 gap-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible ${className}`}>
      {items.map((f) => (
        <Link
          key={f.href}
          href={f.href}
          aria-current={f.active ? "page" : undefined}
          className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold capitalize transition ${f.active ? "border-panel bg-panel text-white" : "border-line bg-surface text-ink-2 hover:bg-surface-alt"}`}
        >
          {f.label}
        </Link>
      ))}
    </nav>
  );
}

/** Panel that slides up from the bottom on phones and sits in the middle on wider screens. */
export function Sheet({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:p-4" onClick={onClose}>
      <div className={`max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] bg-surface p-6 sm:rounded-[28px] ${wide ? "max-w-2xl" : "max-w-lg"}`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-alt">
            <X size={17} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return <p className="mb-4 rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-sm">
      <span className="font-semibold text-ink-2">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "min-h-11 min-w-0 max-w-full rounded-2xl border border-line bg-surface px-4 py-2 text-[15px] text-ink outline-none transition placeholder:text-faint focus:border-ink focus:ring-4 focus:ring-brand/15 disabled:bg-surface-alt";
export const buttonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/30 disabled:opacity-40";
export const secondaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-surface px-5 text-sm font-semibold text-ink transition hover:bg-surface-alt";
export const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-strong disabled:opacity-40";
export const dangerButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-bad-soft px-5 text-sm font-semibold text-bad transition hover:bg-bad hover:text-white disabled:opacity-40";
