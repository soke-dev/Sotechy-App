"use client";

import type { StoreRole } from "@sotechy/shared";
import { roleSees } from "@/lib/roles";
import { ExternalLink, Headset, LogOut, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Illo, type IlloName } from "./illustrations";
import { ThemeToggle } from "./theme-toggle";
import { TopBar } from "./top-bar";
import { signOut } from "@/lib/session-actions";

interface NavItem {
  href: string;
  label: string;
  illo: IlloName;
  badge?: number;
}

export interface ShellStore {
  name: string;
  /** null until Sotechy approves the store's token */
  ticker: string | null;
  /** The store's logo, or the owner's profile picture; initials when there's neither */
  logo?: string | null;
  verified: boolean;
  /** Paused by Sotechy */
  paused?: boolean;
  /** Sotechy asked for changes, or declined the store */
  review?: { note: string; declined: boolean } | null;
  newOrders: number;
  /** Price offers waiting for an answer */
  offersWaiting: number;
  /** Payouts on their way to the store */
  balance: number;
  /** How the signed-in person runs the store; the menu shows what their role can open */
  access: StoreRole;
}

const items = (s: ShellStore): NavItem[][] => [
  [
    { href: "/", label: "Home", illo: "home" },
    { href: "/orders", label: "Orders", illo: "box", badge: s.newOrders },
    { href: "/offers", label: "Offers", illo: "tag", badge: s.offersWaiting },
    { href: "/promotions", label: "Promo codes", illo: "sparkle" },
    { href: "/customers", label: "Customers", illo: "user" },
    { href: "/products", label: "Products", illo: "bag" },
    { href: "/storefront", label: "Storefront", illo: "store" },
    { href: "/delivery", label: "Delivery", illo: "bike" },
  ],
  [
    { href: "/token", label: s.ticker ? `$${s.ticker} token` : "Store token", illo: "coin" },
    { href: "/walk-in", label: "Walk-in sale", illo: "receipt" },
    { href: "/payouts", label: "Payouts", illo: "bank" },
    { href: "/reviews", label: "Reviews", illo: "heart" },
    { href: "/notifications", label: "Notifications", illo: "chat" },
    { href: "/featured", label: "Get featured", illo: "sparkle" },
  ],
  [
    { href: "/team", label: "Team", illo: "user" },
    { href: "/settings", label: "Settings", illo: "shield" },
  ],
];

