// sotechy.shop: what Sotechy is and where to shop (the iPhone app, the web app, and the Android app coming soon).
// "Sunrise Market": the brand's sunrise stripes, ink outlines and stickers, with a little motion throughout.
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { anyCategory, BUSINESS, MARKET_DEPARTMENTS } from "@sotechy/shared";
import { DownloadMenu } from "@/components/download-menu";
import { APP_STORE_URL, AppleLogo, PlayLogo } from "@/components/store-logos";
import { TokenCounter } from "@/components/token-counter";

const APP_URL = "https://app.sotechy.shop";
const X_URL = "https://x.com/sotechyshop";
const TIKTOK_URL = "https://www.tiktok.com/@sotechyshop";
const EMAIL = "hello@sotechy.shop";
const MERCHANT_URL = "https://merchant.sotechy.shop";
const SELL_VIDEO_URL = "https://youtu.be/M8ooFskZfHI";

/** A department of the app's Shop screen, the same way the app's menu opens it */
function shopLink(name: string) {
  const d = MARKET_DEPARTMENTS.find((x) => x.name === name);
  if (!d) return `${APP_URL}/shop`;
  return `${APP_URL}/shop?category=${encodeURIComponent(anyCategory(...d.sections.flatMap((s) => s.items), ...(d.sotechy ?? [])))}&label=${encodeURIComponent(d.name)}`;
}

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

const MARQUEE_CATEGORIES = "PHONES ✶ FASHION ✶ BEAUTY ✶ GROCERIES ✶ HOME APPLIANCES ✶ POWER & SOLAR ✶ COMPUTERS ✶";
const MARQUEE_MOTTO = "SHOP ✶ EARN ✶ REPEAT ✶ SHOP ✶ EARN ✶ REPEAT ✶ SHOP ✶ EARN ✶ REPEAT ✶";

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

/** The arrow: drawn, in a round ink chip on buttons */
const ArrowIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
const Chip = ({ className = "" }: { className?: string }) => (
  <span className={`chip ${className}`}>
    <ArrowIcon />
  </span>
);

