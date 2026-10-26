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
  Star,
  Store,
  ToggleRight,
  Truck,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Illo, type IlloName } from "./illustrations";
import { queue } from "@/lib/marketplace";

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  illo: IlloName;
  /** Things waiting for a decision */
  count?: number;
}

export const NAV: { title: string; links: NavLink[] }[] = [
  {
    title: "Overview",
    links: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard, illo: "home" },
      { href: "/reports", label: "Reports", icon: BarChart3, illo: "wallet" },
    ],
  },
  {
    title: "Marketplace",
    links: [
      { href: "/merchants", label: "Merchants", icon: Store, illo: "store", count: queue.merchants },
      { href: "/delivery-areas", label: "Delivery areas", icon: MapPin, illo: "pin", count: queue.zones },
      { href: "/order-reviews", label: "Order reviews", icon: Gavel, illo: "shield", count: queue.cases },
      { href: "/merchant-payouts", label: "Merchant payouts", icon: Banknote, illo: "bank" },
      { href: "/tokens", label: "Tokens & reserve", icon: Coins, illo: "coin" },
    ],
  },
  {
    title: "Sales",
    links: [
      { href: "/orders", label: "Orders", icon: ShoppingBag, illo: "receipt" },
      { href: "/pos", label: "Walk-in sale (POS)", icon: ScanBarcode, illo: "cart" },
      { href: "/payments", label: "Payments & refunds", icon: CreditCard, illo: "card" },
      { href: "/customers", label: "Customers", icon: Users, illo: "user" },
      { href: "/support", label: "Support", icon: LifeBuoy, illo: "chat" },
    ],
  },
  {
    title: "Catalogue",
    links: [
      { href: "/products", label: "Products", icon: Package, illo: "bag" },
      { href: "/categories", label: "Categories", icon: FolderTree, illo: "tag" },
      { href: "/inventory", label: "Inventory", icon: Boxes, illo: "box" },
      { href: "/suppliers", label: "Suppliers & purchasing", icon: Truck, illo: "bike" },
      { href: "/promotions", label: "Promotions", icon: BadgePercent, illo: "sparkle" },
    ],
  },
  {
    title: "App",
    links: [
      { href: "/switches", label: "App switches", icon: ToggleRight, illo: "phone" },
      { href: "/banners", label: "Home banners", icon: Images, illo: "sparkle" },
      { href: "/reviews", label: "Reviews", icon: Star, illo: "heart" },
    ],
  },
  {
    title: "Admin",
    links: [
      { href: "/branches", label: "Branches", icon: Building2, illo: "store" },
      { href: "/staff", label: "Staff & roles", icon: UserCog, illo: "user" },
      { href: "/settings", label: "Settings", icon: Settings, illo: "shield" },
      { href: "/audit-logs", label: "Audit log", icon: ScrollText, illo: "doc" },
    ],
  },
];

export const ALL_LINKS = NAV.flatMap((s) => s.links.map((l) => ({ ...l, section: s.title })));

export const isActive = (href: string, pathname: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

/** The page the user is on, for the top bar. */
export function useCurrentPage() {
  const pathname = usePathname();
  return ALL_LINKS.find((l) => isActive(l.href, pathname)) ?? null;
}

/** Sidebar navigation, drawn on the dark panel. */
export function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-5 text-sm">
      {NAV.map((s) => (
        <div key={s.title}>
          <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-white/35">{s.title}</p>
          <div className="flex flex-col gap-0.5">
            {s.links.map(({ href, label, illo, count }) => {
              const active = isActive(href, pathname);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`group relative flex items-center gap-3 rounded-2xl px-2.5 py-1.5 transition-colors ${active ? "bg-white/10 font-semibold text-white" : "text-white/65 hover:bg-white/5 hover:text-white"}`}
                >
                  {active && <span className="absolute inset-y-2 -left-3 w-1 rounded-r-full bg-brand" />}
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition ${active ? "bg-brand-soft" : "bg-white/5 opacity-75 group-hover:opacity-100"}`}>
                    <Illo name={illo} size={22} />
                  </span>
                  <span className="truncate">{label}</span>
                  {count ? <span className="ml-auto rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-white">{count}</span> : null}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
