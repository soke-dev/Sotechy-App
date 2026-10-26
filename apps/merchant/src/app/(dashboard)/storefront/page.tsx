"use client";

import { AlertTriangle, Check, ExternalLink, ImagePlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { StorefrontView, type StorefrontLook } from "@/components/storefront-view";
import { btn, Card, Field, inputClass, PageHeader } from "@/components/ui";
import { products, store } from "@/lib/mock";
import { THEME_PRESETS, themeWarnings, withAccent } from "@/lib/themes";

export default function StorefrontPage() {
  const [presetId, setPresetId] = useState(store.themeId);
  const [accent, setAccent] = useState<string | null>(null);
  const [look, setLook] = useState<Omit<StorefrontLook, "theme">>({
    header: "cover",
    layout: "grid",
    name: store.name,
    tagline: store.tagline,
    announcement: "Free delivery in Benin City on orders over ₦100,000",
    logo: store.logo,
    cover: store.cover,
    ticker: store.ticker,
    rating: store.rating,
    followers: store.followers,
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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={look.logo} alt="" className="h-11 w-11 object-contain" />
                  </span>
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-2"><ImagePlus size={16} /> Change logo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => upload("logo")(e.target.files)} />
                </label>
              </Field>
              <Field label="Cover photo" hint="Wide photo of your shop or products.">
                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-line p-3 hover:border-brand">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={look.cover} alt="" className="h-14 w-20 rounded-xl object-cover" />
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-2"><ImagePlus size={16} /> Change cover</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => upload("cover")(e.target.files)} />
                </label>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Tagline">
                  <input value={look.tagline} maxLength={90} onChange={(e) => set({ tagline: e.target.value })} className={inputClass} />
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
          <div className="mx-auto w-[340px] rounded-[46px] bg-panel p-3 shadow-[0_24px_60px_rgba(23,18,14,0.25)]">
            <div className="h-[640px] overflow-y-auto overflow-x-hidden rounded-[36px]" style={{ background: theme.background }}>
              <StorefrontView look={{ ...look, theme }} products={products} compact />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Segment<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="flex rounded-full bg-surface-alt p-1">
      {options.map(([v, label]) => (
        <button key={v} type="button" onClick={() => onChange(v)} className={`flex-1 rounded-full py-2.5 text-sm font-semibold ${value === v ? "bg-surface shadow-sm" : "text-muted"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}
