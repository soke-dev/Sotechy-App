import type { Metadata } from "next";
import Link from "next/link";
import { Illo } from "@/components/illustrations";

export const metadata: Metadata = { title: "Merchant terms · Sotechy" };

const UPDATED = "27 October 2026";

const SECTIONS: { id: string; title: string; points: string[] }[] = [
  {
    id: "who",
    title: "Who these terms are for",
    points: [
      "These terms apply to anyone who opens a store on Sotechy, whether a registered business or an individual selling in their own name. By opening a store you agree to them on behalf of yourself and your business.",
      "Your store sits on top of your ordinary Sotechy account. The general Sotechy terms and privacy policy apply to that account too.",
    ],
  },
  {
    id: "account",
    title: "Your account and store",
    points: [
      "One store per account. Give us true, current details about you and your business, and keep them up to date.",
      "Keep your password and sign-in codes private. You're responsible for what happens in your store, including anything your team members do.",
      "Your @username, store name and store link must not copy or suggest another brand, person or Sotechy itself.",
    ],
  },
  {
    id: "verification",
    title: "Verification",
    points: [
      "Every store is checked before it can sell. That includes an identity check of the owner (an ID document and a live selfie, run by our partner Didit), and for registered businesses, their CAC documents.",
      "Until Sotechy approves your store you can explore your dashboard and set things up, but you can't list products, take orders or send notifications.",
      "We may ask for more information at any time, and we may decline or pause a store that doesn't pass our checks.",
    ],
  },
  {
    id: "selling",
    title: "What you can sell",
    points: [
      "Only genuine, legal goods that you own or are allowed to sell, described honestly with real photos, the correct condition (new, used or refurbished) and the right price.",
      "You may not sell counterfeit or stolen goods, weapons, drugs, alcohol or tobacco to minors, adult content, or anything Nigerian law forbids.",
      "Keep your stock levels accurate. Don't take orders for items you can't supply.",
    ],
  },
  {
    id: "orders",
    title: "Orders and delivery",
    points: [
      "Accept or decline every new order within 24 hours. Orders you don't answer in time are cancelled and the customer is refunded.",
      "Deliver only to the areas Sotechy has approved for your store, at the delivery or pickup price you set, in the time you promise.",
      "Mark orders as packed, sent and delivered as they happen, so customers can follow them.",
    ],
  },
  {
    id: "offers",
    title: "Price offers",
    points: [
      "On products you mark as negotiable, customers can send you a price. If you accept, that customer can buy at the agreed price for the time you choose (6, 12 or 24 hours), and you must honour it.",
      "Keep offer chats about the product and the order. Don't move customers off Sotechy to pay you directly.",
    ],
  },
  {
    id: "payments",
    title: "Payments, fees and payouts",
    points: [
      "Customers pay Sotechy, and Sotechy pays you. Never ask a customer to pay you outside Sotechy for an order placed on Sotechy.",
      "Your fee and payout plan are shown in your dashboard before you go live. Payouts go to the bank account you've verified, which must be in your business name or your own name.",
      "Refunds for cancelled orders, returns or disputes you lose are taken from what we owe you.",
    ],
  },
  {
    id: "tokens",
    title: "Your store token",
    points: [
      "Your store has its own token (for example $XENA). Customers earn it on completed orders and can only spend it at your store. It isn't money, a deposit or an investment, and you must not describe it as one.",
      "Tokens are run by Sotechy on the Monad blockchain. A store may choose to make its token tradeable in the future; that depends on the merchant and on Sotechy's approval, and isn't promised.",
      "You must accept your tokens at the value shown in your dashboard when customers spend them at your store.",
    ],
  },
  {
    id: "customers",
    title: "Customer information",
    points: [
      "Use customers' names, numbers and addresses only to complete their orders and answer their questions.",
      "Store notifications go only to customers who follow your store. Don't send customers messages they didn't ask for, and never sell or share their details.",
    ],
  },
  {
    id: "reviews",
    title: "Reviews",
    points: [
      "Only customers who received an item can review it. Don't post reviews of your own store, pay for reviews, or pressure customers to change them. You can reply to any review.",
    ],
  },
  {
    id: "pausing",
    title: "Pausing or closing a store",
    points: [
      "Sotechy may pause or close a store that breaks these terms, puts customers at risk, or is under investigation. Where we can, we'll tell you why and how to fix it.",
      "You can close your store at any time once open orders are finished. Money we owe you is paid out after any refunds and disputes are settled.",
    ],
  },
  {
    id: "changes",
    title: "Changes to these terms",
    points: ["We may update these terms. We'll tell you in your dashboard and by email before important changes take effect. Keep selling after that, and you accept the new terms."],
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        <div className="mb-8 flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/light-logo-small.png" alt="SoTechy" className="h-9" />
          <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-strong">Merchant</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-soft">
            <Illo name="doc" size={34} />
          </span>
          <div>
            <h1 className="text-3xl font-extrabold">Merchant terms</h1>
            <p className="text-sm text-muted">Last updated {UPDATED}</p>
          </div>
        </div>
        <p className="mt-6 text-ink-2">The rules for selling on Sotechy, in plain words. They keep shoppers safe and make sure every store is treated fairly.</p>

        <nav className="mt-6 flex flex-wrap gap-2">
          {SECTIONS.map((s, i) => (
            <a key={s.id} href={`#${s.id}`} className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-2 hover:bg-surface-alt">
              {i + 1}. {s.title}
            </a>
          ))}
        </nav>

        <div className="mt-8 flex flex-col gap-4">
          {SECTIONS.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-6 rounded-3xl border border-line bg-surface p-5 sm:p-6">
              <h2 className="text-lg font-bold">
                <span className="text-brand-strong">{i + 1}.</span> {s.title}
              </h2>
              <ul className="mt-3 flex flex-col gap-2.5">
                {s.points.map((p) => (
                  <li key={p} className="flex gap-2.5 text-[15px] leading-relaxed text-ink-2">
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <p className="mt-8 text-sm text-muted">
          Questions about these terms? Email <a href="mailto:support@sotechy.shop" className="font-semibold text-brand-strong hover:underline">support@sotechy.shop</a>.
        </p>
        <Link href="/signup" className="mt-4 inline-block text-sm font-semibold text-brand-strong hover:underline">← Back to opening your store</Link>
      </div>
    </main>
  );
}
