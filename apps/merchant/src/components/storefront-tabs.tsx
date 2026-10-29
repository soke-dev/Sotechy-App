"use client";

// The menu inside Storefront: the store's look, and its details (which Sotechy approves)
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "@/components/account-context";

const TABS = [
  { href: "/storefront", label: "Design" },
  { href: "/store-details", label: "Store details" },
];

export function StorefrontTabs() {
  const pathname = usePathname();
  const { store } = useAccount();
  const waiting = store.profileChangeStatus === "pending";
  return (
    <nav aria-label="Storefront" className="mb-5 flex gap-1.5">
      {TABS.map((t) => {
        const on = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${on ? "border-inverse bg-inverse text-on-inverse" : "border-line bg-surface text-ink-2 hover:bg-surface-alt"}`}
          >
            {t.label}
            {t.href === "/store-details" && waiting && <span className="h-2 w-2 rounded-full bg-brand" aria-label="Changes waiting for Sotechy" />}
          </Link>
        );
      })}
    </nav>
  );
}
