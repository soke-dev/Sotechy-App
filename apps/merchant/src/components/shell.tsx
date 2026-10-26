"use client";

import { ExternalLink, LogOut, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Illo, type IlloName } from "./illustrations";

interface NavItem {
  href: string;
  label: string;
  illo: IlloName;
  badge?: number;
}

export interface ShellStore {
  name: string;
  ticker: string;
  logo: string;
  verified: boolean;
  newOrders: number;
}

const items = (s: ShellStore): NavItem[][] => [
  [
    { href: "/", label: "Home", illo: "home" },
    { href: "/orders", label: "Orders", illo: "box", badge: s.newOrders },
    { href: "/products", label: "Products", illo: "bag" },
    { href: "/storefront", label: "Storefront", illo: "store" },
  ],
  [
    { href: "/token", label: `$${s.ticker} token`, illo: "coin" },
    { href: "/walk-in", label: "Walk-in sale", illo: "receipt" },
    { href: "/payouts", label: "Payouts", illo: "bank" },
    { href: "/reviews", label: "Reviews", illo: "heart" },
  ],
  [
    { href: "/team", label: "Team", illo: "user" },
    { href: "/settings", label: "Settings", illo: "shield" },
  ],
];

const isActive = (href: string, path: string) => (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`));

function StoreCard({ store }: { store: ShellStore }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-panel p-3 text-white">
      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={store.logo} alt="" className="h-9 w-9 object-contain" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display truncate text-[15px] font-bold">{store.name}</p>
        <p className="flex items-center gap-1.5 text-xs text-white/60">
          <span className={`h-1.5 w-1.5 rounded-full ${store.verified ? "bg-green-400" : "bg-amber-400"}`} />
          {store.verified ? "Verified · live" : "Test mode"}
        </p>
      </div>
    </div>
  );
}

function NavList({ store, onNavigate }: { store: ShellStore; onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav className="flex flex-col gap-4">
      {items(store).map((group, i) => (
        <div key={i} className="flex flex-col gap-0.5">
          {group.map((item) => {
            const active = isActive(item.href, path);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-[15px] transition ${active ? "bg-brand-soft font-semibold text-ink" : "text-ink-2 hover:bg-surface-alt"}`}
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${active ? "bg-white shadow-sm" : ""}`}>
                  <Illo name={item.illo} size={26} />
                </span>
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge ? <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-white">{item.badge}</span> : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function Sidebar({ store, user, onNavigate }: { store: ShellStore; user: { name: string; role: string }; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 pb-4 pt-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/light-logo-small.png" alt="SoTechy" className="h-8" />
        <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-strong">Merchant</span>
      </div>
      <div className="px-4 pb-4">
        <StoreCard store={store} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <NavList store={store} onNavigate={onNavigate} />
      </div>
      <div className="flex flex-col gap-2 border-t border-line p-4">
        <Link href="/store-preview" className="flex items-center justify-center gap-2 rounded-full bg-surface-alt px-4 py-2.5 text-sm font-semibold text-ink-2 hover:bg-line">
          View my store <ExternalLink size={15} />
        </Link>
        <div className="flex items-center gap-3 px-1 pt-1">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">{user.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="text-xs text-muted">{user.role}</p>
          </div>
          <Link href="/login" aria-label="Sign out" className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-alt">
            <LogOut size={17} />
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Phone tab bar, like the customer app. */
function TabBar({ store, onMore }: { store: ShellStore; onMore: () => void }) {
  const path = usePathname();
  const tabs: NavItem[] = [
    { href: "/", label: "Home", illo: "home" },
    { href: "/orders", label: "Orders", illo: "box", badge: store.newOrders },
    { href: "/products", label: "Products", illo: "bag" },
    { href: "/token", label: `$${store.ticker}`, illo: "coin" },
  ];
  return (
    <nav className="fixed inset-x-3 bottom-3 z-30 flex items-stretch rounded-3xl border border-line bg-surface/95 px-1 py-1.5 shadow-[0_12px_32px_rgba(23,18,14,0.14)] backdrop-blur lg:hidden">
      {tabs.map((t) => {
        const active = isActive(t.href, path);
        return (
          <Link key={t.href} href={t.href} className="relative flex flex-1 flex-col items-center gap-0.5 py-1">
            <span className={`flex h-9 w-12 items-center justify-center rounded-2xl transition ${active ? "bg-brand-soft" : "opacity-60 grayscale-[60%]"}`}>
              <Illo name={t.illo} size={26} />
            </span>
            <span className={`text-[11px] ${active ? "font-bold text-ink" : "text-muted"}`}>{t.label}</span>
            {t.badge ? <span className="absolute right-[18%] top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">{t.badge}</span> : null}
          </Link>
        );
      })}
      <button onClick={onMore} className="flex flex-1 flex-col items-center gap-0.5 py-1">
        <span className="flex h-9 w-12 items-center justify-center rounded-2xl opacity-60 grayscale-[60%]">
          <Illo name="sparkle" size={26} />
        </span>
        <span className="text-[11px] text-muted">More</span>
      </button>
    </nav>
  );
}

export function MerchantShell({ store, user, children }: { store: ShellStore; user: { name: string; role: string }; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-line bg-surface lg:block">
        <Sidebar store={store} user={user} />
      </aside>

      <div className={`fixed inset-0 z-40 lg:hidden ${open ? "" : "pointer-events-none"}`}>
        <div className={`absolute inset-0 bg-ink/40 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} onClick={() => setOpen(false)} />
        <aside className={`absolute inset-y-0 left-0 w-[min(19rem,88vw)] bg-surface shadow-2xl transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"}`}>
          <button onClick={() => setOpen(false)} aria-label="Close menu" className="absolute right-3 top-5 flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-alt">
            <X size={18} />
          </button>
          <Sidebar store={store} user={user} onNavigate={() => setOpen(false)} />
        </aside>
      </div>

      <div className="lg:pl-72">
        {!store.verified && (
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-warn-soft px-4 py-2 text-center text-sm text-warn">
            <b>Test mode.</b> Finish verification to start selling for real.
            <Link href="/onboarding" className="font-semibold underline">Continue setup</Link>
          </div>
        )}
        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">{children}</main>
      </div>

      <TabBar store={store} onMore={() => setOpen(true)} />
    </div>
  );
}