export interface ShellUser {
  name: string;
  role: string;
  avatar?: string | null;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const isActive = (href: string, path: string) => (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`));

function StoreCard({ store }: { store: ShellStore }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-panel p-3 text-white">
      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand">
        {store.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={store.logo} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
        ) : (
          <span className="font-display text-base font-extrabold">{initials(store.name)}</span>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display truncate text-[15px] font-bold">{store.name}</p>
        <p className="flex items-center gap-1.5 text-xs text-white/60">
          <span className={`h-1.5 w-1.5 rounded-full ${store.verified ? "bg-green-400" : "bg-amber-400"}`} />
          {store.verified ? "Verified · live" : store.paused ? "Paused" : store.review?.declined ? "Not approved" : store.review ? "Changes requested" : "Awaiting verification"}
        </p>
      </div>
    </div>
  );
}

function NavList({ store, onNavigate }: { store: ShellStore; onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav className="flex flex-col gap-4">
      {items(store)
        .map((group) => group.filter((item) => roleSees(store.access, item.href)))
        .filter((group) => group.length > 0)
        .map((group, i) => (
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
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${active ? "bg-surface shadow-sm" : ""}`}>
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

/** Sotechy's official WhatsApp */
const SOTECHY_WHATSAPP = "2348071473936";

function Sidebar({ store, user, onNavigate }: { store: ShellStore; user: ShellUser; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      {/* In the phone drawer, room is left on the right for its close button */}
      <div className={`flex items-center gap-2 px-5 pb-4 pt-6 ${onNavigate ? "pr-14" : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/light-logo-small.png" alt="SoTechy" className="h-8" />
        <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-strong">Merchant</span>
        {/* Help from Sotechy on WhatsApp, with the store named */}
        <a
          href={`https://wa.me/${SOTECHY_WHATSAPP}?text=${encodeURIComponent(`Hi Sotechy, I need help with my store, ${store.name}.`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-surface-alt px-3 py-1.5 text-xs font-semibold text-ink-2 hover:bg-line hover:text-ink"
        >
          <Headset size={14} /> Support
        </a>
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
          {user.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar} alt="" referrerPolicy="no-referrer" className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">{initials(user.name)}</span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="text-xs text-muted">{user.role}</p>
          </div>
          <ThemeToggle />
          <form action={signOut}>
            <button aria-label="Sign out" title="Sign out" className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-alt">
              <LogOut size={17} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/** Phone tab bar, like the customer app. */
function TabBar({ store, onMore }: { store: ShellStore; onMore: () => void }) {
  const path = usePathname();
  const all: NavItem[] = [
    { href: "/", label: "Home", illo: "home" },
    { href: "/orders", label: "Orders", illo: "box", badge: store.newOrders },
    { href: "/products", label: "Products", illo: "bag" },
    { href: "/token", label: store.ticker ? `$${store.ticker}` : "Token", illo: "coin" },
  ];
  const tabs = all.filter((t) => roleSees(store.access, t.href));
  return (
    <nav className="fixed inset-x-3 bottom-3 z-30 flex items-stretch rounded-2xl border border-line bg-surface px-1 py-1.5 shadow-[0_12px_32px_rgba(23,18,14,0.14)] [transform:translateZ(0)] [will-change:transform] lg:hidden">
      {tabs.map((t) => {
        const active = isActive(t.href, path);
        return (
          <Link key={t.href} href={t.href} className="relative flex flex-1 flex-col items-center gap-0.5 py-1">
            <span className={`flex h-9 w-12 items-center justify-center rounded-2xl transition ${active ? "bg-brand-soft" : "opacity-55"}`}>
              <Illo name={t.illo} size={26} />
            </span>
            <span className={`text-[11px] ${active ? "font-bold text-ink" : "text-muted"}`}>{t.label}</span>
            {t.badge ? <span className="absolute right-[18%] top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">{t.badge}</span> : null}
          </Link>
        );
      })}
      <button onClick={onMore} className="flex flex-1 flex-col items-center gap-0.5 py-1">
        <span className="flex h-9 w-12 items-center justify-center rounded-2xl opacity-55">
          <Illo name="sparkle" size={26} />
        </span>
        <span className="text-[11px] text-muted">More</span>
      </button>
    </nav>
  );
}

export function MerchantShell({ store, user, children }: { store: ShellStore; user: ShellUser; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  // Close the drawer when the page changes
  const [shownPath, setShownPath] = useState(path);
  if (path !== shownPath) {
    setShownPath(path);
    setOpen(false);
  }

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-line bg-surface lg:block">
        <Sidebar store={store} user={user} />
      </aside>

      <div className={`fixed inset-0 z-40 lg:hidden ${open ? "" : "pointer-events-none"}`}>
        <div className={`absolute inset-0 bg-black/50 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} onClick={() => setOpen(false)} />
        <aside className={`absolute inset-y-0 left-0 w-[min(19rem,88vw)] bg-surface shadow-2xl transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"}`}>
          <button onClick={() => setOpen(false)} aria-label="Close menu" className="absolute right-3 top-5 flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-alt">
            <X size={18} />
          </button>
          <Sidebar store={store} user={user} onNavigate={() => setOpen(false)} />
        </aside>
      </div>

      <div className="min-w-0 lg:pl-72">
        <TopBar storeName={store.name} balance={store.balance} newOrders={store.newOrders} offersWaiting={store.offersWaiting} user={user} />
        {!store.verified && (
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-warn-soft px-4 py-2.5 text-center text-sm text-warn">
            {store.paused ? (
              <span>
                <b>Your store is paused.</b> Email support@sotechy.shop and we&apos;ll help you sort it out.
              </span>
            ) : store.review?.declined ? (
              <>
                <span>
                  <b>Your store wasn&apos;t approved.</b> {store.review.note}
                </span>
                <Link href="/onboarding" className="font-semibold underline">See details</Link>
              </>
            ) : store.review ? (
              <>
                <span className="max-w-3xl">
                  <b>Sotechy asked for a few changes.</b> {store.review.note.length > 140 ? `${store.review.note.slice(0, 140)}…` : store.review.note}
                </span>
                <Link href="/onboarding" className="font-semibold underline">Make the changes</Link>
              </>
            ) : (
              <>
                <span>
                  <b>Waiting for verification.</b> Look around and get your store ready. Adding products and taking orders unlock once Sotechy approves you.
                </span>
                <Link href="/onboarding" className="font-semibold underline">Finish setup</Link>
              </>
            )}
          </div>
        )}
        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">{children}</main>
      </div>

      <TabBar store={store} onMore={() => setOpen(true)} />
    </div>
  );
}
