"use client";

// The menu inside Storefront: the store's look and details, being featured, promo codes, messages to
// followers and reviews. Anything waiting on the store shows a number.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "@/components/account-context";
import { roleSees } from "@/lib/roles";

export const STOREFRONT_TABS = [
  { href: "/storefront", label: "Design" },
  { href: "/store-details", label: "Store details" },
  { href: "/featured", label: "Get featured" },
  { href: "/promotions", label: "Promo codes" },
  { href: "/notifications", label: "Notifications" },
  { href: "/reviews", label: "Reviews" },
];

export function StorefrontTabs({ counts }: { counts: Partial<Record<string, number>> }) {
  const pathname = usePathname();
  const { role } = useAccount();
  const tabs = STOREFRONT_TABS.filter((t) => roleSees(role, t.href === "/store-details" ? "/storefront" : t.href));
  return (
    <nav aria-label="Storefront" className="no-scrollbar -mx-1 mb-5 flex gap-1.5 overflow-x-auto px-1 pb-1">
      {tabs.map((t) => {
        const on = pathname === t.href || pathname.startsWith(`${t.href}/`);
        const n = counts[t.href] ?? 0;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={on ? "page" : undefined}
            ref={on ? (el) => el?.scrollIntoView({ block: "nearest", inline: "nearest" }) : undefined}
            className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${on ? "border-inverse bg-inverse text-on-inverse" : "border-line bg-surface text-ink-2 hover:bg-surface-alt"}`}
          >
            {t.label}
            {n > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-white">{n}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
