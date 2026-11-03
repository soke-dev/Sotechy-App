"use client";

import { ArrowDownUp, Bell, ChevronRight, MapPin, Phone, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { RelTime } from "@/components/rel-time";
import { EmptyState, PageHeader, Pill, StatCard } from "@/components/ui";
import { Sheet } from "@/components/zone-form";
import { formatNaira, formatTokens } from "@/lib/money";
import { ORDER_STATUS, type Order } from "@/lib/mock";
import { useAccount } from "@/components/account-context";

/** Customers who follow the store; following comes with the marketplace backend */
const SUBSCRIBERS = 0;

interface Customer {
  name: string;
  username: string;
  phone: string;
  addresses: string[];
  orders: Order[];
  spent: number;
  last: string;
  tokens: number;
  subscribed: boolean;
  reviews: number;
  since: string;
}

/** One entry per person, built from the orders they placed with this store */
const customersFrom = (orders: Order[], following: Set<string>): Customer[] =>
  Object.values(
    orders.reduce<Record<string, Order[]>>((m, o) => {
      const key = o.customer.username || o.customer.phone || o.customer.name;
      return { ...m, [key]: [...(m[key] ?? []), o] };
    }, {}),
  ).map((list) => {
  const c = list[0].customer;
  // Tokens and reviews per customer come with the token contract; following is real
  const extra = { tokens: 0, subscribed: following.has(c.username), reviews: 0, since: list.map((o) => o.createdAt).sort()[0] };
  return {
    name: c.name,
    username: c.username,
    phone: c.phone,
    addresses: [...new Set(list.filter((o) => o.fulfilment === "delivery").map((o) => o.customer.address))],
    orders: [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    spent: list.filter((o) => o.status !== "declined").reduce((n, o) => n + o.total, 0),
    last: list.map((o) => o.createdAt).sort().reverse()[0],
    ...extra,
  };
});

const SORTS = {
  spent: { label: "Most spent", fn: (a: Customer, b: Customer) => b.spent - a.spent },
  recent: { label: "Most recent", fn: (a: Customer, b: Customer) => b.last.localeCompare(a.last) },
  orders: { label: "Most orders", fn: (a: Customer, b: Customer) => b.orders.length - a.orders.length },
} as const;

function Initials({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <span className="font-display flex shrink-0 items-center justify-center rounded-2xl bg-brand-soft font-extrabold text-brand-strong" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)}
    </span>
  );
}

