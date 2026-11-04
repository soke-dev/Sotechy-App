// One policy on its own page: /terms, /payments, /delivery, /returns, /warranty, /rewards, /privacy
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { POLICIES } from "../policies/content";
import { InShort, PolicyFrame } from "../policies/policy-page";

export const generateStaticParams = () => POLICIES.map((p) => ({ policy: p.slug }));

export async function generateMetadata({ params }: { params: Promise<{ policy: string }> }): Promise<Metadata> {
  const { policy } = await params;
  const p = POLICIES.find((x) => x.slug === policy);
  return p ? { title: `Sotechy: ${p.title}`, description: p.summary } : {};
}

export default async function PolicyPage({ params }: { params: Promise<{ policy: string }> }) {
  const { policy } = await params;
  const p = POLICIES.find((x) => x.slug === policy);
  if (!p) notFound();
  return (
    <PolicyFrame title={p.title} intro={p.summary} current={p.slug}>
      <InShort points={p.short} />
      <div className="mt-8">{p.body}</div>
    </PolicyFrame>
  );
}