const Check = () => (
  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-[2.5px] border-foreground bg-[#FDB913]">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#17120E" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  </span>
);

/** The yellow hand-drawn line under a word, drawn in as the page opens */
const Underline = () => (
  <svg aria-hidden viewBox="0 0 300 30" preserveAspectRatio="none" className="absolute -bottom-3 left-0 h-5 w-full sm:-bottom-[18px] sm:h-[26px]">
    <path className="draw" d="M4 18 C 70 6, 140 26, 200 12 S 280 8, 296 16" fill="none" stroke="#FDB913" strokeWidth="7" strokeLinecap="round" />
  </svg>
);

/** The receipt's torn top and bottom edges */
function Zigzag({ flip = false }: { flip?: boolean }) {
  const points = Array.from({ length: 41 }, (_, i) => `${i * 10.5} ${i % 2 ? (flip ? 14 : 0) : 7}`).join(" L ");
  const d = flip ? `M0 0 L ${points} L420 0 Z` : `M0 14 L ${points} L420 14 Z`;
  return (
    <svg aria-hidden viewBox="0 0 420 14" width="100%" height="14" preserveAspectRatio="none" className="block">
      <path d={d} fill="#FFFFFF" />
    </svg>
  );
}

/** A step of "How it works": its picture, its big outlined number and its words */
function Step({ n, title, text, tint, children }: { n: string; title: string; text: string; tint: string; children: ReactNode }) {
  return (
    <div className="tile overflow-hidden rounded-[28px] border-[3px] border-foreground bg-white">
      <div className="border-b-[3px] border-foreground" style={{ background: tint }}>
        {children}
      </div>
      <div className="px-7 pb-8 pt-6">
        <div className="display text-[54px] text-transparent [-webkit-text-stroke:2px_#17120E]">{n}</div>
        <div className="display mt-1.5 text-3xl">{title}</div>
        <p className="mt-2.5 leading-relaxed text-ink-2">{text}</p>
      </div>
    </div>
  );
}

/** A category tile with its own drawing */
function Tile({ name, href, bg, className = "", children }: { name: ReactNode; href: string; bg: string; className?: string; children: ReactNode }) {
  return (
    <a href={href} className={`tile relative overflow-hidden rounded-[28px] border-[3px] border-foreground p-6 ${className}`} style={{ background: bg }}>
      <div className="display relative z-10 text-[26px] sm:text-[28px]">{name}</div>
      {children}
    </a>
  );
}

export default function Home() {
  return (
    <div className="overflow-hidden bg-[#FFF6EA]">
      {/* Announcement */}
      <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="block bg-foreground px-4 py-2.5 text-center text-[13px] text-[#FFF1DF]">
        <span className="mono text-[#FDB913]">New</span>&nbsp;&nbsp;The Sotechy app is live on the App Store&nbsp;&nbsp;
        <span className="arr">
          <ArrowIcon />
        </span>
      </a>

      {/* Nav */}
      <header className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-4 py-5 sm:px-8">
        <Image src="/brand/sotechy-logo.png" alt="Sotechy" width={900} height={248} priority className="h-10 w-auto sm:h-12" />
        <nav className="hidden items-center gap-8 text-[15px] font-medium md:flex">
          <a href="#how">How it works</a>
          <a href="#tokens">Tokens</a>
          <a href="#categories">Categories</a>
          <a href="#sell">Sell</a>
        </nav>
        <div className="flex items-center gap-2">
          <a href={MERCHANT_URL} className="hidden px-3 py-2 text-[15px] font-semibold sm:inline">
            Sell on Sotechy
          </a>
          <DownloadMenu />
        </div>
      </header>

      <main>
        {/* Hero: dark, with the sunrise */}
        <section className="relative mx-2.5 overflow-hidden rounded-[28px] bg-foreground text-[#FFF1DF] sm:mx-4 sm:rounded-[36px]">
          <svg aria-hidden width="100%" height="100%" className="absolute inset-0 opacity-[0.07]">
            <defs>
              <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.6" fill="#FFF1DF" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
          <div className="relative mx-auto grid max-w-[1240px] items-center gap-10 px-5 pt-12 sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-14 lg:pb-[72px] lg:pt-20">
            <div className="min-w-0">
              <h1 className="display text-[46px] sm:text-7xl lg:text-[84px] xl:text-[96px]">
                Shop stores
                <br />
                you can{" "}
                <span className="relative whitespace-nowrap text-brand">
                  trust.
                  <Underline />
                </span>
              </h1>
              <p className="mt-8 max-w-[520px] text-lg leading-relaxed text-[#FFF1DF]/70 sm:text-xl">
                Fashion, beauty, groceries, home appliances, phones and gadgets, and so much more from stores you can trust. Delivered to your door, with tokens you earn on every order.
              </p>
              {/* Both stores on one row, the web shop under them */}
              <div className="mt-9 flex w-full max-w-[440px] flex-col gap-3">
                <div className="flex gap-3">
                  <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="pop flex min-w-0 flex-1 items-center gap-2 rounded-[18px] border-2 border-[#FFF1DF] bg-[#FFF1DF] px-3 py-2.5 text-foreground sm:gap-3 sm:px-[18px] sm:py-3">
                    <AppleLogo size={22} />
                    <span className="leading-tight">
                      <span className="block text-[11px] opacity-70">Download on the</span>
                      <span className="display block whitespace-nowrap text-base tracking-normal sm:text-xl">App Store</span>
                    </span>
                  </a>
                  <span aria-disabled className="relative flex min-w-0 flex-1 cursor-default items-center gap-2 rounded-[18px] border-2 border-[#FFF1DF]/35 px-3 py-2.5 sm:gap-3 sm:px-[18px] sm:py-3">
                    <PlayLogo size={22} />
                    <span className="leading-tight">
                      <span className="block text-[11px] opacity-70">Coming soon on</span>
                      <span className="display block whitespace-nowrap text-base tracking-normal sm:text-xl">Google Play</span>
                    </span>
                    <span className="mono absolute -right-2 -top-3 rounded-full border-2 border-foreground bg-[#FDB913] px-2 py-0.5 text-[10px] tracking-[0.08em] text-foreground">Soon</span>
                  </span>
                </div>
                <a href={APP_URL} className="pop display flex min-h-[60px] items-center justify-center gap-3 rounded-[18px] border-2 border-brand bg-brand pl-6 pr-3.5 text-xl tracking-normal text-foreground">
                  Shop on the web <Chip />
                </a>
              </div>
            </div>

            {/* The sunrise, the phone and the stickers. On phones only the top half of the phone rises out of it. */}
            <div className="relative -mx-5 h-[340px] overflow-hidden sm:mx-0 lg:h-[600px] lg:overflow-visible">
              <div className="absolute bottom-10 left-1/2 -ml-[270px] h-[270px] w-[540px] origin-bottom scale-[0.8] overflow-hidden lg:bottom-[130px] lg:scale-100">
                <div className="rise absolute left-0 top-0 h-[540px] w-[540px] rounded-full bg-gradient-to-b from-[#FDB913] to-[#F27405]" />
                <div className="stripe absolute left-0 top-[176px] h-3.5 w-full bg-foreground" style={{ animationDelay: "0.9s" }} />
                <div className="stripe absolute left-0 top-[206px] h-[18px] w-full bg-foreground" style={{ animationDelay: "1.02s" }} />
                <div className="stripe absolute left-0 top-[240px] h-[22px] w-full bg-foreground" style={{ animationDelay: "1.14s" }} />
              </div>
              <div className="absolute bottom-9 left-0 right-0 h-1.5 rounded bg-[#FFF1DF] lg:bottom-[124px]" />
              <div className="absolute -bottom-[300px] left-1/2 -ml-[115px] w-[230px] lg:bottom-5 lg:-ml-[130px] lg:w-[260px]">
                <div className="floaty rounded-[42px] border-2 border-[#3A2F27] bg-foreground p-[11px] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)]" style={{ "--r": "-4deg" } as CSSProperties}>
                  <Image src="/images/app/home.webp" alt="The Sotechy app's home screen" width={720} height={1520} priority className="block h-auto w-full rounded-[32px]" />
                </div>
              </div>
              <div className="floaty absolute left-3.5 top-[60px] flex items-center gap-2.5 rounded-[18px] border-[3px] border-foreground bg-[#FFF1DF] px-4 py-2.5 font-bold text-foreground shadow-[5px_5px_0_#F7931E] lg:-left-2.5 lg:top-[150px]" style={{ "--r": "-7deg", animationDelay: "0.8s" } as CSSProperties}>
                <span className="coin-spin wordmark flex h-[30px] w-[30px] items-center justify-center rounded-full border-[2.5px] border-foreground bg-[#FDB913] text-[15px]">S</span>
                +1 token per ₦1
              </div>
              <div className="floaty absolute right-3.5 top-[150px] flex items-center gap-2.5 rounded-[18px] border-[3px] border-foreground bg-brand px-4 py-2.5 font-bold text-foreground shadow-[5px_5px_0_#FFF1DF] lg:-right-1.5 lg:bottom-[210px] lg:top-auto" style={{ "--r": "6deg", animationDelay: "1.6s" } as CSSProperties}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#17120E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="5.5" cy="17" r="3" />
                  <circle cx="18.5" cy="17" r="3" />
                  <path d="M8.5 17h6l3-6h-4l-2-4H9" />
                </svg>
                On its way
              </div>
            </div>
          </div>
        </section>

        {/* Marquee bands */}
        <div aria-hidden className="relative mt-11 h-[150px] sm:h-[190px]">
          <div className="absolute -left-[2%] top-[18px] w-[104%] rotate-2 overflow-hidden border-y-[3px] border-foreground bg-[#FDB913] py-3 sm:py-4">
            <div className="marquee-rev display text-2xl sm:text-[34px]">
              <span className="px-5">{MARQUEE_MOTTO}</span>
              <span className="px-5">{MARQUEE_MOTTO}</span>
            </div>
          </div>
          <div className="absolute -left-[2%] top-[62px] w-[104%] -rotate-2 overflow-hidden border-y-[3px] border-foreground bg-brand py-4 sm:top-[74px] sm:py-5">
            <div className="marquee display text-[34px] sm:text-[50px]">
              <span className="px-5">{MARQUEE_CATEGORIES}</span>
              <span className="px-5">{MARQUEE_CATEGORIES}</span>
            </div>
          </div>
        </div>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-[1240px] px-4 pb-10 pt-20 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <div className="mono text-[13px] text-[#C96A05]">How it works</div>
              <h2 className="display mt-3 text-5xl sm:text-7xl">
                Three steps.
                <br />
                No wahala.
              </h2>
            </div>
            <p className="max-w-[380px] text-[17px] leading-relaxed text-ink-2">One checkout across many stores, with Sotechy between you and the seller the whole way.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <Step n="01" title="Find it" tint="#FFE9CC" text="Search every store, compare prices and read real reviews. Make an offer where a store takes them.">
              <svg viewBox="0 0 360 220" width="100%" role="img" aria-label="A magnifier sweeping over a row of shops" className="block">
                <rect x="0" y="182" width="360" height="38" fill="#F7C58A" />
                <g stroke="#17120E" strokeWidth="3" strokeLinejoin="round">
                  <rect x="26" y="92" width="94" height="90" fill="#FFFFFF" />
                  <path d="M20 76h106v20H20z" fill="#F7931E" />
                  <path d="M41 76v20M62 76v20M83 76v20M104 76v20" stroke="#FFF1DF" strokeWidth="8" />
                  <path d="M20 76h106v20H20z" fill="none" />
                  <rect x="60" y="134" width="26" height="48" fill="#FDB913" />
                  <rect x="134" y="70" width="94" height="112" fill="#FFFFFF" />
                  <path d="M128 54h106v20H128z" fill="#17120E" />
                  <rect x="150" y="96" width="62" height="34" fill="#E3F1FC" />
                  <rect x="168" y="140" width="26" height="42" fill="#F27405" />
                  <rect x="242" y="98" width="94" height="84" fill="#FFFFFF" />
                  <path d="M236 82h106v20H236z" fill="#FDB913" />
                  <path d="M257 82v20M278 82v20M299 82v20M320 82v20" stroke="#FFF1DF" strokeWidth="8" />
                  <path d="M236 82h106v20H236z" fill="none" />
                  <rect x="276" y="138" width="26" height="44" fill="#F7931E" />
                </g>
                <g className="sweep">
                  <circle cx="70" cy="120" r="34" fill="rgba(255, 255, 255, 0.45)" stroke="#17120E" strokeWidth="6" />
                  <path d="M94 144l26 26" stroke="#17120E" strokeWidth="10" strokeLinecap="round" />
                </g>
              </svg>
            </Step>
            <Step n="02" title="Pay safely" tint="#E3F1FC" text="Transfer, stablecoin or tokens. You pay Sotechy, never the store, and we step in if anything goes wrong.">
              <svg viewBox="0 0 360 220" width="100%" role="img" aria-label="A naira coin dropping into a phone with a shield" className="block">
                <g stroke="#17120E" strokeWidth="3" strokeLinejoin="round">
                  <rect x="128" y="40" width="104" height="180" rx="18" fill="#17120E" />
                  <rect x="138" y="52" width="84" height="168" rx="10" fill="#FFF6EA" />
                  <path d="M180 86l32 12v24c0 22-14 36-32 44-18-8-32-22-32-44V98z" fill="#1C8A4C" />
                  <path d="M166 124l10 10 20-22" fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
                </g>
                <g className="drop">
                  <circle cx="268" cy="70" r="24" fill="#FDB913" stroke="#17120E" strokeWidth="3" />
                  <text x="268" y="79" textAnchor="middle" fontFamily="DM Sans, sans-serif" fontWeight="700" fontSize="26" fill="#17120E">
                    ₦
                  </text>
                </g>
                <circle cx="86" cy="70" r="12" fill="#F7931E" stroke="#17120E" strokeWidth="3" />
              </svg>
            </Step>
            <Step n="03" title="Delivered" tint="#E6F4EA" text="To your door or a pickup point near you, with a notification at every step until it's in your hands.">
              <svg viewBox="0 0 360 220" width="100%" role="img" aria-label="A delivery rider on the road" className="block">
                <rect x="0" y="170" width="360" height="50" fill="#3A2F27" />
                <line className="road" x1="0" y1="196" x2="360" y2="196" stroke="#FFF1DF" strokeWidth="5" strokeDasharray="18 10" />
                <g className="ride">
                  <path d="M60 120h-26M70 136h-40M58 152h-20" stroke="#17120E" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
                  <g stroke="#17120E" strokeWidth="3" strokeLinejoin="round">
                    <rect x="104" y="82" width="56" height="46" rx="6" fill="#F7931E" />
                    <path d="M112 96h40" stroke="#FFF1DF" strokeWidth="5" />
                    <path d="M98 148h118l18-34h-26l-14-24" fill="#FDB913" />
                    <circle cx="196" cy="62" r="16" fill="#C96A05" />
                    <path d="M184 52h26" strokeWidth="6" strokeLinecap="round" />
                    <path d="M196 78l-6 36h24" fill="none" strokeWidth="10" strokeLinecap="round" />
                  </g>
                  <g className="wheel">
                    <circle cx="112" cy="156" r="20" fill="#17120E" />
                    <circle cx="112" cy="156" r="8" fill="#FFF1DF" />
                    <path d="M112 136v40M92 156h40" stroke="#FFF1DF" strokeWidth="3" />
                  </g>
                  <g className="wheel">
                    <circle cx="232" cy="156" r="20" fill="#17120E" />
                    <circle cx="232" cy="156" r="8" fill="#FFF1DF" />
                    <path d="M232 136v40M212 156h40" stroke="#FFF1DF" strokeWidth="3" />
                  </g>
                </g>
              </svg>
            </Step>
          </div>
        </section>

        {/* Money held safely */}
        <section className="mx-auto max-w-[1240px] px-4 pb-10 pt-16 sm:px-8">
          <div className="grid items-center gap-10 rounded-[36px] border-[3px] border-foreground bg-white p-6 shadow-[6px_8px_0_#17120E] sm:p-14 sm:shadow-[10px_12px_0_#17120E] lg:grid-cols-2">
            <div className="min-w-0">
              <div className="mono text-[13px] text-[#C96A05]">Buyer protection</div>
              <h2 className="display mt-3 text-[42px] sm:text-6xl">
                You pay Sotechy.
                <br />
                <span className="text-brand">Never the store.</span>
              </h2>
              <div className="mt-8 flex flex-col gap-3.5 text-[17px]">
                <div className="flex items-center gap-3.5">
                  <Check />
                  Every store is checked before it can sell
                </div>
                <div className="flex items-center gap-3.5">
                  <Check />
                  Your money is held until the order goes through
                </div>
                <div className="flex items-center gap-3.5">
                  <Check />
                  If an order doesn&apos;t arrive, we step in
                </div>
              </div>
            </div>
            <div className="relative h-[230px] rounded-[28px] bg-foreground text-[#FFF1DF] sm:h-[300px]">
              <svg aria-hidden width="100%" height="40" className="absolute left-0 top-[64px] sm:top-[105px]">
                <line className="flow" x1="17%" y1="20" x2="83%" y2="20" stroke="rgba(255, 241, 223, 0.35)" strokeWidth="4" strokeDasharray="10 8" />
              </svg>
              <div className="absolute inset-x-0 top-[50px] flex text-center text-sm font-bold sm:top-[70px] sm:text-base">
                <div className="w-1/3">
                  <div className="mx-auto flex h-[68px] w-[68px] items-center justify-center rounded-full bg-[#FFF1DF] sm:h-[110px] sm:w-[110px]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#17120E" strokeWidth="2" strokeLinecap="round" aria-hidden className="h-9 w-9 sm:h-14 sm:w-14">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4.5 20.5c1.2-4 4-6 7.5-6s6.3 2 7.5 6" />
                    </svg>
                  </div>
                  <div className="mt-3">You</div>
                </div>
                <div className="w-1/3">
                  <div className="pulse-soft mx-auto flex h-[68px] w-[68px] items-center justify-center rounded-full bg-[#FDB913] sm:h-[110px] sm:w-[110px]">
                    <Image src="/brand/sotechy-mark.svg" alt="" width={62} height={70} className="h-9 w-auto sm:h-[62px]" />
                  </div>
                  <div className="mt-3">Sotechy</div>
                </div>
                <div className="w-1/3">
                  <div className="mx-auto flex h-[68px] w-[68px] items-center justify-center rounded-full bg-[#FFF1DF] sm:h-[110px] sm:w-[110px]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#17120E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-9 w-9 sm:h-14 sm:w-14">
                      <path d="M3.5 9.5 5 4h14l1.5 5.5" />
                      <path d="M3.5 9.5a2.8 2.8 0 0 0 5.6 0 2.8 2.8 0 0 0 5.8 0 2.8 2.8 0 0 0 5.6 0" />
                      <path d="M5 12v8h14v-8M10 20v-5h4v5" />
                    </svg>
                  </div>
                  <div className="mt-3">The store</div>
                </div>
              </div>
              <div className="travel absolute top-[70px] whitespace-nowrap rounded-full border-[2.5px] border-foreground bg-brand px-2.5 py-1 text-xs font-bold text-foreground sm:top-[106px] sm:px-3.5 sm:py-1.5 sm:text-[15px]">₦572,000</div>
              <div className="mono absolute inset-x-0 bottom-6 text-center text-xs text-[#FDB913]">Held safely by Sotechy</div>
            </div>
          </div>
        </section>

        {/* Tokens */}
        <section id="tokens" className="relative mx-2.5 mt-16 overflow-hidden rounded-[28px] border-[3px] border-foreground bg-brand sm:mx-4 sm:rounded-[36px]">
          <div aria-hidden className="absolute -right-[120px] -top-[120px] h-[460px] w-[460px] rounded-full border-[3px] border-foreground/15" />
          <div aria-hidden className="absolute -right-10 -top-10 h-[300px] w-[300px] rounded-full border-[3px] border-foreground/15" />
          <div className="relative mx-auto grid max-w-[1240px] items-center gap-14 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-2">
            <div className="min-w-0">
              <div className="mono text-[13px]">Store tokens</div>
              <h2 className="display mt-3 text-[52px] sm:text-[84px]">
                Earn while
                <br />
                <span className="text-[#FFF1DF] [-webkit-text-stroke:2px_#17120E]">you shop.</span>
              </h2>
              <p className="mt-6 max-w-[470px] text-lg leading-relaxed sm:text-[19px]">Every store has its own token. Earn 1 for every ₦1 you spend, get extra for reviews, and spend them at checkout like cash.</p>
              <div className="mt-7 flex flex-wrap gap-2.5 font-bold">
                <span className="rounded-full bg-foreground px-5 py-3 text-[#FFF1DF]">1 token for every ₦1</span>
                <span className="rounded-full border-[2.5px] border-foreground bg-[#FFF1DF] px-[18px] py-2.5">Extra for reviews</span>
                <span className="rounded-full border-[2.5px] border-foreground bg-[#FFF1DF] px-[18px] py-2.5">+10% $SOTECHY at other stores</span>
              </div>
            </div>
            {/* A receipt */}
            <div className="relative w-full max-w-[420px] justify-self-center">
              <div className="coin-spin wordmark absolute -right-3 -top-11 z-10 flex h-[110px] w-[110px] items-center justify-center rounded-full border-4 border-foreground bg-[#FDB913] text-[54px] text-[#C97A0A] shadow-[inset_0_-10px_0_#E9A21A] sm:-right-[34px] sm:h-32 sm:w-32 sm:text-[62px]">S</div>
              <div className="-rotate-[2.5deg] [filter:drop-shadow(10px_12px_0_#17120E)]">
                <Zigzag />
                <div className="bg-white px-8 py-6">
                  <div className="mono text-center text-xs text-muted">Sotechy receipt · order SO-1024</div>
                  <div className="my-4 border-t-2 border-dashed border-line" />
                  <div className="flex justify-between gap-3">
                    <span>Hisense 55&quot; 4K Smart TV</span>
                    <b>₦572,000</b>
                  </div>
                  <div className="mt-2 flex justify-between gap-3 text-muted">
                    <span>Delivery to Benin City</span>
                    <span>₦3,000</span>
                  </div>
                  <div className="my-4 border-t-2 border-dashed border-line" />
                  <div className="mono text-xs text-muted">You earn</div>
                  <div className="display mt-1.5 text-[44px] text-[#F27405]">
                    <TokenCounter to={572000} />
                  </div>
                  <div className="display mt-0.5 text-[22px]">$SOTECHY</div>
                  <div className="mt-2.5 text-[13px] text-muted">Released when your order is delivered</div>
                  <svg aria-hidden viewBox="0 0 200 40" width="100%" height="40" className="mt-4 block">
                    <g fill="#17120E">
                      {[0, 6, 10, 17, 22, 26, 34, 39, 45, 49, 56, 61, 65, 73, 79, 83, 90, 95, 101, 105, 113, 118, 122, 129, 135, 139, 147, 152, 158, 162, 169, 174, 178, 186, 192, 196].map((x, i) => (
                        <rect key={x} x={x} y="0" width={[3, 1.5, 4, 2, 1.5, 5][i % 6]} height="40" />
                      ))}
                    </g>
                  </svg>
                </div>
                <Zigzag flip />
              </div>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section id="categories" className="mx-auto max-w-[1240px] px-4 pb-10 pt-24 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <div className="mono text-[13px] text-[#C96A05]">{MARKET_DEPARTMENTS.length} categories</div>
              <h2 className="display mt-3 text-5xl sm:text-7xl">
                Everything
                <br />
                Nigeria shops for.
              </h2>
            </div>
            <a href={`${APP_URL}/shop`} className="pop inline-flex items-center gap-2.5 rounded-full border-[2.5px] border-foreground bg-white py-2 pl-5 pr-2 font-bold">
              All categories <Chip className="!h-[30px] !w-[30px] !text-white" />
            </a>
          </div>
          <div className="mt-11 grid auto-rows-[170px] grid-cols-2 gap-4 md:auto-rows-[230px] md:grid-cols-4">
            <a href={shopLink("Home appliances")} className="tile relative col-span-2 flex flex-col justify-between overflow-hidden rounded-[28px] border-[3px] border-foreground bg-[#FDB913] p-7 md:row-span-2">
              <div className="relative z-10">
                <div className="display text-[34px] sm:text-[44px]">
                  Home
                  <br />
                  appliances
                </div>
                <div className="mt-2 font-semibold">
                  From every verified store{" "}
                  <span className="arr">
                    <ArrowIcon />
                  </span>
                </div>
              </div>
              <svg aria-hidden viewBox="0 0 300 260" className="absolute -bottom-1.5 right-3 w-[30%] md:right-5 md:w-[60%]">
                <g stroke="#17120E" strokeWidth="5" strokeLinejoin="round">
                  <rect x="40" y="20" width="110" height="236" rx="14" fill="#FFF6EA" />
                  <path d="M40 104h110" />
                  <path d="M128 50v30M128 128v40" strokeWidth="8" strokeLinecap="round" />
                  <rect x="164" y="120" width="120" height="136" rx="14" fill="#FFFFFF" />
                  <path d="M164 150h120" />
                  <circle cx="184" cy="135" r="5" fill="#17120E" />
                  <circle cx="202" cy="135" r="5" fill="#F7931E" />
                  <circle cx="224" cy="204" r="36" fill="#E3F1FC" />
                  <path d="M200 208c14-10 32 6 48-4" fill="none" stroke="#2F6FB3" strokeWidth="5" strokeLinecap="round" />
                </g>
              </svg>
            </a>
            <Tile name="Fashion" href={shopLink("Fashion")} bg="#FCE4EC">
              <svg aria-hidden viewBox="0 0 120 110" className="absolute bottom-2.5 right-3.5 w-1/2">
                <path d="M38 10 12 24l10 24 12-6v58h52V42l12 6 10-24-26-14a22 22 0 0 1-44 0Z" fill="#F7931E" stroke="#17120E" strokeWidth="5" strokeLinejoin="round" />
              </svg>
            </Tile>
            <Tile name="Beauty" href={shopLink("Beauty")} bg="#F3E5F5">
              <svg aria-hidden viewBox="0 0 120 120" className="absolute bottom-2 right-4 w-[42%]">
                <g stroke="#17120E" strokeWidth="5" strokeLinejoin="round">
                  <rect x="38" y="60" width="44" height="56" rx="6" fill="#17120E" />
                  <path d="M44 60V34l30-22v48z" fill="#E0457B" />
                  <rect x="34" y="56" width="52" height="12" rx="4" fill="#FDB913" />
                </g>
              </svg>
            </Tile>
            <Tile name="Groceries" href={shopLink("Food & drinks")} bg="#E6F4EA">
              <svg aria-hidden viewBox="0 0 140 120" className="absolute bottom-1.5 right-3 w-[54%]">
                <g stroke="#17120E" strokeWidth="5" strokeLinejoin="round">
                  <circle cx="50" cy="44" r="22" fill="#F27405" />
                  <path d="M78 18c10 6 14 18 10 30" fill="none" strokeLinecap="round" />
                  <ellipse cx="92" cy="44" rx="14" ry="24" fill="#1C8A4C" />
                  <path d="M14 56h112l-12 56H26z" fill="#FDB913" />
                  <path d="M48 70v30M70 70v30M92 70v30" strokeLinecap="round" />
                </g>
              </svg>
            </Tile>
            <Tile
              name={
                <>
                  Phones &amp;
                  <br />
                  gadgets
                </>
              }
              href={shopLink("Phones & tablets")}
              bg="#E3F1FC"
            >
              <svg aria-hidden viewBox="0 0 140 120" className="absolute bottom-1.5 right-3 w-[52%]">
                <g stroke="#17120E" strokeWidth="5" strokeLinejoin="round">
                  <rect x="58" y="6" width="54" height="108" rx="12" fill="#17120E" />
                  <rect x="65" y="16" width="40" height="80" rx="6" fill="#FFF6EA" />
                  <rect x="71" y="24" width="28" height="20" rx="4" fill="#F7931E" />
                  <path d="M71 56h28M71 66h18" strokeWidth="5" strokeLinecap="round" />
                  <path d="M20 70a12 12 0 1 1 18 10v20" fill="#FFFFFF" strokeLinecap="round" />
                  <path d="M30 96h12" strokeLinecap="round" />
                </g>
              </svg>
            </Tile>
          </div>
        </section>

        {/* Sellers */}
        <section id="sell" className="relative mx-2.5 mt-20 overflow-hidden rounded-[28px] bg-foreground text-[#FFF1DF] sm:mx-4 sm:rounded-[36px]">
          <div className="relative mx-auto grid max-w-[1240px] items-center gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-2">
            <svg viewBox="0 0 520 440" width="100%" role="img" aria-label="A shopfront with a swinging Your Store sign">
              <rect x="0" y="400" width="520" height="40" fill="#3A2F27" />
              <g stroke="#FFF1DF" strokeWidth="4" strokeLinejoin="round">
                <rect x="70" y="170" width="380" height="232" fill="#FFF6EA" />
                <path d="M50 120h420v58H50z" fill="#F7931E" />
                <path d="M102 120v58M155 120v58M208 120v58M261 120v58M314 120v58M367 120v58M420 120v58" stroke="#FFF1DF" strokeWidth="22" />
                <path d="M50 120h420v58H50z" fill="none" />
                <path d="M50 178c13 22 39 22 52 0 13 22 39 22 53 0 13 22 39 22 53 0 13 22 39 22 53 0 13 22 39 22 53 0 13 22 39 22 53 0 13 22 39 22 53 0" fill="#F7931E" />
                <rect x="104" y="226" width="170" height="120" rx="8" fill="#3A2914" />
                <rect x="124" y="268" width="48" height="78" fill="#FDB913" />
                <rect x="186" y="292" width="64" height="54" fill="#F27405" />
                <rect x="310" y="226" width="104" height="176" fill="#F27405" />
                <circle cx="396" cy="320" r="7" fill="#FFF1DF" />
              </g>
              <g className="swing">
                <path d="M210 36v40M310 36v40" stroke="#FFF1DF" strokeWidth="4" />
                <rect x="176" y="72" width="168" height="48" rx="12" fill="#FFF1DF" />
                <text x="260" y="104" textAnchor="middle" fontFamily="var(--font-heading), sans-serif" fontWeight="800" fontSize="24" fill="#17120E">
                  YOUR STORE
                </text>
              </g>
              <circle cx="470" cy="60" r="30" fill="#FDB913" />
            </svg>
            <div className="min-w-0">
              <div className="mono text-[13px] text-[#FDB913]">For businesses and freelancers</div>
              <h2 className="display mt-3 text-[56px] sm:text-[80px]">
                Sell on
                <br />
                <span className="text-brand">Sotechy.</span>
              </h2>
              <div className="mt-8 flex flex-col gap-4 text-lg">
                <div className="flex gap-4">
                  <span className="mono pt-1 text-sm text-[#FDB913]">01</span>Your own storefront, with your logo, colours and a verified badge
                </div>
                <div className="flex gap-4">
                  <span className="mono pt-1 text-sm text-[#FDB913]">02</span>Customers pay Sotechy, so you never chase a payment
                </div>
                <div className="flex gap-4">
                  <span className="mono pt-1 text-sm text-[#FDB913]">03</span>Your own store token, so customers keep coming back
                </div>
              </div>
              <div className="mt-9 flex flex-wrap gap-3">
                <a href={MERCHANT_URL} className="pop display inline-flex min-h-[58px] items-center gap-3 rounded-[18px] border-2 border-brand bg-brand pl-6 pr-3 text-[19px] tracking-normal text-foreground">
                  Open your store <Chip />
                </a>
                <a href={SELL_VIDEO_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[58px] items-center gap-2.5 rounded-[18px] border-2 border-[#FFF1DF]/35 px-5 font-bold">
                  <span className="flex h-[22px] w-[30px] items-center justify-center rounded-md bg-[#FF0000]">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden>
                      <path d="M7 4.5v15l13-7.5z" />
                    </svg>
                  </span>
                  Watch the video
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Get the app */}
        <section id="get" className="mx-auto max-w-[1240px] px-4 pb-20 pt-24 sm:px-8">
          <div className="grid items-end overflow-hidden rounded-[36px] border-[3px] border-foreground bg-[#FDB913] px-6 pt-10 sm:px-14 sm:pt-14 lg:grid-cols-2">
            <div className="min-w-0 pb-10 sm:pb-14">
              <h2 className="display text-[56px] sm:text-[88px]">Get the app.</h2>
              <p className="mt-4 max-w-[430px] text-lg leading-relaxed sm:text-[19px]">Shop, track your orders and spend your tokens. The same account works on the web at sotechy.shop.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="pop inline-flex items-center gap-3 rounded-[18px] border-2 border-foreground bg-foreground px-5 py-3 text-[#FFF1DF]">
                  <AppleLogo size={24} />
                  <span className="leading-tight">
                    <span className="block text-[11px] opacity-70">Download on the</span>
                    <span className="display block text-xl tracking-normal">App Store</span>
                  </span>
                </a>
                <span aria-disabled className="inline-flex cursor-default items-center gap-3 rounded-[18px] border-2 border-dashed border-foreground bg-[#FFF1DF] px-5 py-3">
                  <PlayLogo size={22} />
                  <span className="leading-tight">
                    <span className="block text-[11px] opacity-70">Coming soon on</span>
                    <span className="display block text-xl tracking-normal">Google Play</span>
                  </span>
                </span>
              </div>
            </div>
            <div className="relative h-[300px] sm:h-[430px]">
              <div className="floaty absolute -bottom-[90px] left-[6%] w-[170px] rounded-[34px] border-[3px] border-foreground bg-foreground p-2 sm:w-[230px] sm:rounded-[40px] sm:p-2.5" style={{ "--r": "-8deg" } as CSSProperties}>
                <Image src="/images/app/product.webp" alt="A product in the Sotechy app" width={720} height={1520} className="block h-auto w-full rounded-[26px] sm:rounded-[31px]" />
              </div>
              <div className="floaty absolute -bottom-[60px] right-[4%] w-[180px] rounded-[34px] border-[3px] border-foreground bg-foreground p-2 sm:w-[240px] sm:rounded-[40px] sm:p-2.5" style={{ "--r": "6deg", animationDelay: "1.2s" } as CSSProperties}>
                <Image src="/images/app/store.webp" alt="A store on Sotechy" width={720} height={1520} className="block h-auto w-full rounded-[26px] sm:rounded-[31px]" />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="overflow-hidden bg-foreground pt-16 text-[#FFF1DF]">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-8">
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-[1.2fr_repeat(3,minmax(0,1fr))] lg:gap-12">
            <div className="col-span-2 lg:col-span-1">
              <div className="display text-4xl">
                Shop stores you can <span className="text-brand">trust.</span>
              </div>
              <div className="mt-6 flex items-center gap-2">
                <a href={`mailto:${EMAIL}`} className="mr-2 text-[#FFF1DF]/70 transition hover:text-white">
                  {EMAIL}
                </a>
                <a href={X_URL} target="_blank" rel="noopener noreferrer" aria-label="Sotechy on X" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 transition hover:border-white/50">
                  <XLogo size={14} />
                </a>
                <a href={TIKTOK_URL} target="_blank" rel="noopener noreferrer" aria-label="Sotechy on TikTok" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 transition hover:border-white/50">
                  <TikTokLogo size={15} />
                </a>
              </div>
            </div>
            {FOOTER_LINKS.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <h3 className="mono text-xs text-[#FDB913]">{col.title}</h3>
                <ul className="mt-4 space-y-3">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      {l.href.startsWith("/") ? (
                        <Link href={l.href} className="text-[15px] text-[#FFF1DF]/75 transition hover:text-white">
                          {l.label}
                        </Link>
                      ) : (
                        <a href={l.href} className="text-[15px] text-[#FFF1DF]/75 transition hover:text-white">
                          {l.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
          <p className="mt-14 border-t border-white/10 pt-6 text-sm text-[#FFF1DF]/50">
            © {BUSINESS.name} · {BUSINESS.headOffice}
          </p>
        </div>
        <div aria-hidden className="wordmark mt-10 translate-y-[14%] bg-gradient-to-r from-[#F27405] via-[#F7931E] to-[#FDB913] bg-clip-text text-center text-[22vw] leading-[0.8] tracking-[-0.04em] text-transparent">
          SoTechy
        </div>
      </footer>
    </div>
  );
}
