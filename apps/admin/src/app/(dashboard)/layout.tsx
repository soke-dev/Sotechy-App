import type { ReactNode } from "react";
import { ROLE_LABELS } from "@sotechy/shared";
import { Nav } from "@/components/nav";
import { getCurrentUser } from "@/lib/api";
import { logout } from "./actions";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 border-r border-neutral-200 bg-neutral-100 p-4 md:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/light-logo-small.png" alt="SoTechy" className="mb-1 h-10 px-2" />
        <p className="mb-6 px-2 text-xs uppercase tracking-wide text-neutral-500">Admin</p>
        <Nav />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3 text-sm">
          {/* Phones and small tablets: the menu folds into the header */}
          <details className="relative md:hidden">
            <summary className="cursor-pointer list-none rounded border border-neutral-300 px-3 py-1.5 font-medium">☰ Menu</summary>
            <div className="absolute left-0 z-20 mt-2 max-h-[75vh] w-64 overflow-y-auto rounded-lg border border-neutral-200 bg-neutral-50 p-3 shadow-lg">
              <Nav />
            </div>
          </details>
          <div className="ml-auto flex items-center gap-4">
            <span className="text-neutral-600">
              {user.fullName ?? user.email} · {ROLE_LABELS[user.role]}
            </span>
            <form action={logout}>
              <button className="text-neutral-500 hover:text-neutral-900">Sign out</button>
            </form>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
