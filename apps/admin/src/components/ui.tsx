// Building blocks for the dashboard: page headers, cards, stats, tables, badges and form styles.
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@sotechy/shared";

export function PageHeader({ title, description, actions, icon: Icon }: { title: string; description?: string; actions?: ReactNode; icon?: LucideIcon }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className="mt-0.5 hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong sm:flex">
            <Icon size={22} strokeWidth={2} />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h1>
          {description && <p className="mt-1 max-w-3xl text-sm text-muted">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  description,
  actions,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(23,18,14,0.04)] ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
          <div>
            {title && <h2 className="text-[15px] font-semibold">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function StatCard({ label, value, hint, icon: Icon, tone = "neutral" }: { label: string; value: ReactNode; hint?: string; icon?: LucideIcon; tone?: "neutral" | "brand" | "good" | "warn" }) {
  const tones = {
    neutral: "bg-canvas text-ink-2",
    brand: "bg-brand-soft text-brand-strong",
    good: "bg-green-50 text-green-700",
    warn: "bg-amber-50 text-amber-700",
  } as const;
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-line bg-surface p-3.5 shadow-[0_1px_2px_rgba(23,18,14,0.04)] sm:flex-row sm:p-4">
      {Icon && (
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon size={19} />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted">{label}</p>
        <p className="mt-0.5 truncate text-lg font-semibold tracking-tight sm:text-xl">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-faint">{hint}</p>}
      </div>
    </div>
  );
}

const statusColors: Partial<Record<string, string>> = {
  pending_payment: "bg-amber-50 text-amber-800 ring-amber-200",
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  open: "bg-amber-50 text-amber-800 ring-amber-200",
  paid: "bg-sky-50 text-sky-800 ring-sky-200",
  confirmed: "bg-green-50 text-green-800 ring-green-200",
  processing: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  ready_for_pickup: "bg-violet-50 text-violet-800 ring-violet-200",
  dispatched: "bg-violet-50 text-violet-800 ring-violet-200",
  delivered: "bg-green-50 text-green-800 ring-green-200",
  resolved: "bg-green-50 text-green-800 ring-green-200",
  received: "bg-green-50 text-green-800 ring-green-200",
  cancelled: "bg-neutral-100 text-neutral-600 ring-neutral-200",
  closed: "bg-neutral-100 text-neutral-600 ring-neutral-200",
  expired: "bg-neutral-100 text-neutral-600 ring-neutral-200",
  payment_failed: "bg-red-50 text-red-800 ring-red-200",
  failed: "bg-red-50 text-red-800 ring-red-200",
  refunded: "bg-red-50 text-red-800 ring-red-200",
};

export function StatusBadge({ status }: { status: string }) {
  const label = ORDER_STATUS_LABELS[status as OrderStatus] ?? status.replace(/_/g, " ");
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${statusColors[status] ?? "bg-neutral-100 text-neutral-700 ring-neutral-200"}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
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
    return <p className="rounded-xl border border-dashed border-line py-10 text-center text-sm text-muted">{empty}</p>;
  }
  const [first, ...rest] = columns;
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line">
              {columns.map((c) => (
                <th key={c.header} className={`whitespace-nowrap px-3 pb-2.5 text-xs font-medium text-muted ${c.className ?? ""}`}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-line/70 transition-colors last:border-0 hover:bg-canvas/70">
                {columns.map((c) => (
                  <td key={c.header} className={`px-3 py-3 align-top ${c.className ?? ""}`}>
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
          <li key={i} className="rounded-xl border border-line bg-surface p-3.5">
            <div className="mb-2 text-sm font-medium">{first.cell(row)}</div>
            <dl className="grid grid-cols-1 gap-2 text-sm">
              {rest.map((c) => (
                <div key={c.header} className={c.header ? "grid grid-cols-[110px_1fr] items-start gap-3" : ""}>
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

export function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-sm">
      <span className="text-[13px] font-medium text-ink-2">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "min-h-10 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition placeholder:text-faint focus:border-brand focus:ring-4 focus:ring-brand/15 disabled:bg-canvas";
export const buttonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-medium text-white shadow-sm transition hover:bg-ink-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/30 disabled:opacity-50";
export const secondaryButtonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-medium text-ink transition hover:bg-canvas";
export const primaryButtonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-strong disabled:opacity-50";
