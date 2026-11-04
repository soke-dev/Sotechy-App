import type { Metadata } from "next";
import Link from "next/link";
import { POLICIES } from "./content";
import { InShort, PolicyFrame } from "./policy-page";

export const metadata: Metadata = {
  title: "Sotechy: Terms and policies",
  description: "Terms of service, payments, delivery and pickup, returns and refunds, warranty, rewards and tokens, and privacy on Sotechy.",
};

export default function PoliciesPage() {
  return (
    <PolicyFrame title="Terms and policies" intro="Everything about buying on Sotechy, from paying and delivery to returns, warranty, tokens and your data. Each one starts with the short version.">
      {/* Contents */}
      <div className="not-prose grid gap-3 sm:grid-cols-2">
        {POLICIES.map((p, i) => (
          <a key={p.slug} href={`#${p.slug}`} className="group rounded-2xl border border-line bg-white p-4 hover:border-brand">
            <span className="text-xs font-semibold text-muted">{String(i + 1).padStart(2, "0")}</span>
            <span className="mt-0.5 block font-display text-lg font-bold group-hover:text-brand-strong">{p.title}</span>
            <span className="mt-1 block text-sm leading-relaxed text-ink-2">{p.summary}</span>
          </a>
        ))}
      </div>
      {POLICIES.map((p) => (
        <section key={p.slug} id={p.slug} className="mt-12 scroll-mt-8 border-t border-line pt-10">
          <h2>
            <Link href={`/${p.slug}`} className="hover:text-brand-strong">
              {p.title}
            </Link>
          </h2>
          <p className="mb-5">{p.summary}</p>
          <InShort points={p.short} />
          <div className="mt-6">{p.body}</div>
        </section>
      ))}
    </PolicyFrame>
  );
}
