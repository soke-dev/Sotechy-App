import type { Metadata } from "next";
import Link from "next/link";
import { POLICIES } from "./content";
import { PolicyFrame } from "./policy-page";

export const metadata: Metadata = { title: "Policies — Sotechy Shop", description: "Terms, privacy, returns and refunds, delivery, warranty and payments at Sotechy Shop." };

export default function PoliciesPage() {
  return (
    <PolicyFrame title="Policies" intro="How buying from Sotechy works: your rights, our promises, and how we look after your data.">
      {POLICIES.map((p) => (
        <section key={p.slug} id={p.slug} className="scroll-mt-8 border-t border-line pt-8 first:border-t-0 first:pt-0 [&+section]:mt-10">
          <h2>
            <Link href={`/${p.slug}`} className="hover:text-brand-strong">
              {p.title}
            </Link>
          </h2>
          {p.body}
        </section>
      ))}
    </PolicyFrame>
  );
}
