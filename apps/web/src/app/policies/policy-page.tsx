import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { CONTACT_BLOCK, POLICIES, UPDATED } from "./content";

/** The frame around one policy or all of them, with links between them */
export function PolicyFrame({ title, intro, current, children }: { title: string; intro?: string; current?: string; children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white/70">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/">
            <Image src="/brand/light-logo-small.png" alt="Sotechy" width={194} height={97} className="h-9 w-auto" />
          </Link>
          <Link href="/policies" className="text-sm font-semibold text-ink-2 hover:text-foreground">
            All policies
          </Link>
        </div>
      </header>
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav aria-label="Policies" className="lg:sticky lg:top-8 lg:self-start">
          <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            {POLICIES.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/${p.slug}`}
                  className={`block rounded-xl px-3 py-2 text-sm ${current === p.slug ? "bg-brand-soft font-semibold text-brand-strong" : "text-ink-2 hover:bg-white"}`}
                >
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <main className="min-w-0">
          <p className="text-sm text-muted">Last updated {UPDATED}</p>
          <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight">{title}</h1>
          {intro && <p className="mt-3 text-lg text-ink-2">{intro}</p>}
          <div className="policy mt-8">{children}</div>
          <div className="policy mt-10 rounded-2xl border border-line bg-white p-5">{CONTACT_BLOCK}</div>
        </main>
      </div>
    </div>
  );
}
