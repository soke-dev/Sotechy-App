"use client";

// The bar across the top of the dashboard: money on its way (which can be hidden), what needs attention,
// and the account menu.
import { ChevronRight, Eye, EyeOff, LogOut } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { signOut } from "@/lib/session-actions";
import { formatNaira } from "@/lib/money";
import { Illo, type IlloName } from "./illustrations";

const HIDE_KEY = "sotechy_hide_balance";
const listeners = new Set<() => void>();
const hiddenStore = {
  subscribe: (fn: () => void) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  get: () => {
    try {
      return localStorage.getItem(HIDE_KEY) === "1";
    } catch {
      return false;
    }
  },
  set: (v: boolean) => {
    try {
      localStorage.setItem(HIDE_KEY, v ? "1" : "0");
    } catch {}
    listeners.forEach((fn) => fn());
  },
};

/** A button that opens a small panel under it, closing on an outside click */
function Popover({ button, label, children, align = "right" }: { button: ReactNode; label: string; children: (close: () => void) => ReactNode; align?: "right" | "left" }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div ref={box} className="relative">
      <button type="button" aria-label={label} aria-expanded={open} onClick={() => setOpen(!open)} className="flex items-center">
        {button}
      </button>
      {open && (
        <div className={`absolute top-full z-40 mt-2 w-72 overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_18px_40px_-18px_rgba(23,18,14,0.35)] ${align === "right" ? "right-0" : "left-0"}`}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function Row({ href, illo, title, hint, onClick }: { href: string; illo: IlloName; title: string; hint?: string; onClick: () => void }) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-surface-alt">
      <Illo name={illo} size={28} />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <ChevronRight size={15} className="text-faint" />
    </Link>
  );
}

export function TopBar({
  storeName,
  balance,
  newOrders,
  offersWaiting,
  user,
}: {
  storeName: string;
  balance: number;
  newOrders: number;
  offersWaiting: number;
  user: { name: string; role: string; avatar?: string | null };
}) {
  const hidden = useSyncExternalStore(hiddenStore.subscribe, hiddenStore.get, () => false);
  const alerts = newOrders + offersWaiting;
  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="sticky top-0 z-20 border-b border-line bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:px-6 lg:px-10">
        <p className="min-w-0 flex-1 truncate font-display text-[15px] font-bold lg:invisible">{storeName}</p>

        {/* Money on its way, hidden at a tap */}
        <div className="flex h-10 items-center gap-1.5 rounded-full border border-line bg-surface pl-1.5 pr-1">
          <Link href="/payouts" className="flex items-center gap-1.5" title="On its way to your bank">
            <Illo name="wallet" size={26} />
            <span className="font-display text-sm font-bold tabular-nums">{hidden ? "₦ ••••" : formatNaira(balance)}</span>
          </Link>
          <button type="button" onClick={() => hiddenStore.set(!hidden)} aria-label={hidden ? "Show balance" : "Hide balance"} className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-alt hover:text-ink">
            {hidden ? <Eye size={15} /> : <EyeOff size={15} />}
          </button>
        </div>

        {/* What needs attention */}
        <Popover
          label={alerts ? `${alerts} things need you` : "Notifications"}
          button={
            <span className="relative flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface hover:bg-surface-alt">
              <Illo name="chat" size={24} />
              {alerts > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">{alerts > 9 ? "9+" : alerts}</span>}
            </span>
          }
        >
          {(close) => (
            <div className="py-1">
              <p className="px-4 pb-1 pt-3 text-xs font-semibold text-muted">Needs you</p>
              {alerts === 0 && <p className="px-4 pb-4 pt-1 text-sm text-ink-2">You&apos;re all caught up.</p>}
              {newOrders > 0 && <Row href="/orders" illo="box" title={`${newOrders} new order${newOrders === 1 ? "" : "s"}`} hint="Accept within 24 hours" onClick={close} />}
              {offersWaiting > 0 && <Row href="/offers" illo="tag" title={`${offersWaiting} price offer${offersWaiting === 1 ? "" : "s"}`} hint="Accept, counter or decline" onClick={close} />}
              <div className="border-t border-line">
                <Row href="/notifications" illo="chat" title="Message your followers" onClick={close} />
              </div>
            </div>
          )}
        </Popover>

        {/* Account */}
        <Popover
          label="Account"
          button={
            user.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar} alt="" referrerPolicy="no-referrer" className="h-10 w-10 rounded-full border border-line object-cover" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">{initials}</span>
            )
          }
        >
          {(close) => (
            <div className="py-1">
              <div className="border-b border-line px-4 py-3">
                <p className="truncate font-semibold">{user.name}</p>
                <p className="text-xs text-muted">{user.role}</p>
              </div>
              <Row href="/settings" illo="shield" title="Settings" onClick={close} />
              <Row href="/payouts" illo="bank" title="Payouts" onClick={close} />
              <Row href="/store-preview" illo="store" title="View my store" onClick={close} />
              <form action={signOut} className="border-t border-line">
                <button className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-ink-2 hover:bg-surface-alt">
                  <LogOut size={17} className="mx-[5px]" /> Sign out
                </button>
              </form>
            </div>
          )}
        </Popover>
      </div>
    </div>
  );
}
