import { ArrowRight, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { formatNaira, ORDER_STATUS_LABELS } from "@sotechy/shared";
import { Illo } from "@/components/illustrations";
import { fromApiOrder, OrderList, type OrderRowView } from "@/components/order-list";
import { Card, ErrorNote, FilterLinks, PageHeader, Pill } from "@/components/ui";
import { UrlSearch, UrlSelect } from "@/components/url-controls";
import { load } from "@/lib/api";
import type { AdminOrderRow } from "@/lib/types";
import type { CaseKind, OrderCase } from "../order-reviews/order-reviews";

const CASE_KIND: Record<CaseKind, { label: string; tone: "warn" | "info" | "bad"; illo: "box" | "bike" | "bank" }> = {
  not_accepted: { label: "Not accepted in 24h", tone: "warn", illo: "box" },
  not_confirmed: { label: "Not delivered in 7 days", tone: "info", illo: "bike" },
  payback: { label: "Store owes it back", tone: "bad", illo: "bank" },
};

type Params = { status?: string; channel?: string; seller?: string; sort?: string; q?: string };

const SORTS: Record<string, (a: OrderRowView, b: OrderRowView) => number> = {
  newest: (a, b) => b.at.localeCompare(a.at),
  oldest: (a, b) => a.at.localeCompare(b.at),
  high: (a, b) => b.total - a.total,
  low: (a, b) => a.total - b.total,
};

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { status, channel, seller = "all", sort = "newest", q } = await searchParams;
  const qs = new URLSearchParams();
  if (status) qs.set("status", status);
  if (channel) qs.set("channel", channel);
  const [{ data, error }, cases] = await Promise.all([load<AdminOrderRow[]>(`/admin/orders?${qs}`), load<OrderCase[]>("/admin/order-cases")]);
  const orderCases = cases.data ?? [];

  // Sotechy's own orders and every store's come back together; the seller switch narrows them
  const term = q?.toLowerCase();
  const rows = (data ?? [])
    .filter((o) => seller === "all" || (seller === "merchants") === !!o.merchantId)
    .map(fromApiOrder)
    .filter((r) => !term || `${r.number} ${r.customer} ${r.merchant?.name ?? "sotechy"}`.toLowerCase().includes(term))
    .sort(SORTS[sort] ?? SORTS.newest);

  const statusOptions = Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({ value, label }));
  const sellerHref = (s: string) => {
    const next = new URLSearchParams();
    if (s !== "all") next.set("seller", s);
    if (sort !== "newest") next.set("sort", sort);
    const str = next.toString();
    return str ? `/orders?${str}` : "/orders";
  };

  return (
    <>
      <PageHeader
        icon={ShoppingBag}
        title="Orders"
        description="Sotechy's own orders and every merchant's, in one list."
        actions={
          <Suspense>
            <UrlSearch placeholder="Order number, customer or seller" />
          </Suspense>
        }
      />

      {/* Orders that need Sotechy come first */}
      {orderCases.length > 0 && (
        <section className="mb-6 rounded-3xl border border-brand/40 bg-brand-soft/40 p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Illo name="shield" size={26} /> Needs Sotechy
            </h2>
            <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-white">{orderCases.length}</span>
            <Link href="/order-reviews" className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-brand-strong hover:underline">
              See all <ArrowRight size={15} />
            </Link>
          </div>
          <ul className="grid grid-cols-1 gap-2 lg:grid-cols-3">
            {orderCases.slice(0, 3).map((c) => (
              <li key={c.id}>
                <Link href="/order-reviews" className="flex items-center gap-3 rounded-2xl bg-surface p-3 transition hover:shadow-[0_6px_18px_rgba(23,18,14,0.06)]">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft">
                    <Illo name={CASE_KIND[c.kind].illo} size={24} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="font-semibold">{c.order}</span>
                      <span className="ml-auto font-display text-sm font-bold">{formatNaira(c.total)}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <Pill tone={CASE_KIND[c.kind].tone}>{CASE_KIND[c.kind].label}</Pill>
                      <span className="truncate text-xs text-muted">{c.merchant}</span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <FilterLinks
        className="mb-3"
        items={[
          { label: "All orders", href: sellerHref("all"), active: seller === "all" },
          { label: "Sotechy store", href: sellerHref("sotechy"), active: seller === "sotechy" },
          { label: "Other stores", href: sellerHref("merchants"), active: seller === "merchants" },
        ]}
      />
      <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap">
        <Suspense>
          <UrlSelect param="status" label="Status" options={[{ value: "", label: "Any" }, ...statusOptions]} />
          {seller !== "merchants" && (
            <UrlSelect
              param="channel"
              label="Where"
              options={[
                { value: "", label: "Anywhere" },
                { value: "online", label: "App" },
                { value: "in_store", label: "In store" },
              ]}
            />
          )}
          <UrlSelect
            param="sort"
            label="Sort"
            options={[
              { value: "newest", label: "Newest first" },
              { value: "oldest", label: "Oldest first" },
              { value: "high", label: "Highest total" },
              { value: "low", label: "Lowest total" },
            ]}
          />
        </Suspense>
      </div>

      <Card>
        <ErrorNote error={error} />
        <p className="mb-3 text-sm text-muted">
          {rows.length} order{rows.length === 1 ? "" : "s"}
        </p>
        <OrderList rows={rows} empty="No orders match. Try another filter." />
      </Card>
    </>
  );
}
