"use client";

import { AlertTriangle, Check, ExternalLink, ImagePlus } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useAccount } from "@/components/account-context";
import { StorefrontView, type StorefrontLook } from "@/components/storefront-view";
import { btn, Card, Field, inputClass, PageHeader } from "@/components/ui";
import type { Product } from "@/lib/mock";
import { THEME_PRESETS, themeWarnings, withAccent } from "@/lib/themes";

/** Products come with the marketplace backend; until then the store has none */
const products: Product[] = [];

export default function StorefrontPage() {
  const { user, store } = useAccount();
  const [presetId, setPresetId] = useState("sotechy");
  const [accent, setAccent] = useState<string | null>(null);
  const [look, setLook] = useState<Omit<StorefrontLook, "theme">>({
    header: "cover",
    layout: "grid",
    name: store.name,
    tagline: "",
    announcement: "",
    logo: user.avatarUrl ?? null,
    cover: null,
    ticker: store.ticker,
    rating: null,
    followers: 0,
  });
  const [saved, setSaved] = useState(false);
  const preset = THEME_PRESETS.find((p) => p.id === presetId) ?? THEME_PRESETS[0];
  const theme = accent ? withAccent(preset, accent) : preset;
  const warnings = themeWarnings(theme);
  const set = (patch: Partial<typeof look>) => {
    setSaved(false);
    setLook((l) => ({ ...l, ...patch }));
  };
  const upload = (key: "logo" | "cover") => (files: FileList | null) => files?.[0] && set({ [key]: URL.createObjectURL(files[0]) });

  return (
    <>
      <PageHeader
        illo="store"
        title="Storefront"
        description="Make your store page yours. Customers see it in the Sotechy app when they open your store."
        actions={
          <>
            <Link href="/store-preview" className={btn.outline}>
              View full page <ExternalLink size={15} />
            </Link>
            <button onClick={() => setSaved(true)} className={btn.primary}>
              {saved ? <><Check size={16} /> Saved</> : "Save storefront"}
            </button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-6">
          <Card title="Theme" description="Start from a theme, then pick your own colour if you like.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {THEME_PRESETS.map((p) => {
                const on = p.id === presetId && !accent;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setPresetId(p.id);
                      setAccent(null);
                      setSaved(false);
                    }}
                    className={`overflow-hidden rounded-2xl border-2 text-left transition ${on ? "border-ink" : "border-line hover:border-faint"}`}
                  >
                    <div className="flex h-16 items-end gap-1.5 p-2" style={{ background: p.hero }}>
                      <span className="h-6 w-6 rounded-lg" style={{ background: p.accent }} />
                      <span className="h-2 w-10 rounded-full bg-white/40" />
                    </div>
                    <div className="flex items-center justify-between p-2.5" style={{ background: p.background, color: p.text }}>
                      <span className="text-sm font-semibold">{p.name}</span>
                      {on && <Check size={15} />}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-5 flex flex-wrap items-end gap-3">
              <Field label="Your own accent colour">
                <div className="flex items-center gap-2">
                  <input type="color" value={accent ?? preset.accent} onChange={(e) => { setAccent(e.target.value.toUpperCase()); setSaved(false); }} className="h-12 w-14 cursor-pointer rounded-2xl border border-line bg-surface p-1" />
                  <input value={accent ?? preset.accent} onChange={(e) => /^#[0-9a-f]{6}$/i.test(e.target.value) && setAccent(e.target.value.toUpperCase())} className={`${inputClass} w-32 font-mono`} />
                </div>
              </Field>
              {accent && (
                <button onClick={() => setAccent(null)} className={btn.ghost}>
                  Use theme colour
                </button>
              )}
            </div>
            {warnings.map((w) => (
              <p key={w} className="mt-3 flex items-start gap-2 rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {w}
              </p>
            ))}
          </Card>

          <Card title="Branding">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Logo" hint="Square, PNG with a clear background works best.">
                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-line p-3 hover:border-brand">
                  <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl" style={{ background: theme.accent }}>
                    {look.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={look.logo} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                    ) : (
                      <ImagePlus size={20} style={{ color: theme.onAccent }} />
                    )}
                  </span>
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-2"><ImagePlus size={16} /> {look.logo ? "Change logo" : "Add a logo"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => upload("logo")(e.target.files)} />
                </label>
              </Field>
              <Field label="Cover photo" hint="Wide photo of your shop or products.">
                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-line p-3 hover:border-brand">
                  {look.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={look.cover} alt="" className="h-14 w-20 rounded-xl object-cover" />
                  ) : (
                    <span className="flex h-14 w-20 items-center justify-center rounded-xl bg-surface-alt text-muted">
                      <ImagePlus size={20} />
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-2"><ImagePlus size={16} /> {look.cover ? "Change cover" : "Add a cover"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => upload("cover")(e.target.files)} />
                </label>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Tagline">
                  <input value={look.tagline} maxLength={90} onChange={(e) => set({ tagline: e.target.value })} className={inputClass} placeholder="e.g. Phones and gadgets, delivered across Benin City" />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Announcement strip" hint="Optional. Shown under your header, e.g. a sale or delivery news.">
                  <input value={look.announcement} maxLength={80} onChange={(e) => set({ announcement: e.target.value })} className={inputClass} placeholder="e.g. 10% off all fans this week" />
                </Field>
              </div>
            </div>
          </Card>

          <Card title="Layout">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Header">
                <Segment value={look.header} onChange={(header) => set({ header })} options={[["cover", "Cover photo"], ["band", "Colour band"]]} />
              </Field>
              <Field label="Products">
                <Segment value={look.layout} onChange={(layout) => set({ layout })} options={[["grid", "Grid"], ["large", "Large cards"]]} />
              </Field>
            </div>
          </Card>
        </div>

        {/* Live phone preview */}
        <div className="lg:sticky lg:top-8 lg:self-start">
          <p className="mb-3 text-center text-sm font-semibold text-muted">Live preview</p>
          <Phone background={theme.background} statusInk={theme.onHero}>
            <StorefrontView look={{ ...look, theme }} products={products} compact />
          </Phone>
        </div>
      </div>
    </>
  );
}