export function CustomersView({ orders, following = [] }: { orders: Order[]; following?: string[] }) {
  const { store } = useAccount();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<keyof typeof SORTS>("spent");
  const [open, setOpen] = useState<Customer | null>(null);
  const customers = customersFrom(orders, new Set(following));
  const term = q.trim().toLowerCase();
  const shown = customers.filter((c) => !term || `${c.name} ${c.username} ${c.phone}`.toLowerCase().includes(term)).sort(SORTS[sort].fn);
  const repeat = customers.filter((c) => c.orders.length > 1).length;
  const sorts = Object.keys(SORTS) as (keyof typeof SORTS)[];

  return (
    <>
      <PageHeader
        illo="user"
        title="Customers"
        description="Everyone who has ordered from you. Use their details only to deliver and support their orders."
        actions={
          <label className="flex h-11 w-full items-center gap-2 rounded-full border border-line bg-surface px-4 focus-within:border-ink sm:w-72">
            <Search size={16} className="text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customers" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </label>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard accent illo="user" label="Customers" value={customers.length} hint="Ordered at least once" />
        <StatCard illo="heart" label="Came back" value={repeat} hint={`${Math.round((repeat / Math.max(1, customers.length)) * 100)}% ordered again`} />
        <StatCard illo="chat" label="Get your updates" value={SUBSCRIBERS.toLocaleString()} hint="Subscribed in the app" />
        <StatCard illo="coin" label={`Hold $${store.ticker}`} value={customers.filter((c) => c.tokens > 0).length} hint="Can spend it with you" />
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">{shown.length} customers</p>
        <button onClick={() => setSort(sorts[(sorts.indexOf(sort) + 1) % sorts.length])} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
          <ArrowDownUp size={15} /> {SORTS[sort].label}
        </button>
      </div>

      {shown.length === 0 ? (
        <EmptyState illo="user" title="No one matches" message="Try a name, @username or phone number." />
      ) : (
        <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          {shown.map((c) => (
            <li key={c.username} className="min-w-0">
              <button onClick={() => setOpen(c)} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 text-left transition hover:shadow-[0_8px_24px_rgba(23,18,14,0.06)]">
                <Initials name={c.name} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-semibold">{c.name}</span>
                    {c.subscribed && <Bell size={13} className="shrink-0 text-brand-strong" aria-label="Gets your updates" />}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    @{c.username} · {c.orders.length} order{c.orders.length === 1 ? "" : "s"} · last <RelTime iso={c.last} />
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="font-display block font-bold">{formatNaira(c.spent)}</span>
                  {c.tokens > 0 && <span className="block text-xs font-semibold text-brand-strong">{formatTokens(c.tokens)} ${store.ticker}</span>}
                </span>
                <ChevronRight size={16} className="shrink-0 text-faint" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={open !== null} onClose={() => setOpen(null)} title={open?.name ?? ""}>
        {open && (
          <div className="flex flex-col gap-4 text-sm">
            <div className="flex items-center gap-3">
              <Initials name={open.name} size={56} />
              <div>
                <p className="font-semibold">@{open.username}</p>
                <p className="text-muted">
                  Customer since <RelTime iso={open.since} />
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {open.subscribed ? <Pill tone="brand">Follows your store</Pill> : <Pill tone="neutral">Doesn&apos;t follow you</Pill>}
                  {open.reviews > 0 && <Pill tone="good">{open.reviews} review{open.reviews === 1 ? "" : "s"}</Pill>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-2xl bg-surface-alt p-3 text-center">
              <div>
                <p className="font-display text-lg font-bold">{open.orders.length}</p>
                <p className="text-xs text-muted">Orders</p>
              </div>
              <div>
                <p className="font-display text-lg font-bold">{formatNaira(open.spent)}</p>
                <p className="text-xs text-muted">Spent</p>
              </div>
              <div>
                <p className="font-display text-lg font-bold text-brand-strong">{formatTokens(open.tokens)}</p>
                <p className="text-xs text-muted">${store.ticker} held</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Contact</p>
              <a href={`tel:${open.phone.replace(/\s/g, "")}`} className="flex items-center gap-2 font-semibold hover:text-brand-strong">
                <Phone size={15} className="text-muted" /> {open.phone}
              </a>
              {open.addresses.map((a) => (
                <p key={a} className="flex items-start gap-2">
                  <MapPin size={15} className="mt-0.5 shrink-0 text-muted" /> {a}
                </p>
              ))}
              {open.addresses.length === 0 && <p className="text-muted">Picks up at your shop</p>}
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Orders</p>
              <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line">
                {open.orders.map((o) => (
                  <li key={o.id}>
                    <Link href={`/orders/${o.id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-alt">
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{o.number}</span>
                        <span className="block truncate text-xs text-muted">
                          {o.items.map((i) => i.name).join(", ")} · <RelTime iso={o.createdAt} />
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="block font-semibold">{formatNaira(o.total)}</span>
                        <Pill tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Pill>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <p className="flex items-start gap-2 rounded-2xl bg-surface-alt px-3 py-2.5 text-xs text-muted">
              <ShieldCheck size={15} className="mt-0.5 shrink-0" />
              Customer details are for delivering and supporting their orders only. Sotechy may close stores that misuse them.
            </p>
          </div>
        )}
      </Sheet>
    </>
  );
}
