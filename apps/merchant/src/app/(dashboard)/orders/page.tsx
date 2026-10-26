"use client";

import { Clock, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { EmptyState, inputClass, PageHeader, Pill, ProductThumb } from "@/components/ui";
import { RelTime } from "@/components/rel-time";
import { formatNaira } from "@/lib/money";
import { ORDER_STATUS, orders, orderTotal, type Order } from "@/lib/mock";

const TABS: { id: string; label: string; match: (o: Order) => boolean }[] = [
  { id: "new", label: "Needs answer", match: (o) => o.status === "new" },
  { id: "active", label: "In progress", match: (o) => o.status === "accepted" || o.status === "shipped" },
  { id: "delivered", label: "Awaiting customer", match: (o) => o.status === "delivered" },
  { id: "done", label: "Completed", match: (o) => o.status === "completed" },
  { id: "issues", label: "Issues", match: (o) => o.status === "payback" || o.status === "declined" },
  { id: "all", label: "All", match: () => true },
];

export default function OrdersPage() {
  const [tab, setTab] = useState("new");
  const [q, setQ] = useState("");
  const current = TABS.find((t) => t.id === tab)!;
  const term = q.trim().toLowerCase();
  const list = orders.filter(current.match).filter((o) => !term || `${o.number} ${o.customer.name} ${o.customer.username} ${o.items.map((i) => i.name).join(" ")}`.toLowerCase().includes(term));

  return (
    <>
      <PageHeader illo="box" title="Orders" description="Accept new orders within 24 hours. You're paid 50% when you accept and 50% when the customer confirms delivery." />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start">
        <div className="no-scrollbar -mx-1 flex min-w-0 gap-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible lg:flex-1">
          {TABS.map((t) => {
            const n = orders.filter(t.match).length;
            const on = t.id === tab;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${on ? "border-panel bg-panel text-white" : "border-line bg-surface text-ink-2 hover:bg-surface-alt"}`}
              >
                {t.label}
                <span className={`rounded-full px-1.5 text-xs ${on ? "bg-white/15" : t.id === "new" && n ? "bg-brand text-white" : "bg-surface-alt"}`}>{n}</span>
              </button>
            );
          })}
        </div>
        <div className="relative lg:w-72 lg:shrink-0">
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search orders" className={`${inputClass} pl-11`} />
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState illo="box" title="Nothing here" message={tab === "new" ? "No orders waiting for your answer. New orders also arrive by email." : "No orders match."} />
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((o) => (
            <li key={o.id}>
              <Link
                href={`/orders/${o.id}`}
                className={`flex flex-col gap-3 rounded-3xl border bg-surface p-4 transition hover:shadow-[0_8px_24px_rgba(23,18,14,0.06)] sm:flex-row sm:items-center ${o.status === "new" ? "border-brand/50" : "border-line"}`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div className="flex -space-x-3">
                    {o.items.slice(0, 2).map((i) => (
                      <span key={i.name} className="rounded-2xl ring-4 ring-surface">
                        <ProductThumb src={i.image} size={52} />
                      </span>
                    ))}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</p>
                    <p className="text-sm text-muted">
                      {o.number} · @{o.customer.username} · {o.fulfilment === "pickup" ? "Pickup" : "Delivery"} · <RelTime iso={o.createdAt} />
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  {o.status === "new" ? (
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-strong">
                      <Clock size={14} /> <RelTime iso={o.acceptBy!} left />
                    </span>
                  ) : (
                    <Pill tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Pill>
                  )}
                  <span className="font-display text-lg font-bold">{formatNaira(orderTotal(o))}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
