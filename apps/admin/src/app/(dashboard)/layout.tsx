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
          <span className="font-medium md:hidden">Sotechy Admin</span>
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
