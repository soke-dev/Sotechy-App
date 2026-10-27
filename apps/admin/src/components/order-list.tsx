// One list for Sotechy's own orders (from the API) and marketplace merchants' orders.
// A table on wide screens; on phones each order is a three-line card. The seller badge tells them apart.
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatNaira, ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, type OrderStatus } from "@sotechy/shared";
import { Pill, toneForStatus, type Tone } from "./ui";
import type { AdminOrderRow } from "@/lib/types";

/** The marketplace store that sold an order; null for Sotechy's own */
export interface Seller {
  id: string;
  name: string;
  ticker: string;
}

export interface OrderRowView {
  key: string;
  number: string;
  href: string;
  merchant: Seller | null;
  status: { label: string; tone: Tone };
  customer: string;
  where: string;
  money: string;
  total: number;
  at: string;
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export function fromApiOrder(o: AdminOrderRow): OrderRowView {
  return {
    key: o.id,
    number: o.orderNumber,
    href: `/orders/${o.id}`,
    merchant: o.merchantId && o.storeName ? { id: o.merchantId, name: o.storeName, ticker: o.storeTicker ?? "" } : null,
    status: { label: ORDER_STATUS_LABELS[o.status as OrderStatus] ?? o.status, tone: toneForStatus(o.status) },
    customer: o.customerName ?? o.walkInCustomer?.name ?? o.customerEmail ?? "Walk-in",
    where: `${o.channel === "online" ? "App" : "In store"} · ${cap(o.fulfilmentType)}`,
    money: PAYMENT_METHOD_LABELS[o.paymentMethod] ?? o.paymentMethod,
    total: o.total,
    at: o.createdAt,
  };
}

const shortDate = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" }).format(new Date(iso));

/** Orange Sotechy mark for Sotechy's own orders; the merchant's initials on grey for theirs */
export function SellerBadge({ merchant, size = 32 }: { merchant: Seller | null; size?: number }) {
  if (!merchant)
    return (
      <span className="flex shrink-0 items-center justify-center rounded-xl bg-brand" style={{ width: size, height: size }} title="Sotechy store">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/sotechy-icon-512.png" alt="" className="h-[70%] w-[70%] object-contain" />
      </span>
    );
  const letters = merchant.name
    .split(/\s+/)
    .filter((w) => /[a-z]/i.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  return (
    <span className="font-display flex shrink-0 items-center justify-center rounded-xl bg-ink-2 font-extrabold text-white" style={{ width: size, height: size, fontSize: size * 0.36 }} title={merchant.name}>
      {letters}
    </span>
  );
}

function SellerName({ merchant }: { merchant: Seller | null }) {
  return merchant ? (
    <span>
      {merchant.name} <span className="font-semibold text-brand-strong">${merchant.ticker}</span>
    </span>
  ) : (
    <span className="font-semibold text-brand-strong">Sotechy store</span>
  );
}

export function OrderList({ rows, empty = "No orders here yet." }: { rows: OrderRowView[]; empty?: string }) {
  if (rows.length === 0) return <p className="rounded-3xl border-2 border-dashed border-line py-10 text-center text-sm text-muted">{empty}</p>;
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs font-semibold uppercase tracking-wide text-muted">
              {["Order", "Seller", "Status", "Customer", "How", "Payment / payout", "Total", "Date", ""].map((h, i) => (
                <th key={i} className="whitespace-nowrap bg-surface-alt px-3 py-2.5 first:rounded-l-xl last:rounded-r-xl">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="relative cursor-pointer border-b border-line/70 transition-colors last:border-0 hover:bg-canvas">
                <td className="px-3 py-3">
                  {/* Covers the row, so a click anywhere opens the order */}
                  <Link href={r.href} className="absolute inset-0" aria-label={`Open ${r.number}`} />
                  <span className="flex items-center gap-2.5 whitespace-nowrap font-semibold">
                    <SellerBadge merchant={r.merchant} size={30} />
                    {r.number}
                  </span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap"><SellerName merchant={r.merchant} /></td>
                <td className="px-3 py-3"><Pill tone={r.status.tone}>{r.status.label}</Pill></td>
                <td className="px-3 py-3">{r.customer}</td>
                <td className="whitespace-nowrap px-3 py-3 text-ink-2">{r.where}</td>
                <td className="px-3 py-3 text-ink-2">{r.money}</td>
                <td className="whitespace-nowrap px-3 py-3 font-semibold">{formatNaira(r.total)}</td>
                <td className="whitespace-nowrap px-3 py-3 text-muted">{shortDate(r.at)}</td>
                <td className="pr-2"><ChevronRight size={16} className="text-faint" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phones: three lines per order */}
      <ul className="flex flex-col gap-2 md:hidden">
        {rows.map((r) => (
          <li key={r.key}>
            <Link href={r.href} className={`flex gap-3 rounded-2xl border bg-surface p-3 ${r.merchant ? "border-line" : "border-brand/25"}`}>
              <SellerBadge merchant={r.merchant} size={36} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-center gap-2">
                  <span className="font-semibold">{r.number}</span>
                  <span className="ml-auto">
                    <Pill tone={r.status.tone}>{r.status.label}</Pill>
                  </span>
                </span>
                <span className="flex items-baseline gap-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">
                    {r.customer} <span className="text-muted">· {r.where}</span>
                  </span>
                  <span className="font-display shrink-0 font-bold">{formatNaira(r.total)}</span>
                </span>
                <span className="truncate text-xs text-muted">
                  <SellerName merchant={r.merchant} /> · {r.money} · {shortDate(r.at)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