function Segment<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-full bg-surface-alt p-1">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold transition ${value === v ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** A modern phone: thin bezel, Dynamic Island, status bar, side buttons, home bar. Scrolls without a scrollbar. */
function Phone({ background, statusInk, children }: { background: string; statusInk: string; children: ReactNode }) {
  // The status bar sits over the store's header, so it takes the header's text colour
  const ink = statusInk;
  return (
    <div className="relative mx-auto w-[330px]">
      {/* Side buttons */}
      <span className="absolute -left-[3px] top-[118px] h-8 w-[3px] rounded-l bg-[#2b2520]" />
      <span className="absolute -left-[3px] top-[166px] h-14 w-[3px] rounded-l bg-[#2b2520]" />
      <span className="absolute -left-[3px] top-[230px] h-14 w-[3px] rounded-l bg-[#2b2520]" />
      <span className="absolute -right-[3px] top-[190px] h-20 w-[3px] rounded-r bg-[#2b2520]" />
      <div className="rounded-[54px] bg-[#17120e] p-[9px] shadow-[0_30px_70px_-20px_rgba(23,18,14,0.45),inset_0_0_0_1.5px_rgba(255,255,255,0.08)]">
        <div className="relative h-[660px] overflow-hidden rounded-[46px]" style={{ background }}>
          {/* Status bar and Dynamic Island */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex h-12 items-center justify-between px-7 text-[13px] font-semibold" style={{ color: ink }}>
            <span>9:41</span>
            <span className="absolute left-1/2 top-[11px] h-[26px] w-[92px] -translate-x-1/2 rounded-full bg-black" />
            <span className="flex items-center gap-1.5">
              <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor" aria-hidden>
                <rect x="0" y="7" width="3" height="4" rx="1" />
                <rect x="4.5" y="5" width="3" height="6" rx="1" />
                <rect x="9" y="2.5" width="3" height="8.5" rx="1" />
                <rect x="13.5" y="0" width="3" height="11" rx="1" />
              </svg>
              <svg width="25" height="12" viewBox="0 0 25 12" fill="none" aria-hidden>
                <rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="currentColor" opacity="0.4" />
                <rect x="2" y="2" width="16" height="8" rx="2" fill="currentColor" />
                <rect x="23" y="4" width="1.5" height="4" rx="0.75" fill="currentColor" opacity="0.4" />
              </svg>
            </span>
          </div>
          <div className="no-scrollbar h-full overflow-y-auto overflow-x-hidden overscroll-contain">{children}</div>
          {/* Home bar */}
          <span className="pointer-events-none absolute bottom-2 left-1/2 h-[5px] w-32 -translate-x-1/2 rounded-full bg-black/40" />
        </div>
      </div>
    </div>
  );
}
