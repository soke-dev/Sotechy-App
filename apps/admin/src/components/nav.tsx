"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgePercent,
  BarChart3,
  Boxes,
  Building2,
  CreditCard,
  FolderTree,
  Handshake,
  Images,
  LayoutDashboard,
  LifeBuoy,
  Package,
  ScanBarcode,
  ScrollText,
  Settings,
  ShoppingBag,
  Star,
  ToggleRight,
  Truck,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  soon?: boolean;
}

export const NAV: { title: string; links: NavLink[] }[] = [
  {
    title: "Overview",
    links: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    title: "Sales",
    links: [
      { href: "/orders", label: "Orders", icon: ShoppingBag },
      { href: "/pos", label: "Walk-in sale (POS)", icon: ScanBarcode },
      { href: "/payments", label: "Payments & refunds", icon: CreditCard },
      { href: "/customers", label: "Customers", icon: Users },
      { href: "/support", label: "Support", icon: LifeBuoy },
    ],
  },
  {
    title: "Catalogue",
    links: [
      { href: "/products", label: "Products", icon: Package },
      { href: "/categories", label: "Categories", icon: FolderTree },
      { href: "/inventory", label: "Inventory", icon: Boxes },
      { href: "/suppliers", label: "Suppliers & purchasing", icon: Truck },
      { href: "/promotions", label: "Promotions", icon: BadgePercent },
    ],
  },
  {
    title: "App",
    links: [
      { href: "/switches", label: "App switches", icon: ToggleRight },
      { href: "/banners", label: "Home banners", icon: Images },
      { href: "/reviews", label: "Reviews", icon: Star },
    ],
  },
  {
    title: "Admin",
    links: [
      { href: "/branches", label: "Branches", icon: Building2 },
      { href: "/staff", label: "Staff & roles", icon: UserCog },
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/audit-logs", label: "Audit log", icon: ScrollText },
      { href: "/merchants", label: "Merchants", icon: Handshake, soon: true },
    ],
  },
];

const isActive = (href: string, pathname: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

/** The page the user is on, for the top bar. */
export function useCurrentPage() {
  const pathname = usePathname();
  for (const section of NAV) {
    const link = section.links.find((l) => isActive(l.href, pathname));
    if (link) return { section: section.title, ...link };
  }
  return null;
}

export function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-6 text-sm">
      {NAV.map((s) => (
        <div key={s.title}>
          <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">{s.title}</p>
          <div className="flex flex-col gap-0.5">
            {s.links.map(({ href, label, icon: Icon, soon }) => {
              const active = isActive(href, pathname);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                    active ? "bg-brand-soft font-medium text-ink" : "text-ink-2 hover:bg-canvas hover:text-ink"
                  }`}
                >
                  {active && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-brand" />}
                  <Icon size={18} strokeWidth={active ? 2.2 : 1.9} className={active ? "text-brand-strong" : "text-muted group-hover:text-ink-2"} />
                  <span className="truncate">{label}</span>
                  {soon && <span className="ml-auto rounded-full bg-canvas px-2 py-0.5 text-[10px] font-medium text-muted">Soon</span>}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
