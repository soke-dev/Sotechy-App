import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Policies — Sotechy Shop" };

const sections = [
  { id: "delivery", title: "Delivery & pickup" },
  { id: "returns", title: "Returns" },
  { id: "warranty", title: "Warranty" },
  { id: "payments", title: "Payments" },
  { id: "privacy", title: "Privacy" },
];

export default function PoliciesPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" className="text-sm text-orange-500">← Back</Link>
      <h1 className="mt-4 text-3xl font-bold">Policies</h1>
      <p className="mt-2 text-neutral-500">Placeholder — Sotechy to provide final policy text.</p>
      {sections.map((s) => (
        <section key={s.id} id={s.id} className="mt-10">
          <h2 className="text-xl font-semibold">{s.title}</h2>
          <p className="mt-2 text-neutral-600">To be provided.</p>
        </section>
      ))}
    </main>
  );
}
