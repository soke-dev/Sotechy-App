// sotechy.shop: what Sotechy is, every kind of store on it, and where to shop (the web app now; the iPhone and
// Android apps are coming soon).
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { anyCategory, BUSINESS, MARKET_DEPARTMENTS } from "@sotechy/shared";
import { Illo, type IlloName } from "@/components/illustrations";

const APP_URL = "https://app.sotechy.shop";
const X_URL = "https://x.com/sotechyshop";
const EMAIL = "hello@sotechy.shop";
const MERCHANT_URL = "https://merchant.sotechy.shop";

/** A department of the app's Shop screen, the same way the app's menu opens it */
const shopLink = (d: (typeof MARKET_DEPARTMENTS)[number]) =>
  `${APP_URL}/shop?category=${encodeURIComponent(anyCategory(...d.sections.flatMap((s) => s.items), ...(d.sotechy ?? [])))}&label=${encodeURIComponent(d.name)}`;

const WHY: { illo: IlloName; title: string; text: string }[] = [
  { illo: "shield", title: "Verified stores", text: "Every store is checked by Sotechy before it can sell, and reviews come from people who bought." },
  { illo: "card", title: "Pay your way", text: "Bank transfer, stablecoin or your store tokens, with the delivery fee shown before you pay." },
  { illo: "bike", title: "Delivery or pickup", text: "Have it brought to your door, or collect it from the store. Follow every step until it arrives." },
  { illo: "chat", title: "Help when you need it", text: "Live chat with our team, and if an order doesn't arrive we hold the store's payment while we sort it out." },
];

const STEPS = [
  { n: "1", title: "Find it", text: "Search across many stores, compare prices, or make an offer where a store takes them." },
  { n: "2", title: "Pay safely", text: "Check out in one place. You pay through Sotechy, not straight to a stranger, and we step in if something goes wrong." },
  { n: "3", title: "Earn as you shop", text: "Get the store's own token on every order, plus extra for reviews. Spend them there like cash." },
];

// The cards floating around the phones in the hero
const FLOAT: { illo: IlloName; label: string; style: CSSProperties }[] = [
  { illo: "shield", label: "Verified stores", style: { top: "10%", left: "-4%", "--tilt": "-4deg", animationDelay: "0s" } as CSSProperties },
  { illo: "coin", label: "+1 token per ₦1", style: { top: "46%", right: "-6%", "--tilt": "5deg", animationDelay: "1.4s" } as CSSProperties },
  { illo: "bike", label: "On its way", style: { bottom: "9%", left: "-2%", "--tilt": "3deg", animationDelay: "2.4s" } as CSSProperties },
];

function XLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function AppleLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.37 12.62c-.03-2.6 2.13-3.86 2.22-3.92-1.21-1.77-3.09-2.01-3.76-2.04-1.6-.16-3.12.94-3.93.94-.81 0-2.06-.92-3.39-.89-1.74.03-3.35 1.01-4.25 2.57-1.81 3.14-.46 7.79 1.3 10.34.86 1.25 1.89 2.65 3.23 2.6 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.39.81 1.4-.02 2.28-1.27 3.13-2.52.99-1.45 1.4-2.85 1.42-2.92-.03-.01-2.72-1.04-2.72-4.13zM13.79 4.98c.71-.86 1.19-2.06 1.06-3.25-1.02.04-2.26.68-3 1.54-.66.76-1.24 1.98-1.08 3.15 1.14.09 2.31-.58 3.02-1.44z" />
    </svg>
  );
}

function PlayLogo() {
  return (
    <svg width="20" height="22" viewBox="0 0 20 22" aria-hidden>
      <path d="M1 1.2 11.4 11 1 20.8c-.3-.2-.5-.6-.5-1.1V2.3c0-.5.2-.9.5-1.1Z" fill="#00D7FE" />
      <path d="m14.9 7.6-3.5 3.4L1 1.2c.3-.2.8-.2 1.2 0l12.7 6.4Z" fill="#00F076" />
      <path d="m14.9 14.4-12.7 6.4c-.4.2-.9.2-1.2 0L11.4 11l3.5 3.4Z" fill="#F83A4B" />
      <path d="m18.6 12.3-3.7 2.1-3.5-3.4 3.5-3.4 3.7 2.1c.9.5.9 2.1 0 2.6Z" fill="#FFC900" />
    </svg>
  );
}

