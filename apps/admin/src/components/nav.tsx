"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
  {
    title: "Overview",
    links: [
      { href: "/", label: "Dashboard" },
      { href: "/reports", label: "Reports" },
    ],
  },
  {
    title: "Sales",
    links: [
      { href: "/orders", label: "Orders" },
      { href: "/pos", label: "Walk-in sale (POS)" },
      { href: "/payments", label: "Payments & refunds" },
      { href: "/customers", label: "Customers" },
      { href: "/support", label: "Support" },
    ],
  },
  {
    title: "Catalogue",
    links: [
      { href: "/products", label: "Products" },
      { href: "/categories", label: "Categories" },
      { href: "/reviews", label: "Reviews" },
      { href: "/inventory", label: "Inventory" },
      { href: "/suppliers", label: "Suppliers & purchasing" },
      { href: "/promotions", label: "Promotions" },
    ],
  },
  {
    title: "Admin",
    links: [
      { href: "/branches", label: "Branches" },
      { href: "/staff", label: "Staff & roles" },
      { href: "/settings", label: "Settings" },
      { href: "/audit-logs", label: "Audit log" },
      { href: "/merchants", label: "Merchants (soon)" },
    ],
  },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-5 text-sm">
      {sections.map((s) => (
        <div key={s.title}>
          <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">{s.title}</p>
          {s.links.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`block rounded px-2 py-1.5 ${active ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-200"}`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
