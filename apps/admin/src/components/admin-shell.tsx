"use client";

import { ChevronRight, LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Nav, useCurrentPage } from "./nav";

interface ShellUser {
  name: string;
  email: string;
  role: string;
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/light-logo-small.png" alt="SoTechy" className="h-9" />
      <span className="rounded-md bg-ink px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">Admin</span>
    </Link>
  );
}

function Initials({ name }: { name: string }) {
  const letters = name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">{letters || "S"}</span>;
}

/** Sidebar content: logo, navigation, and the signed-in person with sign out. */
function Sidebar({ user, signOut, onNavigate }: { user: ShellUser; signOut: (formData: FormData) => void; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="py-5">
        <Logo />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6">
        <Nav onNavigate={onNavigate} />
      </div>
      <div className="border-t border-line p-3">
        <div className="flex items-center gap-3 rounded-xl p-2">
          <Initials name={user.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.role}</p>
          </div>
          <form action={signOut}>
            <button title="Sign out" aria-label="Sign out" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-canvas hover:text-ink">
              <LogOut size={17} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function AdminShell({ user, signOut, children }: { user: ShellUser; signOut: (formData: FormData) => void; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const page = useCurrentPage();

  // Close the phone menu after navigating, and stop the page scrolling behind it.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-surface lg:block">
        <Sidebar user={user} signOut={signOut} />
      </aside>

      {/* Phone / tablet drawer */}
      <div className={`fixed inset-0 z-40 lg:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
        <div className={`absolute inset-0 bg-ink/40 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} onClick={() => setOpen(false)} />
        <aside className={`absolute inset-y-0 left-0 w-[min(18rem,85vw)] bg-surface shadow-2xl transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"}`}>
          <button onClick={() => setOpen(false)} aria-label="Close menu" className="absolute right-3 top-5 flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-canvas">
            <X size={18} />
          </button>
          <Sidebar user={user} signOut={signOut} onNavigate={() => setOpen(false)} />
        </aside>
      </div>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur sm:px-6 lg:px-8">
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface text-ink lg:hidden">
            <Menu size={19} />
          </button>
          {page ? (
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="hidden text-muted sm:inline">{page.section}</span>
              <ChevronRight size={14} className="hidden text-faint sm:inline" />
              <page.icon size={16} className="shrink-0 text-brand-strong" />
              <span className="truncate font-medium">{page.label}</span>
            </div>
          ) : (
            <span className="text-sm font-medium">Sotechy Admin</span>
          )}
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{user.name}</p>
              <p className="text-xs leading-tight text-muted">{user.role}</p>
            </div>
            <Initials name={user.name} />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
