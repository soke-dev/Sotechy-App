import type { CSSProperties, ReactNode } from "react";
import { WhySell } from "./why-sell";

const POINTS = [
  "Orders, offers and payouts in one dashboard",
  "Customers pay Sotechy, so you never chase a payment",
  "Your own store token keeps customers coming back",
];

/** The arrow at the end of a main button, in a round ink chip */
export function ArrowChip() {
  return (
    <span className="chip">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </span>
  );
}

/** A tilted sticker floating over the shopfront */
export function Sticker({ children, tone = "cream", className = "", style }: { children: ReactNode; tone?: "cream" | "sun"; className?: string; style?: CSSProperties }) {
  return (
    <div
      className={`auth-floaty absolute flex items-center gap-2.5 rounded-2xl border-[3px] border-[#17120E] px-3.5 py-2 text-sm font-bold text-[#17120E] ${tone === "sun" ? "bg-sun shadow-[4px_4px_0_#FFF1DF]" : "bg-[#FFF1DF] shadow-[4px_4px_0_#F7931E]"} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

const DEFAULT_STICKERS = (
  <>
    <Sticker className="left-0 top-[4%]" style={{ "--r": "-6deg" } as CSSProperties}>
      <span className="flex h-[26px] w-[26px] items-center justify-center rounded-lg border-2 border-[#17120E] bg-brand">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#17120E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 7h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z" />
        </svg>
      </span>
      New order · ₦572,000
    </Sticker>
    <Sticker tone="sun" className="right-0 top-[22%]" style={{ "--r": "5deg", animationDelay: "1.4s" } as CSSProperties}>
      Your own $TOKEN
    </Sticker>
  </>
);

/** The rising sun behind a shopfront with a swinging "YOUR STORE" sign */
function Shopfront() {
  return (
    <svg viewBox="0 0 460 340" width="100%" height="100%" preserveAspectRatio="xMidYMax meet" role="img" aria-label="A shopfront in front of a rising sun">
      <defs>
        <clipPath id="auth-sun">
          <rect x="0" y="0" width="460" height="300" />
        </clipPath>
        <linearGradient id="auth-sun-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FDB913" />
          <stop offset="1" stopColor="#F27405" />
        </linearGradient>
      </defs>
      <g clipPath="url(#auth-sun)">
        <circle className="auth-rise" cx="230" cy="300" r="200" fill="url(#auth-sun-fill)" style={{ transformBox: "fill-box" }} />
      </g>
      <rect className="auth-stripe" x="30" y="236" width="400" height="9" fill="#17120E" style={{ animationDelay: "0.8s" }} />
      <rect className="auth-stripe" x="30" y="256" width="400" height="11" fill="#17120E" style={{ animationDelay: "0.92s" }} />
      <rect className="auth-stripe" x="30" y="279" width="400" height="13" fill="#17120E" style={{ animationDelay: "1.04s" }} />
      <rect x="10" y="298" width="440" height="5" rx="2.5" fill="#FFF1DF" />
      <g stroke="#17120E" strokeWidth="3.5" strokeLinejoin="round">
        <rect x="140" y="176" width="180" height="122" fill="#FFF6EA" />
        <path d="M128 146h204v32H128z" fill="#F7931E" />
        <path d="M153 146v32M178 146v32M204 146v32M230 146v32M256 146v32M281 146v32M307 146v32" stroke="#FFF1DF" strokeWidth="11" />
        <path d="M128 146h204v32H128z" fill="none" />
        <path d="M128 178c6 11 19 11 25 0 6 11 19 11 25 0 6 11 19 11 26 0 6 11 19 11 26 0 6 11 19 11 25 0 6 11 19 11 26 0 6 11 19 11 25 0 6 11 19 11 26 0" fill="#F7931E" />
        <rect x="158" y="204" width="78" height="62" rx="6" fill="#3A2914" />
        <rect x="168" y="228" width="22" height="38" fill="#FDB913" />
        <rect x="198" y="240" width="30" height="26" fill="#F27405" />
        <rect x="254" y="204" width="50" height="94" fill="#F27405" />
        <circle cx="294" cy="254" r="4" fill="#FFF1DF" />
      </g>
      <g className="auth-swing">
        <path d="M196 98v22M264 98v22" stroke="#FFF1DF" strokeWidth="3.5" />
        <rect x="174" y="118" width="112" height="30" rx="9" fill="#FFF1DF" />
        <text x="230" y="139" textAnchor="middle" fontFamily="var(--font-heading), sans-serif" fontWeight="800" fontSize="16" fill="#17120E">
          YOUR STORE
        </text>
      </g>
    </svg>
  );
}

const BAND = "OPEN ✶ SELL ✶ GET PAID ✶ OPEN ✶ SELL ✶ GET PAID ✶ OPEN ✶ SELL ✶ GET PAID ✶";

/**
 * Sign-in, sign-up and invitations: a dark brand panel (a short band above the form on phones) and the form.
 * `title` is the panel's two lines, the second in orange; `top` sits above the form, left of "Why sell on Sotechy?".
 */
export function AuthFrame({
  children,
  whySell = true,
  title = ["Sell on", "Sotechy."],
  points = POINTS,
  stickers = DEFAULT_STICKERS,
  top,
}: {
  children: ReactNode;
  whySell?: boolean;
  title?: [string, string];
  points?: string[];
  stickers?: ReactNode;
  top?: ReactNode;
}) {
  return (
    <main className="grid min-h-screen bg-canvas lg:grid-cols-[46fr_54fr]">
      <aside className="relative m-2.5 mb-0 flex flex-col overflow-hidden rounded-3xl bg-[#17120E] px-5 pt-[18px] text-[#FFF1DF] lg:sticky lg:top-0 lg:m-4 lg:mr-0 lg:h-[calc(100vh-32px)] lg:rounded-[36px] lg:px-12 lg:pt-10">
        <svg aria-hidden width="100%" height="100%" className="pointer-events-none absolute inset-0 opacity-[0.07]">
          <defs>
            <pattern id="auth-dots" width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.6" fill="#FFF1DF" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#auth-dots)" />
        </svg>
        <div className="relative flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/sotechy-logo.png" alt="SoTechy" className="h-8 w-auto lg:h-11" />
          <span className="mono rounded-full border-[1.5px] border-sun/50 px-2.5 py-1 text-[10px] text-sun lg:text-[11px]">Merchant</span>
        </div>
        <h1 className="display relative mt-4 text-[36px] lg:mt-11 lg:text-[76px]">
          {title[0]}
          <br />
          <span className="relative text-brand">
            {title[1]}
            <svg aria-hidden viewBox="0 0 300 30" preserveAspectRatio="none" className="absolute -bottom-2.5 left-0 h-3.5 w-full lg:-bottom-4 lg:h-[22px]">
              <path className="auth-draw" d="M4 18 C 70 6, 140 26, 200 12 S 280 8, 296 16" fill="none" stroke="#FDB913" strokeWidth="7" strokeLinecap="round" />
            </svg>
          </span>
        </h1>
        <div className="relative mt-9 hidden flex-col gap-3 text-base text-[#FFF1DF]/80 lg:flex">
          {points.map((p, i) => (
            <div key={p} className="flex gap-3.5">
              <span className="mono pt-0.5 text-[13px] text-sun">0{i + 1}</span>
              {p}
            </div>
          ))}
        </div>
        <div className="relative mt-1 h-24 lg:mt-0 lg:min-h-[300px] lg:flex-1">
          <Shopfront />
          <div className="hidden lg:block">{stickers}</div>
        </div>
        <div aria-hidden className="-mx-5 overflow-hidden border-t-2 border-[#17120E] bg-brand py-1.5 text-[#17120E] lg:-mx-12 lg:border-t-[3px] lg:py-3.5">
          <div className="auth-marquee display text-[15px] lg:text-[26px]">
            <span className="px-4">{BAND}</span>
            <span className="px-4">{BAND}</span>
          </div>
        </div>
      </aside>

      <div className="flex flex-col px-[18px] pb-10 pt-5 lg:px-16 lg:py-10">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 text-sm text-muted">{top}</div>
          {whySell && <WhySell tone="sticker" />}
        </div>
        <div className="flex flex-1 justify-center pt-6 lg:items-center lg:pt-8">
          <div className="auth-skin w-full max-w-[460px]">{children}</div>
        </div>
      </div>
    </main>
  );
}
