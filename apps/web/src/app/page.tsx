// While the new Sotechy is being built: what's coming, where to follow along and how to reach us.
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { BUSINESS } from "@sotechy/shared";
import { Illo, type IlloName } from "@/components/illustrations";

const X_URL = "https://x.com/sotechyshop";
const EMAIL = "hello@sotechy.shop";
const MERCHANT_URL = "https://merchant.sotechy.shop";

const COMING: { illo: IlloName; title: string; text: string }[] = [
  { illo: "store", title: "Verified stores", text: "Sotechy and shops across Nigeria, each checked by us before they can sell." },
  { illo: "coin", title: "Tokens on every order", text: "Earn each store's own token as you shop, then spend it there like cash." },
  { illo: "bike", title: "Delivery or pickup", text: "Get it brought to your door, or collect it from the store when it suits you." },
  { illo: "card", title: "Pay your way", text: "Bank transfer, card or supported crypto, all in one secure checkout." },
];

// Illustrations floating around the hero mark: position, size, tilt and timing
const ORBIT: { illo: IlloName; style: CSSProperties }[] = [
  { illo: "bag", style: { top: "4%", left: "10%", "--tilt": "-8deg", animationDelay: "0s" } as CSSProperties },
  { illo: "coin", style: { top: "8%", right: "6%", "--tilt": "10deg", animationDelay: "1.2s" } as CSSProperties },
  { illo: "bike", style: { bottom: "10%", left: "2%", "--tilt": "6deg", animationDelay: "2.1s" } as CSSProperties },
  { illo: "shield", style: { bottom: "4%", right: "12%", "--tilt": "-6deg", animationDelay: "0.7s" } as CSSProperties },
  { illo: "chat", style: { top: "44%", right: "-2%", "--tilt": "4deg", animationDelay: "1.7s" } as CSSProperties },
  { illo: "phone", style: { top: "40%", left: "-3%", "--tilt": "-4deg", animationDelay: "2.6s" } as CSSProperties },
];

function XLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export default function ComingSoon() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Warm glow behind everything */}
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,#ffe3b3,transparent)] opacity-80" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <Image src="/brand/light-logo-small.png" alt="Sotechy" width={194} height={97} priority className="h-11 w-auto" />
        <a href={X_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold transition hover:border-foreground">
          <XLogo size={14} /> <span className="hidden sm:inline">Follow</span> @sotechyshop
        </a>
      </header>

      <main className="relative">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3.5 py-1.5 text-sm font-semibold text-brand-strong">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand" />
              </span>
              We&apos;re building something new
            </span>
            <h1 className="mt-5 font-display text-[2.6rem] font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              The new Sotechy is <span className="text-brand">almost here.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-2">
              We&apos;re turning Sotechy into a marketplace of verified stores. Phones, gadgets and home appliances, plus shops across Nigeria, with tokens you earn on every
              order.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={X_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-foreground px-6 font-semibold text-white transition hover:opacity-90">
                <XLogo /> Follow the build
              </a>
              <a href={`mailto:${EMAIL}`} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-line bg-white px-6 font-semibold transition hover:border-foreground">
                <Illo name="mail" size={22} /> {EMAIL}
              </a>
            </div>
            <p className="mt-6 flex items-center gap-2 text-sm text-muted">
              <Illo name="pin" size={20} /> Our {BUSINESS.headOffice.replace(", Nigeria", "")} store is open as usual.
            </p>
          </div>

          {/* The mark, with the app's illustrations floating around it */}
          <div className="relative mx-auto aspect-square w-full max-w-[460px]">
            <div aria-hidden className="spin-slow absolute inset-[8%] rounded-full border-2 border-dashed border-brand/30" />
            <div aria-hidden className="absolute inset-[20%] rounded-full bg-gradient-to-br from-brand to-[#fdb913] shadow-[0_30px_80px_-20px_rgba(247,147,30,0.6)]" />
            <div className="absolute inset-[30%] flex items-center justify-center rounded-full bg-white shadow-inner">
              <Image src="/brand/sotechy-icon-512.png" alt="" width={140} height={140} className="h-1/2 w-1/2 object-contain" />
            </div>
            {ORBIT.map(({ illo, style }) => (
              <span key={illo} className="float absolute flex h-[17%] w-[17%] items-center justify-center rounded-3xl bg-white shadow-[0_12px_30px_-12px_rgba(23,18,14,0.3)]" style={style}>
                <Illo name={illo} size={44} />
              </span>
            ))}
          </div>
        </section>

        {/* What's coming */}
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">What&apos;s coming</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {COMING.map((c) => (
              <div key={c.title} className="rounded-3xl border border-line bg-white p-6 transition hover:-translate-y-1 hover:shadow-[0_18px_40px_-24px_rgba(23,18,14,0.35)]">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft">
                  <Illo name={c.illo} size={36} />
                </span>
                <h3 className="mt-4 font-display text-lg font-bold">{c.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{c.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Sellers */}
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <div className="relative overflow-hidden rounded-[2rem] bg-foreground px-6 py-10 text-white sm:px-10 sm:py-12">
            <div aria-hidden className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand opacity-90" />
            <div aria-hidden className="absolute -right-4 top-24 h-40 w-40 rounded-full border-2 border-white/15" />
            <div className="relative max-w-xl">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white">
                <Illo name="store" size={38} />
              </span>
              <h2 className="mt-5 font-display text-3xl font-extrabold sm:text-4xl">Sell on Sotechy</h2>
              <p className="mt-3 text-lg text-white/75">Open your store now, with its own token, and be ready for customers on day one. Businesses and freelancers are welcome.</p>
              <a href={MERCHANT_URL} className="mt-6 inline-flex min-h-12 items-center rounded-full bg-brand px-6 font-semibold text-white transition hover:bg-brand-strong">
                Open your store
              </a>
            </div>
          </div>
        </section>

        {/* Stay in touch */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <a href={X_URL} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 rounded-3xl border border-line bg-white p-6 transition hover:border-foreground">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-foreground text-white">
                <XLogo size={22} />
              </span>
              <span>
                <span className="block font-display text-lg font-bold">Follow the build</span>
                <span className="text-ink-2">Updates and launch news on @sotechyshop</span>
              </span>
            </a>
            <a href={`mailto:${EMAIL}`} className="group flex items-center gap-4 rounded-3xl border border-line bg-white p-6 transition hover:border-foreground">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-soft">
                <Illo name="mail" size={36} />
              </span>
              <span>
                <span className="block font-display text-lg font-bold">Talk to us</span>
                <span className="text-ink-2">{EMAIL}</span>
              </span>
            </a>
          </div>
        </section>
      </main>

      <footer className="relative border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted sm:px-6">
          <span>
            © {BUSINESS.name} · {BUSINESS.headOffice}
          </span>
          <span className="flex gap-5">
            <Link href="/policies" className="hover:text-foreground">
              Policies
            </Link>
            <a href={X_URL} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
              X
            </a>
            <a href={`mailto:${EMAIL}`} className="hover:text-foreground">
              Email
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
