// One policy on its own page: /terms, /privacy, /returns, /delivery, /warranty, /payments
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { POLICIES } from "../policies/content";
import { PolicyFrame } from "../policies/policy-page";

export const generateStaticParams = () => POLICIES.map((p) => ({ policy: p.slug }));

export async function generateMetadata({ params }: { params: Promise<{ policy: string }> }): Promise<Metadata> {
  const { policy } = await params;
  const p = POLICIES.find((x) => x.slug === policy);
  return p ? { title: `${p.title} — Sotechy Shop`, description: p.summary } : {};
}

export default async function PolicyPage({ params }: { params: Promise<{ policy: string }> }) {
  const { policy } = await params;
  const p = POLICIES.find((x) => x.slug === policy);
  if (!p) notFound();
  return (
    <PolicyFrame title={p.title} intro={p.summary} current={p.slug}>
      {p.body}
    </PolicyFrame>
  );
}
