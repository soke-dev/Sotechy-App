// sotechy.shop: what Sotechy is, the kinds of stores on it, and where to shop (the iPhone app, the web app, and the
// Android app coming soon).
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { anyCategory, BUSINESS, MARKET_DEPARTMENTS } from "@sotechy/shared";
import { DownloadMenu } from "@/components/download-menu";
import { Illo, type IlloName } from "@/components/illustrations";
import { APP_STORE_URL, AppleLogo, PlayLogo } from "@/components/store-logos";

const APP_URL = "https://app.sotechy.shop";
const X_URL = "https://x.com/sotechyshop";
const TIKTOK_URL = "https://www.tiktok.com/@sotechyshop";
const EMAIL = "hello@sotechy.shop";
const MERCHANT_URL = "https://merchant.sotechy.shop";

/** A department of the app's Shop screen, the same way the app's menu opens it */
function shopLink(name: string) {
  const d = MARKET_DEPARTMENTS.find((x) => x.name === name);
  if (!d) return `${APP_URL}/shop`;
  return `${APP_URL}/shop?category=${encodeURIComponent(anyCategory(...d.sections.flatMap((s) => s.items), ...(d.sotechy ?? [])))}&label=${encodeURIComponent(d.name)}`;
}

/** Line icons for the popular categories (24×24, drawn with the text colour) */
const ICONS: Record<string, ReactNode> = {
  tv: <><rect x="2.5" y="4.5" width="19" height="12.5" rx="2" /><path d="M8 20.5h8M12 17v3.5" /></>,
  phone: <><rect x="6.5" y="2.5" width="11" height="19" rx="2.5" /><path d="M10.5 18.5h3" /></>,
  laptop: <><rect x="4.5" y="5" width="15" height="10" rx="1.5" /><path d="M2.5 19h19l-1.5-4h-16z" /></>,
  fridge: <><rect x="5.5" y="2.5" width="13" height="19" rx="2" /><path d="M5.5 9.5h13M9 5.5v2M9 12.5v3" /></>,
  shirt: <path d="M8.5 3.5 4 6l1.8 4 2.2-1v11.5h8V9l2.2 1L20 6l-4.5-2.5a3.5 3.5 0 0 1-7 0Z" />,
  beauty: <><path d="M9 21.5h6v-9H9z" /><path d="M10 12.5V8.5l4-3v7" /><path d="M10 16.5h4" /></>,
  food: <><path d="M3.5 9.5h17l-1.6 10a2 2 0 0 1-2 1.5H7.1a2 2 0 0 1-2-1.5z" /><path d="m8.5 9.5 3-6M15.5 9.5l-3-6" /></>,
  power: <path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z" />,
};

const POPULAR: { name: string; icon: keyof typeof ICONS; tint: string }[] = [
  { name: "Phones & tablets", icon: "phone", tint: "#FFE9CC" },
  { name: "TV & audio", icon: "tv", tint: "#E3F1FC" },
  { name: "Fashion", icon: "shirt", tint: "#FCE4EC" },
  { name: "Beauty", icon: "beauty", tint: "#F3E5F5" },
  { name: "Food & drinks", icon: "food", tint: "#E6F4EA" },
  { name: "Home appliances", icon: "fridge", tint: "#FFF4D6" },
  { name: "Computers", icon: "laptop", tint: "#E8EAF6" },
  { name: "Power & solar", icon: "power", tint: "#FFF0E0" },
];

const TRUST: { illo: IlloName; title: string; text: string }[] = [
  { illo: "shield", title: "Verified stores", text: "Checked by Sotechy before they sell" },
  { illo: "card", title: "Pay your way", text: "Transfer, stablecoin or tokens" },
  { illo: "bike", title: "Delivery or pickup", text: "Track every step to your door" },
  { illo: "chat", title: "Real help", text: "Live chat with our team" },
];

const STEPS = [
  { n: "1", title: "Find it", text: "Search across many stores, compare prices, or make an offer where a store takes them." },
  { n: "2", title: "Pay safely", text: "Check out in one place. You pay through Sotechy, and we step in if an order doesn't arrive." },
  { n: "3", title: "Get it delivered", text: "Home delivery or pickup, with a notification at every step until it's in your hands." },
];

