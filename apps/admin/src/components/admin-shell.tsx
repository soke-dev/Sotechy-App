"use client";

import { ChevronRight, LogOut, Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { Illo } from "./illustrations";
import { ALL_LINKS, Nav, NAV, SectionTabs, useCurrentPage, type NavLink } from "./nav";
import { useQueue } from "./queue-context";

interface ShellUser {
  name: string;
  email: string;
  role: string;
}

function Initials({ name, className = "" }: { name: string; className?: string }) {
  const letters = name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white ${className}`}>{letters || "S"}</span>;
}

// Lagos time in the top bar, refreshed every 30 seconds (worked out in the browser only)
const STEP = 30_000;
const subscribeClock = (onChange: () => void) => {
  const t = setInterval(onChange, STEP);
  return () => clearInterval(t);
};
function LagosClock() {
  const tick = useSyncExternalStore(subscribeClock, () => Math.floor(Date.now() / STEP), () => 0);
  if (!tick) return null;
  const time = new Intl.DateTimeFormat("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" }).format(new Date(tick * STEP));
  return <span className="tabular-nums">{time} WAT</span>;
}

/** Sidebar content on the dark panel: logo, navigation, and the signed-in person with sign out. */
function Sidebar({ user, signOut, onNavigate }: { user: ShellUser; signOut: (formData: FormData) => void; onNavigate?: () => void }) {
  const queue = useQueue();
  return (
    <div className="flex h-full flex-col bg-panel text-white">
      <div className="px-5 pb-4 pt-5">
        <Link href="/" onClick={onNavigate} className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/light-logo-small.png" alt="SoTechy" className="h-9" />
          <span className="rounded-md bg-brand px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Admin</span>
        </Link>
        <div className="mt-4 rounded-2xl bg-white/5 p-3">
          <p className="flex items-center gap-2 text-xs font-semibold text-white/80">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-good opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-good" />
            </span>
            Control room
          </p>
          <p className="mt-1 text-xs text-white/50">
            {((n) => (n === 1 ? "1 thing needs" : `${n} things need`))(queue.merchants + queue.zones + queue.cases + queue.payouts + queue.refunds + queue.support)} a decision today
          </p>
        </div>
      </div>
      <div className="dark-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-6">
        <Nav onNavigate={onNavigate} />
      </div>
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-2xl p-2">
          <Initials name={user.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-white/50">{user.role}</p>
          </div>
          <form action={signOut}>
            <button title="Sign out" aria-label="Sign out" className="flex h-9 w-9 items-center justify-center rounded-xl text-white/60 transition hover:bg-white/10 hover:text-white">
              <LogOut size={17} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/** "Jump to" search over every page in the dashboard. Ctrl+K / ⌘K opens it. */
function JumpTo({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const queue = useQueue();
  const [q, setQ] = useState("");
  if (!open) return null;
  const query = q.trim().toLowerCase();
  const results = ALL_LINKS.filter((l) => !query || l.label.toLowerCase().includes(query) || l.section.toLowerCase().includes(query));
  const go = (l: NavLink) => {
    setQ("");
    onClose();
    router.push(l.href);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/40 p-4 pt-[12vh]" onClick={onClose}>
      <div className="w-full max-w-lg overflow-hidden rounded-[28px] bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <label className="flex items-center gap-3 border-b border-line px-5">
          <Search size={18} className="text-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results[0]) go(results[0]);
              if (e.key === "Escape") onClose();
            }}
            placeholder="Jump to a page: merchants, payouts, banners…"
            className="min-h-14 flex-1 bg-transparent text-[15px] outline-none"
          />
          <kbd className="hidden rounded-md border border-line px-1.5 py-0.5 text-[11px] text-muted sm:block">Esc</kbd>
        </label>
        <ul className="max-h-[50vh] overflow-y-auto p-2">
          {results.map((l, i) => (
            <li key={l.href}>
              <button onClick={() => go(l)} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left hover:bg-surface-alt ${i === 0 && query ? "bg-surface-alt" : ""}`}>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft">
                  <Illo name={l.illo} size={24} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{l.label}</span>
                  <span className="block text-xs text-muted">{l.section}</span>
                </span>
                {l.countKey && queue[l.countKey] ? <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-white">{queue[l.countKey]}</span> : null}
              </button>
            </li>
          ))}
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">No page called &ldquo;{q}&rdquo;.</li>}
        </ul>
      </div>
    </div>
  );
}

