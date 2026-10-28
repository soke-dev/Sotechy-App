"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgePercent,
  BarChart3,
  Banknote,
  Boxes,
  Building2,
  Coins,
  CreditCard,
  FolderTree,
  Gavel,
  Images,
  LayoutDashboard,
  LifeBuoy,
  MapPin,
  Package,
  ScanBarcode,
  ScrollText,
  Settings,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  ToggleRight,
  Truck,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Illo, type IlloName } from "./illustrations";
import { useQueue, type Queue } from "./queue-context";

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  illo: IlloName;
  /** Which waiting count to show next to it */
  countKey?: keyof Queue;
}

/** A sidebar item. Its first page is where it opens; the others show as tabs at the top of the page. */
export interface NavGroup {
  label: string;
  illo: IlloName;
  pages: NavLink[];
}

export const NAV: NavGroup[] = [
  { label: "Dashboard", illo: "home", pages: [{ href: "/", label: "Dashboard", icon: LayoutDashboard, illo: "home" }] },
  {
    label: "Orders",
    illo: "receipt",
    pages: [
      { href: "/orders", label: "Orders", icon: ShoppingBag, illo: "receipt" },
      { href: "/order-reviews", label: "Order reviews", icon: Gavel, illo: "shield", countKey: "cases" },
      { href: "/payments", label: "Payments & refunds", icon: CreditCard, illo: "card", countKey: "refunds" },
      { href: "/pos", label: "Walk-in sale", icon: ScanBarcode, illo: "cart" },
    ],
  },
  {
    label: "Merchants",
    illo: "store",
    pages: [
      { href: "/merchants", label: "Merchants", icon: Store, illo: "store", countKey: "merchants" },
      { href: "/delivery-areas", label: "Delivery areas", icon: MapPin, illo: "pin", countKey: "zones" },
      { href: "/merchant-payouts", label: "Merchant payouts", icon: Banknote, illo: "bank", countKey: "payouts" },
      { href: "/featured-stores", label: "Featured stores", icon: Sparkles, illo: "sparkle" },
    ],
  },
  {
    label: "Products",
    illo: "bag",
    pages: [
      { href: "/products", label: "Products", icon: Package, illo: "bag" },
      { href: "/categories", label: "Categories", icon: FolderTree, illo: "tag" },
      { href: "/inventory", label: "Inventory", icon: Boxes, illo: "box" },
      { href: "/suppliers", label: "Suppliers", icon: Truck, illo: "bike" },
      { href: "/promotions", label: "Promotions", icon: BadgePercent, illo: "sparkle" },
    ],
  },
  {
    label: "Customers",
    illo: "user",
    pages: [
      { href: "/customers", label: "Customers", icon: Users, illo: "user" },
      { href: "/reviews", label: "Reviews", icon: Star, illo: "heart" },
    ],
  },
  // Its own item, with the count of chats waiting for an answer
  { label: "Support", illo: "chat", pages: [{ href: "/support", label: "Support", icon: LifeBuoy, illo: "chat", countKey: "support" }] },
  { label: "Tokens", illo: "coin", pages: [{ href: "/tokens", label: "Tokens & reserve", icon: Coins, illo: "coin" }] },
  {
    label: "Reports",
    illo: "wallet",
    pages: [
      { href: "/reports", label: "Reports", icon: BarChart3, illo: "wallet" },
      { href: "/audit-logs", label: "Audit log", icon: ScrollText, illo: "doc" },
    ],
  },
  {
    label: "Settings",
    illo: "shield",
    pages: [
      { href: "/settings", label: "Settings", icon: Settings, illo: "shield" },
      { href: "/switches", label: "App switches", icon: ToggleRight, illo: "phone" },
      { href: "/banners", label: "Home banners", icon: Images, illo: "sparkle" },
      { href: "/branches", label: "Branches", icon: Building2, illo: "store" },
      { href: "/staff", label: "Staff & roles", icon: UserCog, illo: "user" },
    ],
  },
];

/** Every page, for "Jump to" */
export const ALL_LINKS = NAV.flatMap((g) => g.pages.map((p) => ({ ...p, section: g.label })));

export const isActive = (href: string, pathname: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

const pageCount = (p: NavLink, q: Queue) => (p.countKey ? q[p.countKey] : 0);
const groupCount = (g: NavGroup, q: Queue) => g.pages.reduce((n, p) => n + pageCount(p, q), 0);

/** The section and page the user is on */
export function useCurrentPage() {
  const pathname = usePathname();
  for (const group of NAV) {
    const page = group.pages.find((p) => isActive(p.href, pathname));
    if (page) return { group, page };
  }
  return null;
}

/** Sidebar navigation, drawn on the dark panel. */
export function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const current = useCurrentPage();
  const queue = useQueue();
  return (
    <nav className="flex flex-col gap-1 text-[15px]">
      {NAV.map((g) => {
        const active = current?.group === g;
        const count = groupCount(g, queue);
        return (
          <Link
            key={g.label}
            href={g.pages[0].href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`group flex items-center gap-3 rounded-2xl px-2.5 py-2 transition-colors ${active ? "bg-brand font-semibold text-white shadow-[0_6px_16px_rgba(247,147,30,0.35)]" : "text-white/70 hover:bg-white/5 hover:text-white"}`}
          >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${active ? "bg-white" : "bg-white/5 opacity-80 group-hover:opacity-100"}`}>
              <Illo name={g.illo} size={24} />
            </span>
            <span className="truncate">{g.label}</span>
            {count ? <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold ${active ? "bg-white text-brand-strong" : "bg-brand text-white"}`}>{count}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

/** Tabs for the other pages in the current section, shown at the top of the page. */
export function SectionTabs() {
  const current = useCurrentPage();
  const queue = useQueue();
  if (!current || current.group.pages.length < 2) return null;
  return (
    <nav className="no-scrollbar -mx-1 mb-6 flex min-w-0 gap-1 overflow-x-auto border-b border-line px-1">
      {current.group.pages.map((p) => {
        const on = p === current.page;
        return (
          <Link
            key={p.href}
            href={p.href}
            aria-current={on ? "page" : undefined}
            className={`relative flex shrink-0 items-center gap-2 px-3 pb-3 pt-1 text-sm font-semibold transition ${on ? "text-ink" : "text-muted hover:text-ink"}`}
          >
            {p.label}
            {pageCount(p, queue) ? <span className="rounded-full bg-brand px-1.5 text-[11px] font-bold text-white">{pageCount(p, queue)}</span> : null}
            {on && <span className="absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-brand" />}
          </Link>
        );
      })}
    </nav>
  );
}
