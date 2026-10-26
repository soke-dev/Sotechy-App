"use client";

// A merchant's storefront as customers see it, drawn with the store's chosen theme.
// Used for the live preview in the theme editor and the "View my store" page.
import { Search, Star } from "lucide-react";
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
  logo: string;
  cover: string;
  ticker: string;
  rating: number;
  followers: number;
}

export function StorefrontView({ look, products, compact = false }: { look: StorefrontLook; products: Product[]; compact?: boolean }) {
  const t = look.theme;
  const live = products.filter((p) => p.status === "live");
  // Categories come from what's on sale, including any the merchant named themselves
  const counts = live.reduce<Record<string, number>>((m, p) => ({ ...m, [p.category]: (m[p.category] ?? 0) + 1 }), {});
  const categories = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b));
  const [category, setCategory] = useState("All");
  const shown = category === "All" ? live : live.filter((p) => p.category === category);
  return (
    <div style={{ background: t.background, color: t.text }} className="min-h-full">
      {/* Header */}
      <div className="relative" style={{ background: t.hero, color: t.onHero }}>
        {look.header === "cover" && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={look.cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.65))" }} />
          </>
        )}
        <div className={`relative ${compact ? "px-4 pb-5 pt-10" : "mx-auto max-w-5xl px-6 pb-10 pt-20"}`} style={look.header === "cover" ? { color: "#fff" } : undefined}>
          <div className="flex items-end gap-3">
            <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 ${compact ? "h-16 w-16" : "h-24 w-24"}`} style={{ background: t.accent, borderColor: t.background }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={look.logo} alt="" className="h-[80%] w-[80%] object-contain" />
            </span>
            <div className="min-w-0 pb-1">
              <p className={`font-display font-extrabold leading-tight ${compact ? "text-xl" : "text-4xl"}`}>{look.name}</p>
              <p className={`flex items-center gap-1.5 opacity-80 ${compact ? "text-[11px]" : "text-sm"}`}>
                <Star size={compact ? 11 : 14} fill="currentColor" /> {look.rating} · {look.followers.toLocaleString()} subscribers
              </p>
            </div>
          </div>
          {look.tagline && <p className={`mt-3 max-w-xl opacity-90 ${compact ? "text-xs" : "text-base"}`}>{look.tagline}</p>}
          <div className={`mt-3 flex flex-wrap gap-2 ${compact ? "" : "mt-5"}`}>
            <span className={`rounded-full font-semibold ${compact ? "px-3 py-1.5 text-xs" : "px-5 py-2.5 text-sm"}`} style={{ background: t.accent, color: t.onAccent }}>
              Get their updates
            </span>
            <span className={`rounded-full font-semibold ${compact ? "px-3 py-1.5 text-xs" : "px-5 py-2.5 text-sm"}`} style={{ background: "rgba(255,255,255,0.16)" }}>
              Earn ${look.ticker} on every order
            </span>
          </div>
        </div>
      </div>

      {look.announcement && (
        <div className={`text-center font-semibold ${compact ? "px-3 py-2 text-[11px]" : "px-6 py-3 text-sm"}`} style={{ background: t.accent, color: t.onAccent }}>
          {look.announcement}
        </div>
      )}

      <div className={compact ? "p-3" : "mx-auto max-w-5xl p-6"}>
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
        <ul className={`grid gap-2.5 ${look.layout === "large" ? "grid-cols-1" : compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"}`}>
          {shown.slice(0, compact ? (look.layout === "large" ? 3 : 6) : 12).map((p) => (
            <li key={p.id} className={`overflow-hidden rounded-2xl ${look.layout === "large" ? "flex items-center" : ""}`} style={{ background: t.surface }}>
              <div className={`relative flex items-center justify-center ${look.layout === "large" ? (compact ? "h-24 w-24 shrink-0" : "h-40 w-40 shrink-0") : "aspect-square"}`} style={{ background: t.accent }}>
                <span className="absolute inset-[18%] rounded-full bg-white/25" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image} alt="" className="relative h-[75%] w-[75%] object-contain" />
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