const FOOTER_LINKS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Shop",
    links: [
      { label: "Shop on the web", href: APP_URL },
      { label: "Phones & tablets", href: shopLink("Phones & tablets") },
      { label: "Fashion", href: shopLink("Fashion") },
      { label: "Home appliances", href: shopLink("Home appliances") },
      { label: "All categories", href: `${APP_URL}/shop` },
    ],
  },
  {
    title: "Sotechy",
    links: [
      { label: "Sell on Sotechy", href: MERCHANT_URL },
      { label: "Store tokens", href: "/rewards" },
      { label: "Help & support", href: "/support" },
    ],
  },
  {
    title: "Policies",
    links: [
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
      { label: "Payments", href: "/payments" },
      { label: "Delivery", href: "/delivery" },
      { label: "Returns & refunds", href: "/returns" },
    ],
  },
];

// The cards floating around the phones in the hero
const FLOAT: { illo: IlloName; label: string; style: CSSProperties }[] = [
  { illo: "shield", label: "Verified stores", style: { top: "10%", left: "-4%", "--tilt": "-4deg", animationDelay: "0s" } as CSSProperties },
  { illo: "coin", label: "+1 token per ₦1", style: { top: "46%", right: "-2%", "--tilt": "5deg", animationDelay: "1.4s" } as CSSProperties },
  { illo: "bike", label: "On its way", style: { bottom: "9%", left: "-2%", "--tilt": "3deg", animationDelay: "2.4s" } as CSSProperties },
];

function XLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function TikTokLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48Z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M2.5 12h19M12 2.5c2.6 2.6 3.9 5.8 3.9 9.5s-1.3 6.9-3.9 9.5c-2.6-2.6-3.9-5.8-3.9-9.5S9.4 5.1 12 2.5Z" />
    </svg>
  );
}

/** A shopfront, for selling on Sotechy */
const StoreIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3.5 9.5 5 4h14l1.5 5.5" />
    <path d="M3.5 9.5a2.8 2.8 0 0 0 5.6 0 2.8 2.8 0 0 0 5.8 0 2.8 2.8 0 0 0 5.6 0" />
    <path d="M5 12v8h14v-8M10 20v-5h4v5" />
  </svg>
);

const Arrow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

/** The App Store (out now, a link) and Google Play (coming soon, not a link) */
function StoreBadge({ store }: { store: "apple" | "google" }) {
  if (store === "apple") {
    return (
      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-14 flex-1 items-center gap-3 rounded-2xl bg-foreground px-4 text-white transition hover:bg-black"
      >
        <AppleLogo />
        <span className="leading-tight">
          <span className="block text-[11px] font-medium text-white/70">Download on the</span>
          <span className="block whitespace-nowrap font-display text-lg font-bold">App Store</span>
        </span>
      </a>
    );
  }
  return (
    <span aria-disabled title="Coming soon" className="relative inline-flex h-14 flex-1 cursor-default select-none items-center gap-3 rounded-2xl bg-foreground px-4 text-white">
      <PlayLogo />
      <span className="leading-tight">
        <span className="block text-[11px] font-medium text-white/70">Coming soon on</span>
        <span className="block whitespace-nowrap font-display text-lg font-bold">Google Play</span>
      </span>
      <span className="absolute -right-2 -top-2 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">Soon</span>
    </span>
  );
}