/** Phone tab bar, like the merchant dashboard and the customer app. */
function TabBar({ onMore }: { onMore: () => void }) {
  const current = useCurrentPage();
  const queue = useQueue();
  // The first four sections, each lit up for any of its pages
  const tabs = NAV.slice(0, 4).map((g) => ({
    href: g.pages[0].href,
    label: g.label === "Dashboard" ? "Home" : g.label,
    illo: g.illo,
    badge: g.pages.reduce((n, p) => n + (p.countKey ? queue[p.countKey] : 0), 0),
    group: g,
  }));
  return (
    <nav className="fixed inset-x-3 bottom-3 z-30 flex items-stretch rounded-3xl border border-white/10 bg-panel px-1 py-1.5 shadow-[0_12px_32px_rgba(23,18,14,0.3)] [transform:translateZ(0)] lg:hidden">
      {tabs.map((t) => {
        const active = current?.group === t.group;
        return (
          <Link key={t.href} href={t.href} className="relative flex flex-1 flex-col items-center gap-0.5 py-1">
            <span className={`flex h-9 w-12 items-center justify-center rounded-2xl transition ${active ? "bg-brand-soft" : "opacity-60"}`}>
              <Illo name={t.illo} size={26} />
            </span>
            <span className={`text-[11px] ${active ? "font-bold text-white" : "text-white/55"}`}>{t.label}</span>
            {t.badge ? <span className="absolute right-[18%] top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">{t.badge}</span> : null}
          </Link>
        );
      })}
      <button onClick={onMore} className="flex flex-1 flex-col items-center gap-0.5 py-1">
        <span className="flex h-9 w-12 items-center justify-center rounded-2xl opacity-60">
          <Illo name="sparkle" size={26} />
        </span>
        <span className="text-[11px] text-white/55">More</span>
      </button>
    </nav>
  );
}

export function AdminShell({ user, signOut, children }: { user: ShellUser; signOut: (formData: FormData) => void; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [jump, setJump] = useState(false);
  const pathname = usePathname();
  const page = useCurrentPage();

  // Close the phone menu after navigating
  const [shownPath, setShownPath] = useState(pathname);
  if (pathname !== shownPath) {
    setShownPath(pathname);
    setOpen(false);
  }

  // Stop the page scrolling behind the phone menu
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Ctrl+K / ⌘K opens "Jump to"
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setJump(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 lg:block">
        <Sidebar user={user} signOut={signOut} />
      </aside>

      {/* Phone / tablet drawer */}
      <div className={`fixed inset-0 z-40 lg:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
        <div className={`absolute inset-0 bg-ink/50 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} onClick={() => setOpen(false)} />
        <aside className={`absolute inset-y-0 left-0 w-[min(19rem,88vw)] shadow-2xl transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"}`}>
          <button onClick={() => setOpen(false)} aria-label="Close menu" className="absolute right-3 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-xl text-white/60 hover:bg-white/10">
            <X size={18} />
          </button>
          <Sidebar user={user} signOut={signOut} onNavigate={() => setOpen(false)} />
        </aside>
      </div>

      <div className="min-w-0 lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-canvas/90 px-4 backdrop-blur sm:px-6 lg:px-10">
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-ink lg:hidden">
            <Menu size={19} />
          </button>
          {page ? (
            <div className="flex min-w-0 items-center gap-2 text-sm">
              {page.group.label !== page.page.label && (
                <>
                  <span className="hidden text-muted md:inline">{page.group.label}</span>
                  <ChevronRight size={14} className="hidden text-faint md:inline" />
                </>
              )}
              <span className="truncate font-semibold">{page.page.label}</span>
            </div>
          ) : (
            <span className="text-sm font-semibold">Sotechy Admin</span>
          )}

          <button onClick={() => setJump(true)} className="ml-auto flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-3 text-sm text-muted transition hover:border-faint sm:min-w-56 md:px-4">
            <Search size={16} />
            <span className="hidden sm:inline">Jump to…</span>
            <kbd className="ml-auto hidden rounded-md bg-surface-alt px-1.5 py-0.5 text-[11px] font-semibold md:block">Ctrl K</kbd>
          </button>

          <div className="hidden items-center gap-2 rounded-full bg-surface px-3 py-2 text-xs font-semibold text-ink-2 ring-1 ring-line xl:flex">
            <span className="h-2 w-2 rounded-full bg-good" />
            Live · <LagosClock />
          </div>
          <Initials name={user.name} className="hidden sm:flex" />
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-4 sm:px-6 lg:px-10 lg:pb-12 lg:pt-6">
          <SectionTabs />
          {children}
        </main>
      </div>

      <TabBar onMore={() => setOpen(true)} />
      <JumpTo open={jump} onClose={() => setJump(false)} />
    </div>
  );
}
