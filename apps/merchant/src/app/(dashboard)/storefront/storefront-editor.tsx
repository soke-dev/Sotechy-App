"use client";

import { AlertTriangle, ExternalLink, ImagePlus, Monitor, Smartphone, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useAccount } from "@/components/account-context";
import { StoreDetails } from "@/components/store-details";
import { StorefrontView, type StorefrontLook } from "@/components/storefront-view";
import { btn, inputClass, PageHeader } from "@/components/ui";
import { COVER_SPEC, ImageCropper, LOGO_SPEC } from "@/components/image-cropper";
import { Sheet } from "@/components/zone-form";
import type { storefrontFacts } from "@/lib/storefront-facts";
import { saveStorefront, uploadFiles } from "@/lib/market-actions";
import type { Product } from "@/lib/mock";
import { THEME_PRESETS, themeWarnings, withColours } from "@/lib/themes";

type Look = Omit<StorefrontLook, "theme">;
const DEFAULT_DESIGN = { presetId: "sotechy", accent: null as string | null, hero: null as string | null, header: "cover" as const, layout: "grid" as const };

export function StorefrontEditor({ products, facts }: { products: Product[]; facts: Awaited<ReturnType<typeof storefrontFacts>> }) {
  const { store } = useAccount();
  const router = useRouter();
  const sf = store.storefront;
  const [presetId, setPresetId] = useState(sf?.themeId ?? DEFAULT_DESIGN.presetId);
  const [accent, setAccent] = useState<string | null>(sf?.accent ?? null);
  const [hero, setHero] = useState<string | null>(sf?.hero ?? null);
  const [look, setLook] = useState<Look>({
    header: sf?.header ?? "cover",
    layout: sf?.layout ?? "grid",
    name: store.name,
    tagline: store.tagline ?? "",
    announcement: sf?.announcement ?? "",
    logo: store.logoUrl ?? null,
    cover: store.coverUrl ?? null,
    ticker: store.tokenApprovedAt ? store.ticker : null,
    rating: facts.rating,
    ratingCount: facts.ratingCount,
    deliveryFrom: facts.deliveryFrom,
    deliveryTime: facts.deliveryTime,
    verified: store.status === "approved",
    followers: 0,
  });
  const [device, setDevice] = useState<"phone" | "desktop">("phone");
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();
  const [uploading, setUploading] = useState<"logo" | "cover" | null>(null);
  // A picked picture waiting to be cropped
  const [cropping, setCropping] = useState<{ key: "logo" | "cover"; file: File } | null>(null);
  const snapshot = JSON.stringify({ presetId, accent, hero, look });
  const [savedSnapshot, setSavedSnapshot] = useState(snapshot);
  const changed = snapshot !== savedSnapshot;

  const preset = THEME_PRESETS.find((p) => p.id === presetId) ?? THEME_PRESETS[0];
  const theme = withColours(preset, { accent, hero });
  const warnings = themeWarnings(theme);
  const isDefault = presetId === DEFAULT_DESIGN.presetId && !accent && !hero && look.header === DEFAULT_DESIGN.header && look.layout === DEFAULT_DESIGN.layout;
  const set = (patch: Partial<Look>) => setLook((l) => ({ ...l, ...patch }));

  /** A picked logo or cover opens the cropper first */
  const pick = (key: "logo" | "cover") => (files: FileList | null) => {
    if (files?.[0]) setCropping({ key, file: files[0] });
  };
  /** Logo and cover upload straight away; saving stores their addresses */
  const upload = async (key: "logo" | "cover", file: File) => {
    setCropping(null);
    const form = new FormData();
    form.append("kind", "image");
    form.append("file", file);
    setUploading(key);
    const r = await uploadFiles(form);
    setUploading(null);
    if ("error" in r) setError(r.error);
    else set({ [key]: r.ok[0].url });
  };
  const save = () =>
    start(async () => {
      setError(null);
      const r = await saveStorefront({
        logoUrl: look.logo,
        coverUrl: look.cover,
        storefront: { themeId: presetId, accent, hero, header: look.header, layout: look.layout, announcement: look.announcement.trim() || null },
      });
      if ("error" in r) setError(r.error);
      else {
        setSavedSnapshot(snapshot);
        router.refresh();
      }
    });
  /** Back to Sotechy's colours and layout; the logo, cover and words stay */
  const reset = () => {
    setPresetId(DEFAULT_DESIGN.presetId);
    setAccent(null);
    setHero(null);
    set({ header: DEFAULT_DESIGN.header, layout: DEFAULT_DESIGN.layout });
  };

  return (
    <>
      <PageHeader
        illo="store"
        title="Storefront"
        description="Choose how your store looks to customers in the Sotechy app."
        actions={
          <Link href="/store-preview" className={btn.outline}>
            View full page <ExternalLink size={15} />
          </Link>
        }
      />

      {error && <p className="mb-4 rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}
      <Sheet open={cropping !== null} onClose={() => setCropping(null)} title={cropping?.key === "logo" ? "Your logo" : "Your cover photo"}>
        {cropping && <ImageCropper file={cropping.file} spec={cropping.key === "logo" ? LOGO_SPEC : COVER_SPEC} onDone={(f) => upload(cropping.key, f)} onCancel={() => setCropping(null)} />}
      </Sheet>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="min-w-0">
          <div className="divide-y divide-line rounded-2xl border border-line bg-surface">
            <Section title="Logo" hint="Shown on your store page and next to your products. Best at 512 × 512 px, square; it shows as a circle in the app.">
              <ImageSlot
                kind="logo"
                url={look.logo}
                busy={uploading === "logo"}
                tile={{ background: theme.accent, color: theme.onAccent }}
                onPick={pick("logo")}
                onRemove={() => set({ logo: null })}
              />
            </Section>

            <Section title="Cover photo" hint="The wide photo at the top of your store. Best at 1600 × 800 px (2:1). Your shop front or best products work well.">
              <ImageSlot kind="cover" url={look.cover} busy={uploading === "cover"} onPick={pick("cover")} onRemove={() => set({ cover: null })} />
            </Section>

            <Section title="Palette" hint="Pick a preset to set both colours at once.">
              <div className="flex flex-wrap gap-2.5">
                {THEME_PRESETS.map((p) => {
                  const on = p.id === presetId && !accent && !hero;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      title={p.name}
                      aria-label={`${p.name} palette`}
                      aria-pressed={on}
                      onClick={() => {
                        setPresetId(p.id);
                        setAccent(null);
                        setHero(null);
                      }}
                      className={`h-11 w-11 rounded-full border border-line transition ${on ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : "hover:scale-105"}`}
                      style={{ background: `linear-gradient(135deg, ${p.hero} 50%, ${p.accent} 50%)` }}
                    />
                  );
                })}
              </div>
            </Section>

            <Section title="Colours">
              <div className="flex flex-col gap-3">
                <ColourRow label="Brand colour" hint="Your header" value={theme.hero} onChange={setHero} />
                <ColourRow label="Accent" hint="Buttons and highlights" value={theme.accent} onChange={setAccent} />
              </div>
              {warnings.map((w) => (
                <p key={w} className="mt-3 flex items-start gap-2 rounded-xl bg-warn-soft px-3 py-2.5 text-sm text-warn">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {w}
                </p>
              ))}
            </Section>

            <Section title="Store details" hint="Name, about line, what you sell and socials. Sotechy approves changes before they show.">
              <StoreDetails />
            </Section>

            <Section title="Announcement" hint="Optional. A strip across your page for a sale or delivery news.">
              <Counted value={look.announcement} max={80} onChange={(announcement) => set({ announcement })} placeholder="e.g. 10% off all fans this week" />
            </Section>

            <Section title="Layout">
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm text-ink-2">Header</span>
                  <Segment value={look.header} onChange={(header) => set({ header })} options={[["cover", "Cover photo"], ["band", "Colour band"]]} />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm text-ink-2">Products</span>
                  <Segment value={look.layout} onChange={(layout) => set({ layout })} options={[["grid", "Grid"], ["large", "Large cards"]]} />
                </div>
              </div>
            </Section>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button disabled={!changed || saving || uploading !== null} onClick={save} className={btn.primary}>
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button type="button" disabled={isDefault} onClick={reset} className={`${btn.ghost} disabled:opacity-40`}>
              Reset to default
            </button>
            {changed ? <span className="text-sm text-muted">Unsaved changes</span> : null}
          </div>
        </div>

        {/* Live preview, tinted with the store's colour */}
        <div className="min-w-0 rounded-3xl p-4 sm:p-6 lg:sticky lg:top-6" style={{ background: `color-mix(in srgb, ${theme.accent} 13%, var(--color-surface))` }}>
          <div className="mb-5 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-ink-2">Live preview</span>
            <div className="flex rounded-full bg-surface p-1 shadow-sm">
              {(
                [
                  ["phone", Smartphone, "Phone"],
                  ["desktop", Monitor, "Desktop"],
                ] as const
              ).map(([key, Icon, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-label={`${label} preview`}
                  aria-pressed={device === key}
                  onClick={() => setDevice(key)}
                  className={`flex h-9 w-11 items-center justify-center rounded-full transition ${device === key ? "bg-surface-alt text-ink" : "text-muted hover:text-ink"}`}
                >
                  <Icon size={17} />
                </button>
              ))}
            </div>
          </div>
          {device === "phone" ? (
            <Phone background={theme.background} statusInk={theme.onHero}>
              <StorefrontView look={{ ...look, theme }} products={products} compact />
            </Phone>
          ) : (
            <Desktop background={theme.background} label={store.name}>
              <StorefrontView look={{ ...look, theme }} products={products} />
            </Desktop>
          )}
        </div>
      </div>
    </>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="p-5">
      <h2 className="font-semibold">{title}</h2>
      {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
      <div className="mt-3.5">{children}</div>
    </section>
  );
}

/** A logo or cover: what's there now, with Replace and Remove */
function ImageSlot({ kind, url, busy, tile, onPick, onRemove }: { kind: "logo" | "cover"; url: string | null; busy: boolean; tile?: { background: string; color: string }; onPick: (files: FileList | null) => void; onRemove: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const noun = kind === "logo" ? "Logo" : "Cover photo";
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface-alt p-3">
      <span className={`flex shrink-0 items-center justify-center overflow-hidden ${kind === "logo" ? "h-16 w-16 rounded-2xl" : "h-16 w-24 rounded-xl bg-surface"}`} style={kind === "logo" ? tile : undefined}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
        ) : (
          <ImagePlus size={20} className={kind === "cover" ? "text-muted" : undefined} />
        )}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium">{busy ? "Uploading…" : url ? `${noun} added` : `No ${noun.toLowerCase()} yet`}</p>
        <div className="mt-1 flex items-center gap-4 text-sm font-semibold">
          <button type="button" disabled={busy} onClick={() => input.current?.click()} className="text-brand-strong hover:underline disabled:opacity-50">
            {url ? "Replace" : "Upload"}
          </button>
          {url && (
            <button type="button" disabled={busy} onClick={onRemove} className="inline-flex items-center gap-1 text-muted hover:text-bad disabled:opacity-50">
              <Trash2 size={14} /> Remove
            </button>
          )}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          onPick(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/** A colour with its swatch picker and hex code */
function ColourRow({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (hex: string) => void }) {
  const [text, setText] = useState(value);
  // Follow palette picks and the swatch
  const [following, setFollowing] = useState(value);
  if (value !== following) {
    setFollowing(value);
    setText(value);
  }
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm text-ink">{label}</p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
      <div className="flex h-11 shrink-0 items-stretch overflow-hidden rounded-xl border border-line bg-surface">
        <label className="relative w-11 cursor-pointer border-r border-line" style={{ background: value }}>
          <span className="sr-only">Pick {label.toLowerCase()}</span>
          <input type="color" value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
        </label>
        <input
          value={text}
          maxLength={7}
          aria-label={`${label} hex code`}
          onChange={(e) => {
            const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
            setText(v.toUpperCase());
            if (/^#[0-9a-f]{6}$/i.test(v)) onChange(v.toUpperCase());
          }}
          className="w-[6.5rem] bg-transparent px-3 font-mono text-sm outline-none"
        />
      </div>
    </div>
  );
}

function Counted({ value, max, onChange, placeholder }: { value: string; max: number; onChange: (v: string) => void; placeholder: string }) {
  return (
    <>
      <textarea value={value} maxLength={max} rows={2} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${inputClass} min-h-[76px] resize-none py-3`} />
      <p className="mt-1.5 text-right text-xs text-muted">
        {value.length}/{max}
      </p>
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
          className={`whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition ${value === v ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** The full-size store page in a browser window, scaled down to fit */
function Desktop({ background, label, children }: { background: string; label: string; children: ReactNode }) {
  const PAGE = 1100;
  const HEIGHT = 560;
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const watch = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / PAGE));
    watch.observe(el);
    return () => watch.disconnect();
  }, []);
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_24px_60px_-24px_rgba(23,18,14,0.35)]">
      <div className="flex items-center gap-3 border-b border-line px-4 py-2.5">
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </span>
        <span className="min-w-0 flex-1 truncate rounded-full bg-surface-alt px-3 py-1 text-center text-xs text-muted">{label} · Sotechy</span>
      </div>
      <div ref={frame} className="relative overflow-hidden" style={{ height: HEIGHT, background }}>
        <div className="no-scrollbar absolute left-0 top-0 overflow-y-auto" style={{ width: PAGE, height: HEIGHT / scale, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/** A modern phone: thin bezel, Dynamic Island, status bar, side buttons, home bar. Scrolls without a scrollbar. */
function Phone({ background, statusInk, children }: { background: string; statusInk: string; children: ReactNode }) {
  // The status bar sits over the store's header, so it takes the header's text colour
  const ink = statusInk;
  return (
    <div className="relative mx-auto w-full max-w-[330px]">
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