/** App Store and Google Play: not out yet, so they say "Coming soon" and aren't links */
function StoreBadge({ store }: { store: "apple" | "google" }) {
  return (
    <span
      aria-disabled
      title="Coming soon"
      className="relative inline-flex h-14 min-w-[172px] cursor-default select-none items-center gap-3 rounded-2xl bg-foreground px-4 text-white opacity-90"
    >
      {store === "apple" ? <AppleLogo /> : <PlayLogo />}
      <span className="leading-tight">
        <span className="block text-[11px] font-medium text-white/70">Coming soon on</span>
        <span className="block font-display text-lg font-bold">{store === "apple" ? "App Store" : "Google Play"}</span>
      </span>
      <span className="absolute -right-2 -top-2 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">Soon</span>
    </span>
  );
}

function WebButton({ label = "Shop on the web" }: { label?: string }) {
  return (
    <a href={APP_URL} className="inline-flex h-14 items-center gap-2.5 rounded-2xl bg-brand px-6 font-display text-lg font-bold text-white shadow-[0_14px_30px_-12px_rgba(247,147,30,0.7)] transition hover:bg-brand-strong">
      {label}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </a>
  );
}

/** One of the app's real screens in a phone outline */
function Phone({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`rounded-[2.6rem] bg-foreground p-2.5 shadow-[0_40px_80px_-30px_rgba(120,60,0,0.45)] ${className}`}>
      <Image src={src} alt={alt} width={720} height={1520} className="h-auto w-full rounded-[2.1rem]" />
    </div>
  );
}

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Warm glow behind the hero */}
      <div aria-hidden className="pointer-events-none absolute -top-48 left-1/2 h-[640px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,#ffe3b3,transparent)] opacity-80" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <Image src="/brand/light-logo-small.png" alt="Sotechy" width={194} height={97} priority className="h-11 w-auto" />
        <nav className="flex items-center gap-2 sm:gap-3">
          <a href={MERCHANT_URL} className="hidden rounded-full px-4 py-2 text-sm font-semibold text-ink-2 transition hover:text-foreground sm:inline-flex">
            Sell on Sotechy
          </a>
          <a href={APP_URL} className="inline-flex items-center rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-white transition hover:bg-black">
            Shop now
          </a>
        </nav>
      </header>

      <main className="relative">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-6 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-12">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3.5 py-1.5 text-sm font-semibold text-brand-strong">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand" />
              </span>
              Now open on the web
            </span>
            <h1 className="mt-5 font-display text-[2.7rem] font-extrabold leading-[1.03] tracking-tight sm:text-6xl">
              Shop stores <br className="hidden sm:block" />
              you can <span className="text-brand">trust.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-2">
              Sotechy is a marketplace of verified Nigerian stores. Phones, fashion, beauty, groceries, home appliances and more, delivered to your door, with tokens you earn on every
              order.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <WebButton />
              <StoreBadge store="apple" />
              <StoreBadge store="google" />
            </div>
            <p className="mt-4 text-sm text-muted">The iPhone and Android apps are on their way. Until then, the web app works on any phone or computer.</p>
          </div>

          {/* Two of the app's screens, with cards floating around them */}
          <div className="relative mx-auto w-full max-w-[460px]">
            <div aria-hidden className="absolute inset-x-[6%] top-[8%] bottom-[4%] rounded-full bg-gradient-to-br from-brand/30 to-[#fdb913]/30 blur-3xl" />
            <div className="relative flex items-end justify-center">
              <Phone src="/images/app/product.webp" alt="A product in the Sotechy app" className="-mr-16 mb-10 w-[46%] rotate-[-6deg] opacity-95" />
              <Phone src="/images/app/home.webp" alt="The Sotechy app's home screen" className="relative z-10 w-[56%]" />
            </div>
            {FLOAT.map(({ illo, label, style }) => (
              <span key={label} className="float absolute z-20 flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm font-bold shadow-[0_14px_34px_-14px_rgba(23,18,14,0.35)]" style={style}>
                <Illo name={illo} size={28} /> {label}
              </span>
            ))}
          </div>
        </section>

        {/* Every kind of store */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Shop every category</h2>
              <p className="mt-2 max-w-xl text-ink-2">From TVs and phones to fashion, beauty and groceries, from stores across Nigeria.</p>
            </div>
            <a href={`${APP_URL}/shop`} className="font-semibold text-brand-strong hover:underline">
              Browse everything →
            </a>
          </div>
          <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {MARKET_DEPARTMENTS.map((d) => (
              <a key={d.name} href={shopLink(d)} className="group rounded-3xl border border-line bg-white p-4 transition sm:p-5 hover:-translate-y-0.5 hover:border-brand hover:shadow-[0_18px_40px_-26px_rgba(23,18,14,0.4)]">
                <span className="block font-display text-base font-bold group-hover:text-brand-strong sm:text-lg">{d.name}</span>
                {/* A few examples, one from each section so they differ */}
                <span className="mt-1 block text-[13px] leading-relaxed text-muted sm:text-sm">
                  {(d.sections.length > 1 ? d.sections.map((s) => s.items[0]) : d.sections[0].items).slice(0, 3).join(", ")}
                </span>
              </a>
            ))}
          </div>
        </section>

        {/* Why Sotechy */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Why shop on Sotechy</h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {WHY.map((c) => (
              <div key={c.title} className="rounded-3xl border border-line bg-white p-6">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft">
                  <Illo name={c.illo} size={36} />
                </span>
                <h3 className="mt-4 font-display text-lg font-bold">{c.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{c.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works, with a store page beside it */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="grid items-center gap-10 rounded-[2rem] bg-brand-soft px-6 py-10 sm:px-10 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">How it works</h2>
              <ol className="mt-6 space-y-5">
                {STEPS.map((s) => (
                  <li key={s.n} className="flex gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-foreground font-display text-lg font-bold text-white">{s.n}</span>
                    <span>
                      <span className="block font-display text-lg font-bold">{s.title}</span>
                      <span className="text-ink-2">{s.text}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <div className="mt-8">
                <WebButton label="Start shopping" />
              </div>
            </div>
            <div className="mx-auto w-full max-w-[280px]">
              <Phone src="/images/app/store.webp" alt="A store on Sotechy, with its own token" />
            </div>
          </div>
        </section>

        {/* Sellers */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="relative overflow-hidden rounded-[2rem] bg-foreground px-6 py-10 text-white sm:px-10 sm:py-12">
            <div aria-hidden className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand opacity-90" />
            <div aria-hidden className="absolute -right-4 top-24 h-40 w-40 rounded-full border-2 border-white/15" />
            <div className="relative max-w-xl">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white">
                <Illo name="store" size={38} />
              </span>
              <h2 className="mt-5 font-display text-3xl font-extrabold sm:text-4xl">Sell on Sotechy</h2>
              <p className="mt-3 text-lg text-white/75">
                Open your store with its own token and reach customers across Nigeria. Businesses and freelancers are welcome: half of each order is paid upfront and the rest after delivery.
              </p>
              <a href={MERCHANT_URL} className="mt-6 inline-flex min-h-12 items-center rounded-full bg-brand px-6 font-semibold text-white transition hover:bg-brand-strong">
                Open your store
              </a>
            </div>
          </div>
        </section>

        {/* Get Sotechy */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="flex flex-col items-center rounded-[2rem] border border-line bg-white px-6 py-12 text-center">
            <Image src="/brand/sotechy-icon-512.png" alt="" width={80} height={80} className="h-20 w-20 rounded-3xl shadow-[0_14px_30px_-14px_rgba(247,147,30,0.7)]" />
            <h2 className="mt-5 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Get Sotechy</h2>
            <p className="mt-2 max-w-lg text-ink-2">Shop on the web today. The apps for iPhone and Android are coming soon, with the same account.</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <WebButton />
              <StoreBadge store="apple" />
              <StoreBadge store="google" />
            </div>
          </div>
        </section>
      </main>

      <footer className="relative border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted sm:px-6">
          <span>
            © {BUSINESS.name} · {BUSINESS.headOffice}
          </span>
          <span className="flex flex-wrap gap-x-5 gap-y-2">
            <a href={APP_URL} className="hover:text-foreground">
              Shop
            </a>
            <Link href="/support" className="hover:text-foreground">
              Help
            </Link>
            <Link href="/policies" className="hover:text-foreground">
              Policies
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <a href={X_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-foreground">
              <XLogo size={12} /> @sotechyshop
            </a>
            <a href={`mailto:${EMAIL}`} className="hover:text-foreground">
              {EMAIL}
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