/** The store buttons side by side, and the web app under them */
function GetButtons({ center = false }: { center?: boolean }) {
  return (
    <div className={`flex w-full max-w-[380px] flex-col gap-3 ${center ? "mx-auto" : ""}`}>
      <div className="flex gap-3">
        <StoreBadge store="apple" />
        <StoreBadge store="google" />
      </div>
      <a
        href={APP_URL}
        className="inline-flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-brand px-6 font-display text-lg font-bold text-white shadow-[0_14px_30px_-12px_rgba(247,147,30,0.7)] transition hover:bg-brand-strong"
      >
        <GlobeIcon /> Shop on the web <Arrow />
      </a>
    </div>
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

const Heading = ({ children, sub }: { children: ReactNode; sub?: string }) => (
  <div>
    <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{children}</h2>
    {sub && <p className="mt-2 max-w-xl text-ink-2">{sub}</p>}
  </div>
);

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Warm glow behind the hero */}
      <div aria-hidden className="pointer-events-none absolute -top-48 left-1/2 h-[640px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,#ffe3b3,transparent)] opacity-80" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <Image src="/brand/light-logo-small.png" alt="Sotechy" width={194} height={97} priority className="h-9 w-auto sm:h-11" />
        <nav className="flex items-center gap-1.5 sm:gap-3">
          <a
            href={MERCHANT_URL}
            className="hidden h-10 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-semibold text-ink-2 transition hover:bg-white hover:text-foreground sm:inline-flex"
          >
            <StoreIcon /> Sell on Sotechy
          </a>
          <DownloadMenu />
        </nav>
      </header>

      <main className="relative">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-14 pt-8 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-16">
          <div>
            <h1 className="font-display text-[2.7rem] font-extrabold leading-[1.03] tracking-tight sm:text-6xl">
              Shop stores <br className="hidden sm:block" />
              you can <span className="text-brand">trust.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-2">
              Sotechy is a marketplace of verified Nigerian stores. Phones, fashion, beauty, groceries, home appliances and more, delivered to your door, with tokens you earn on every
              order.
            </p>
            <div className="mt-8">
              <GetButtons />
            </div>
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

        {/* Trust strip */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 rounded-[2rem] border border-line bg-white px-5 py-6 sm:px-8 lg:grid-cols-4">
            {TRUST.map((t) => (
              <div key={t.title} className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft">
                  <Illo name={t.illo} size={30} />
                </span>
                <span className="min-w-0">
                  <span className="block font-display font-bold leading-tight">{t.title}</span>
                  <span className="block text-[13px] leading-snug text-muted">{t.text}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Popular categories */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <Heading sub="Stores across Nigeria selling everything from TVs to groceries.">Popular categories</Heading>
            <a href={`${APP_URL}/shop`} className="hidden font-semibold text-brand-strong hover:underline sm:inline">
              All {MARKET_DEPARTMENTS.length} categories →
            </a>
          </div>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {POPULAR.map((c) => (
              <a
                key={c.name}
                href={shopLink(c.name)}
                className="group flex items-center gap-2.5 rounded-2xl border border-line bg-white p-2.5 transition sm:rounded-3xl hover:-translate-y-0.5 hover:border-brand hover:shadow-[0_18px_40px_-26px_rgba(23,18,14,0.4)] sm:gap-4 sm:p-4"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-foreground sm:h-14 sm:w-14 sm:rounded-2xl" style={{ background: c.tint }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6 sm:h-7 sm:w-7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    {ICONS[c.icon]}
                  </svg>
                </span>
                <span className="flex min-w-0 flex-1 items-center justify-between gap-2 font-display text-[14px] font-bold leading-tight group-hover:text-brand-strong sm:text-base">
                  {c.name}
                  <span className="hidden text-muted transition group-hover:translate-x-0.5 group-hover:text-brand-strong sm:inline">→</span>
                </span>
              </a>
            ))}
          </div>
          <a href={`${APP_URL}/shop`} className="mt-5 inline-block font-semibold text-brand-strong hover:underline sm:hidden">
            All {MARKET_DEPARTMENTS.length} categories →
          </a>
        </section>

        {/* How it works, with a store page beside it */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
            <div className="order-2 mx-auto w-full max-w-[300px] lg:order-1">
              <Phone src="/images/app/store.webp" alt="A store on Sotechy" />
            </div>
            <div className="order-1 lg:order-2">
              <Heading>How it works</Heading>
              <ol className="mt-7 space-y-6">
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
            </div>
          </div>
        </section>

        {/* Tokens */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand to-[#fdb913] px-6 py-10 sm:px-10 sm:py-12">
            <div aria-hidden className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/15" />
            <div aria-hidden className="absolute -bottom-16 right-24 h-44 w-44 rounded-full bg-white/10" />
            <div className="relative grid items-center gap-8 lg:grid-cols-[1.3fr_1fr]">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/25 px-3 py-1 text-sm font-semibold text-foreground">
                  <Illo name="coin" size={20} /> Store tokens
                </span>
                <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">Earn while you shop</h2>
                <p className="mt-3 max-w-lg text-lg text-foreground/80">
                  Every store on Sotechy has its own token. Earn 1 for every ₦1 you spend there, get extra when you review what you bought, and spend them at checkout like cash.
                </p>
              </div>
              {/* A worked example, the way the app shows it on a product */}
              <div className="rounded-3xl bg-white p-5 shadow-[0_24px_50px_-28px_rgba(120,60,0,0.6)]">
                <p className="text-sm font-semibold text-muted">You buy</p>
                <p className="font-display text-lg font-bold">Hisense 55&quot; 4K UHD Smart TV</p>
                <p className="font-display text-2xl font-extrabold">₦572,000</p>
                <div className="my-4 border-t border-dashed border-line" />
                <p className="text-sm font-semibold text-muted">You earn</p>
                <p className="flex items-center gap-2 font-display text-2xl font-extrabold text-brand-strong">
                  <Illo name="coin" size={30} /> 572,000 $SOTECHY
                </p>
                <p className="mt-1 text-sm text-muted">Released when your order is delivered</p>
              </div>
            </div>
          </div>
        </section>

        {/* Sellers */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="relative overflow-hidden rounded-[2rem] bg-foreground px-6 py-10 text-white sm:px-10 sm:py-12">
            <div aria-hidden className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand opacity-90" />
            <div aria-hidden className="absolute -right-4 top-24 h-40 w-40 rounded-full border-2 border-white/15" />
            <div className="relative max-w-xl">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white">
                  <Illo name="store" size={38} />
                </span>
                <h2 className="font-display text-3xl font-extrabold sm:text-4xl">Sell on Sotechy</h2>
              </div>
              <p className="mt-3 text-lg text-white/75">
                Open your store with its own token and reach customers across Nigeria. Businesses and freelancers are welcome: half of each order is paid upfront and the rest after
                delivery.
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
            <p className="mt-2 max-w-lg text-ink-2">Get the iPhone app on the App Store. The Android app is coming soon, and you can shop on the web today with the same account.</p>
            <div className="mt-7 w-full">
              <GetButtons center />
            </div>
          </div>
        </section>
      </main>

      <footer className="relative bg-foreground text-white">
        <div className="mx-auto max-w-6xl px-4 pb-8 pt-14 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[1.5fr_repeat(3,minmax(0,1fr))]">
            <div className="max-w-sm">
              <div className="flex items-center gap-2.5">
                <Image src="/brand/sotechy-icon-512.png" alt="" width={40} height={40} className="h-10 w-10 rounded-xl" />
                <span className="font-display text-2xl font-extrabold tracking-tight">Sotechy</span>
              </div>
              <p className="mt-4 leading-relaxed text-white/60">A marketplace of verified Nigerian stores, delivered to your door, with tokens on every order.</p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                <a
                  href={APP_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center gap-2.5 rounded-xl border border-white/20 px-3.5 transition hover:border-white/50 hover:bg-white/5"
                >
                  <AppleLogo size={18} />
                  <span className="leading-tight">
                    <span className="block text-[10px] text-white/60">Download on the</span>
                    <span className="block text-sm font-semibold">App Store</span>
                  </span>
                </a>
                <span aria-disabled className="inline-flex h-11 cursor-default items-center gap-2.5 rounded-xl border border-white/10 px-3.5 text-white/60">
                  <PlayLogo size={17} />
                  <span className="leading-tight">
                    <span className="block text-[10px]">Coming soon on</span>
                    <span className="block text-sm font-semibold">Google Play</span>
                  </span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-3">
              {FOOTER_LINKS.map((col) => (
                <nav key={col.title} aria-label={col.title}>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/40">{col.title}</h3>
                  <ul className="mt-4 space-y-3">
                    {col.links.map((l) => (
                      <li key={l.label}>
                        {l.href.startsWith("/") ? (
                          <Link href={l.href} className="text-[15px] text-white/75 transition hover:text-white">
                            {l.label}
                          </Link>
                        ) : (
                          <a href={l.href} className="text-[15px] text-white/75 transition hover:text-white">
                            {l.label}
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </nav>
              ))}
            </div>
          </div>

          <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-6 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {BUSINESS.name} · {BUSINESS.headOffice}
            </p>
            <div className="flex items-center gap-2">
              <a href={`mailto:${EMAIL}`} className="mr-2 transition hover:text-white">
                {EMAIL}
              </a>
              <a
                href={X_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Sotechy on X"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/75 transition hover:border-white/40 hover:text-white"
              >
                <XLogo size={14} />
              </a>
              <a
                href={TIKTOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Sotechy on TikTok"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/75 transition hover:border-white/40 hover:text-white"
              >
                <TikTokLogo size={15} />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
