// Rough, unstyled-ish building blocks for the dashboard. Polish later.
import type { ReactNode } from "react";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@sotechy/shared";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Card({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-neutral-200 bg-white p-4 ${className}`}>
      {title && <h2 className="mb-3 font-medium">{title}</h2>}
      {children}
    </section>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-neutral-400">{hint}</p>}
    </div>
  );
}

const statusColors: Partial<Record<string, string>> = {
  pending_payment: "bg-amber-100 text-amber-800",
  pending: "bg-amber-100 text-amber-800",
  paid: "bg-blue-100 text-blue-800",
  confirmed: "bg-green-100 text-green-800",
  processing: "bg-indigo-100 text-indigo-800",
  ready_for_pickup: "bg-purple-100 text-purple-800",
  dispatched: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-neutral-200 text-neutral-700",
  expired: "bg-neutral-200 text-neutral-700",
  payment_failed: "bg-red-100 text-red-800",
  failed: "bg-red-100 text-red-800",
  refunded: "bg-red-100 text-red-800",
};

export function StatusBadge({ status }: { status: string }) {
  const label = ORDER_STATUS_LABELS[status as OrderStatus] ?? status.replace(/_/g, " ");
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusColors[status] ?? "bg-neutral-100 text-neutral-700"}`}>{label}</span>;
}

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

export function DataTable<T>({ rows, columns, empty = "Nothing here yet" }: { rows: T[]; columns: Column<T>[]; empty?: string }) {
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-neutral-500">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-neutral-200 text-xs uppercase text-neutral-500">
          <tr>
            {columns.map((c) => (
              <th key={c.header} className={`px-3 py-2 font-medium ${c.className ?? ""}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
              {columns.map((c) => (
                <td key={c.header} className={`px-3 py-2 align-top ${c.className ?? ""}`}>
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return <p className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-neutral-600">{label}</span>
      {children}
    </label>
  );
}

export const inputClass = "rounded border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none";
export const buttonClass = "rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50";
export const secondaryButtonClass = "rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100";
