"use client";

// A merchant's storefront as customers see it, drawn with the store's chosen theme.
// Used for the live preview in the theme editor and the "View my store" page.
import { ArrowLeft, Clock, Heart, Search, ShieldCheck, ShoppingBag, Star } from "lucide-react";
import { useState } from "react";
import type { StoreTheme } from "@/lib/themes";
import { formatNaira } from "@/lib/money";
import type { Product } from "@/lib/mock";

export interface StorefrontLook {
  theme: StoreTheme;
  header: "cover" | "band";
  layout: "grid" | "large";
  name: string;
  tagline: string;
  announcement: string;
  /** Store logo (or the owner's picture); initials when there's none */
  logo: string | null;
  /** Without one, the header uses the theme's colour band */
  cover: string | null;
  /** null until the store's token is approved */
  ticker: string | null;
  /** null until the first reviews come in */
  rating: number | null;
  ratingCount?: number;
  followers: number;
  /** Cheapest door delivery and fastest delivery time, from the store's areas */
  deliveryFrom?: number | null;
  deliveryTime?: string | null;
  /** Approved by Sotechy */
  verified?: boolean;
}

/** A round button on the cover, as in the app */
function CoverButton({ children, compact }: { children: React.ReactNode; compact: boolean }) {
  return <span className={`flex items-center justify-center rounded-full bg-white/90 text-[#17120E] ${compact ? "h-7 w-7" : "h-10 w-10"}`}>{children}</span>;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "S";

export function StorefrontView({ look, products, compact = false }: { look: StorefrontLook; products: Product[]; compact?: boolean }) {
  const t = look.theme;
  const live = products.filter((p) => p.status === "live");
  // Categories come from what's on sale, including any the merchant named themselves
  const counts = live.reduce<Record<string, number>>((m, p) => ({ ...m, [p.category]: (m[p.category] ?? 0) + 1 }), {});
  const categories = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b));
  const [category, setCategory] = useState("All");
  const shown = category === "All" ? live : live.filter((p) => p.category === category);
  const cover = look.header === "cover" && look.cover;
  return (
    <div style={{ background: t.background, color: t.text }} className="min-h-full">
      {/* The announcement sits above everything, as in the app */}
      {look.announcement && (
        <div className={`text-center font-semibold ${compact ? "px-3 py-2 text-[11px]" : "px-6 py-3 text-sm"}`} style={{ background: t.accent, color: t.onAccent }}>
          {look.announcement}
        </div>
      )}

      {/* Cover (or the colour band), with back on the left and favourite, search and cart on the right */}
      <div className={`relative ${compact ? "h-32" : "h-56"}`} style={{ background: t.hero }}>
        {cover && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-x-0 top-0 h-1/2" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.4), transparent)" }} />
          </>
        )}
        <div className={`relative flex items-center gap-2 ${compact ? "px-3 pt-9" : "mx-auto max-w-5xl px-6 pt-6"}`}>
          <CoverButton compact={compact}>
            <ArrowLeft size={compact ? 14 : 18} />
          </CoverButton>
          <span className="flex-1" />
          <CoverButton compact={compact}>
            <Heart size={compact ? 14 : 18} />
          </CoverButton>
          <CoverButton compact={compact}>
            <Search size={compact ? 14 : 18} />
          </CoverButton>
          <CoverButton compact={compact}>
            <ShoppingBag size={compact ? 14 : 18} />
          </CoverButton>
        </div>
      </div>

      {/* Round logo over the cover, then the name */}
      <div className={`relative flex flex-col items-center text-center ${compact ? "-mt-9 px-3" : "-mt-14 px-6"}`}>
        <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border-4 ${compact ? "h-[72px] w-[72px]" : "h-28 w-28"}`} style={{ background: t.accent, borderColor: t.background }}>
          {look.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={look.logo} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
          ) : (
            <span className={`font-display font-extrabold ${compact ? "text-xl" : "text-3xl"}`} style={{ color: t.onAccent }}>
              {initials(look.name)}
            </span>
          )}
        </span>
        <p className={`mt-1.5 font-display font-extrabold leading-tight ${compact ? "text-lg" : "text-3xl"}`}>{look.name}</p>
        <p className={`mt-1 flex flex-wrap items-center justify-center gap-1.5 ${compact ? "text-[11px]" : "text-sm"}`}>
          {look.verified ? (
            <span className="flex items-center gap-1 font-semibold text-[#1C8A4C]">
              <ShieldCheck size={compact ? 12 : 15} /> Verified
            </span>
          ) : (
            <span style={{ color: t.muted }}>New store</span>
          )}
          {look.followers > 0 && <span style={{ color: t.muted }}>· {look.followers.toLocaleString()} subscribers</span>}
        </p>
        {look.tagline && <p className={`mt-1 max-w-xl ${compact ? "text-[11px]" : "text-sm"}`} style={{ color: t.muted }}>{look.tagline}</p>}
      </div>

      {/* Delivery, time and rating */}
      <div className={compact ? "px-3 pt-3" : "mx-auto max-w-5xl px-6 pt-5"}>
        <div className="flex rounded-2xl border" style={{ background: t.surface, borderColor: t.dark ? "#2A3348" : "#E9E2D9" }}>
          {[
            { label: "Delivery", value: look.deliveryFrom != null ? (look.deliveryFrom ? `From ${formatNaira(look.deliveryFrom)}` : "Free") : "—" },
            { label: "Delivery time", value: look.deliveryTime ?? "—", icon: <Clock size={compact ? 11 : 14} /> },
            { label: "Rating", value: look.rating != null ? `${look.rating}${look.ratingCount ? ` (${look.ratingCount})` : ""}` : "New", icon: <Star size={compact ? 11 : 14} fill="#FDB913" color="#FDB913" /> },
          ].map((f, i) => (
            <div key={f.label} className={`flex flex-1 flex-col items-center gap-0.5 ${compact ? "py-2" : "py-3"} ${i ? "border-l" : ""}`} style={{ borderColor: t.dark ? "#2A3348" : "#E9E2D9" }}>
              <span className={compact ? "text-[10px]" : "text-xs"} style={{ color: t.muted }}>
                {f.label}
              </span>
              <span className={`flex items-center gap-1 font-bold ${compact ? "text-[11px]" : "text-sm"}`}>
                {f.icon}
                {f.value}
              </span>
            </div>
          ))}
        </div>

        {/* Updates and the store's token, side by side */}
        <div className={`flex gap-2 ${compact ? "mt-2.5" : "mt-4"}`}>
          <span className={`flex flex-1 items-center justify-center rounded-full font-semibold ${compact ? "py-2 text-[11px]" : "py-3 text-sm"}`} style={{ background: t.accent, color: t.onAccent }}>
            Get their updates
          </span>
          <span className={`flex items-center gap-1.5 rounded-full font-bold ${compact ? "py-2 pl-1.5 pr-3 text-[11px]" : "py-2.5 pl-2 pr-4 text-sm"}`} style={{ background: t.hero, color: t.onHero }}>
            <span className={`flex items-center justify-center rounded-full bg-[#FDB913] font-display font-extrabold text-[#17120E] ${compact ? "h-5 w-5 text-[10px]" : "h-7 w-7 text-xs"}`}>$</span>
            Earn {look.ticker ? `$${look.ticker}` : "tokens"}
          </span>
        </div>
      </div>

      <div className={compact ? "px-3 pb-3 pt-3" : "mx-auto max-w-5xl px-6 pb-6 pt-5"}>
        <div className={`mb-3 flex items-center gap-2 rounded-full border ${compact ? "px-3 py-2 text-xs" : "px-5 py-3 text-sm"}`} style={{ background: t.surface, borderColor: t.dark ? "#2A3348" : "#E9E2D9", color: t.muted }}>
          <Search size={compact ? 13 : 16} /> Search {look.name}
        </div>
        {categories.length > 1 && (
          <div className={`mb-3 flex gap-2 ${compact ? "flex-wrap" : "no-scrollbar -mx-6 overflow-x-auto px-6 sm:mx-0 sm:flex-wrap sm:px-0"}`}>
            {["All", ...categories].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`shrink-0 whitespace-nowrap rounded-full font-semibold ${compact ? "px-3 py-1.5 text-[11px]" : "px-4 py-2 text-sm"}`}
                style={category === c ? { background: t.accent, color: t.onAccent } : { background: t.surface, color: t.text }}
              >
                {c}
              </button>
            ))}
          </div>
        )}
        {!shown.length && (
          <div className={`rounded-2xl text-center ${compact ? "px-4 py-8" : "px-6 py-14"}`} style={{ background: t.surface, color: t.muted }}>
            <p className={`font-semibold ${compact ? "text-sm" : "text-lg"}`} style={{ color: t.text }}>
              Your products will show here
            </p>
            <p className={compact ? "mt-1 text-[11px]" : "mt-1 text-sm"}>Add products once your store is verified.</p>
          </div>
        )}
        <ul className={`grid gap-2.5 ${look.layout === "large" ? "grid-cols-1" : compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"}`}>
          {shown.slice(0, compact ? (look.layout === "large" ? 3 : 6) : 12).map((p) => (
            <li key={p.id} className={`overflow-hidden rounded-2xl ${look.layout === "large" ? "flex items-center" : ""}`} style={{ background: t.surface }}>
              <div className={`relative flex items-center justify-center ${look.layout === "large" ? (compact ? "h-24 w-24 shrink-0" : "h-40 w-40 shrink-0") : "aspect-square"}`} style={{ background: t.accent }}>
                <span className="absolute inset-[18%] rounded-full bg-white/25" />
                {p.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt="" className="relative h-[75%] w-[75%] object-contain" />
                )}
              </div>
              <div className={compact ? "p-2" : "p-3"}>
                <p className={`line-clamp-2 font-semibold leading-snug ${compact ? "text-[11px]" : "text-sm"}`}>{p.name}</p>
                <p className={`font-display font-bold ${compact ? "text-xs" : "text-base"}`} style={{ color: t.dark ? t.accent : t.text }}>
                  {formatNaira(p.price)}
                </p>
                {p.compareAt && <p className={`line-through ${compact ? "text-[10px]" : "text-xs"}`} style={{ color: t.muted }}>{formatNaira(p.compareAt)}</p>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
