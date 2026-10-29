"use client";

// How a Home banner or an app pop-up looks in the app, both for saved ones and live while its form is filled in
// (the live previews read the surrounding form as you type, and show a picked picture before it's uploaded).
import { useEffect, useRef, useState } from "react";
import type { Banner, Popup } from "@sotechy/shared";

const BANNER_STYLES = {
  dark: { bg: "#17120E", fg: "#FFFFFF", accent: "#FDB913", circle: "#F7931E", cta: "bg-white text-ink" },
  orange: { bg: "#F7931E", fg: "#17120E", accent: "#17120E", circle: "#FDB913", cta: "bg-ink text-white" },
  light: { bg: "#FFF1DF", fg: "#17120E", accent: "#E07F0C", circle: "#F7931E", cta: "bg-ink text-white" },
} as const;

// The app's colours for pop-ups (kept the same in light and dark mode), as the app draws them
const POPUP_STYLES = {
  orange: { bg: "#F7931E", fg: "#17120E", sub: "rgba(23,18,14,0.78)", doodle: "#17120E", accent: "#FDB913", btnBg: "#17120E", btnFg: "#FFFFFF" },
  dark: { bg: "#17120E", fg: "#FFFFFF", sub: "rgba(255,255,255,0.72)", doodle: "#FDB913", accent: "#F7931E", btnBg: "#F7931E", btnFg: "#17120E" },
  light: { bg: "#FFF1DF", fg: "#17120E", sub: "#3A322C", doodle: "#F7931E", accent: "#FDB913", btnBg: "#17120E", btnFg: "#FFFFFF" },
} as const;

/** A four-point sparkle, as in the app */
const sparkle = (x: number, y: number, r: number) =>
  `M${x} ${y - r} C${x + r * 0.18} ${y - r * 0.18} ${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y} C${x + r * 0.18} ${y + r * 0.18} ${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r} C${x - r * 0.18} ${y + r * 0.18} ${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y} C${x - r * 0.18} ${y - r * 0.18} ${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r}Z`;

type BannerLook = Pick<Banner, "layout" | "style" | "eyebrow" | "title" | "subtitle" | "ctaLabel" | "imageUrl">;
type PopupLook = Pick<Popup, "layout" | "style" | "title" | "body" | "imageUrl" | "ctaLabel" | "dismissLabel">;

/** Roughly how the slide looks in the app */
export function BannerPreview({ banner }: { banner: BannerLook }) {
  const s = BANNER_STYLES[banner.style];
  if (banner.layout === "image")
    return (
      <div className="relative aspect-[1/0.52] w-full overflow-hidden rounded-xl bg-surface-alt">
        {banner.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={banner.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-xs text-muted">Your picture shows here</span>
        )}
        {(banner.title || banner.ctaLabel) && (
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-1 bg-gradient-to-t from-black/70 to-transparent p-3 text-white">
            {banner.title && <p className="text-sm font-extrabold leading-tight">{banner.title}</p>}
            {banner.ctaLabel && <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-ink">{banner.ctaLabel} →</span>}
          </div>
        )}
      </div>
    );
  return (
    <div className="relative flex aspect-[1/0.52] w-full overflow-hidden rounded-xl" style={{ background: s.bg, color: s.fg }}>
      <div className="relative z-10 flex w-3/5 flex-col justify-between p-3">
        <div>
          {banner.eyebrow && <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: s.accent }}>{banner.eyebrow}</p>}
          <p className="text-sm font-extrabold leading-tight">{banner.title || <span className="opacity-50">Your title</span>}</p>
          {banner.subtitle && <p className="mt-0.5 text-[10px] opacity-80">{banner.subtitle}</p>}
        </div>
        {banner.ctaLabel && <span className={`self-start rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.cta}`}>{banner.ctaLabel} →</span>}
      </div>
      <div className="absolute -right-[8%] top-[10%] aspect-square h-[80%] rounded-full" style={{ background: s.circle }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {banner.imageUrl && <img src={banner.imageUrl} alt="" className="absolute bottom-[6%] right-[4%] h-[60%] w-[40%] object-contain" />}
    </div>
  );
}

/** Roughly how it looks in the app: a sheet risen from the bottom of the screen */
export function PopupPreview({ popup }: { popup: PopupLook }) {
  const t = POPUP_STYLES[popup.style];
  const W = 236;
  const button = (bg: string, fg: string, sub: string) => (
    <div className="flex flex-col items-center gap-1">
      <span className="flex w-full items-center justify-center gap-1 rounded-full py-2 text-center text-[11px] font-bold" style={{ background: bg, color: fg }}>
        {popup.ctaLabel || "Button"} →
      </span>
      {popup.dismissLabel && <span className="py-0.5 text-[10px] font-semibold" style={{ color: sub }}>{popup.dismissLabel}</span>}
    </div>
  );
  const close = (glass: boolean) => (
    <span className={`absolute right-2.5 top-2.5 z-10 grid h-6 w-6 place-items-center rounded-full text-[11px] ${glass ? "bg-black/40 text-white" : "bg-white/55 text-[#17120E]"}`}>✕</span>
  );
  return (
    <div className="mx-auto flex aspect-[9/17] w-full max-w-[260px] flex-col justify-end overflow-hidden rounded-[30px] bg-[#3a3330] p-2.5" style={{ backgroundImage: "linear-gradient(rgba(12,9,7,.55),rgba(12,9,7,.7))" }}>
      <span className="mx-auto mb-1.5 h-1 w-8 rounded-full bg-white/70" />
      <div className="relative overflow-hidden rounded-[22px] shadow-xl" style={{ background: popup.layout === "image" ? "#17120E" : t.bg }}>
        {popup.layout === "image" ? (
          <div className="relative">
            {popup.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={popup.imageUrl} alt="" className="block max-h-[360px] w-full object-cover" />
            ) : (
              <div className="grid aspect-[4/5] place-items-center bg-[#2A2421] text-xs text-white/60">Your picture shows here</div>
            )}
            <svg width="60" height="46" className="absolute left-2 top-2" aria-hidden>
              <path d={sparkle(14, 16, 10)} fill="#fff" />
              <path d={sparkle(34, 9, 5)} fill="#FDB913" />
              <path d={sparkle(30, 31, 3.5)} fill="#fff" opacity=".7" />
            </svg>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-b from-transparent via-black/55 to-black/85 px-4 pb-3 pt-10">{button("#FFFFFF", "#17120E", "rgba(255,255,255,.85)")}</div>
            {close(true)}
          </div>
        ) : (
          <div className="relative px-4 pb-4 pt-8">
            <svg viewBox={`0 0 ${W} 300`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
              <circle cx={-20} cy={95} r={75} fill={t.accent} opacity=".55" />
              <circle cx={W + 14} cy={-6} r={60} fill={t.accent} opacity=".35" />
              <path d="M16 262 q 12 -18 24 0 t 24 0 t 24 0" stroke={t.doodle} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity=".22" />
            </svg>
            <svg width={W} height="80" className="absolute left-0 top-0" aria-hidden>
              <path d={sparkle(W - 36, 38, 10)} fill={t.doodle} opacity=".85" />
              <path d={sparkle(W - 56, 64, 5)} fill={t.doodle} opacity=".5" />
              <path d={sparkle(28, 32, 6)} fill={t.doodle} opacity=".55" />
            </svg>
            {popup.imageUrl && (
              <div className="relative mx-auto mb-4 h-24 w-24">
                <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 rotate-6 rounded-[20px]" style={{ background: t.accent }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={popup.imageUrl} alt="" className="relative h-24 w-24 -rotate-[4deg] rounded-[20px] object-cover" />
              </div>
            )}
            <p className="relative text-center text-xl font-extrabold leading-tight tracking-tight" style={{ color: t.fg }}>
              {popup.title || <span className="opacity-50">Your title</span>}
            </p>
            {popup.body && <p className="relative mt-2 text-center text-[11px] leading-snug" style={{ color: t.sub }}>{popup.body}</p>}
            <div className="relative mt-4">{button(t.btnBg, t.btnFg, t.sub)}</div>
            {close(popup.style === "dark")}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Reads the form this sits in, again on every change. A newly picked picture is shown from the phone or computer
 * straight away (it's only uploaded on save); ticking "Remove current picture" hides the saved one.
 */
function useFormLook<T>(read: (get: (name: string) => string, image: string | null) => T, initial: T) {
  const ref = useRef<HTMLDivElement>(null);
  const [look, setLook] = useState(initial);
  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    let picked: { file: File; url: string } | null = null;
    const update = () => {
      const f = new FormData(form);
      const get = (name: string) => {
        const v = f.get(name);
        return typeof v === "string" ? v.trim() : "";
      };
      const file = f.get("image");
      if (file instanceof File && file.size > 0) {
        if (picked?.file !== file) {
          if (picked) URL.revokeObjectURL(picked.url);
          picked = { file, url: URL.createObjectURL(file) };
        }
      } else if (picked) {
        URL.revokeObjectURL(picked.url);
        picked = null;
      }
      const image = picked?.url ?? (f.get("removeImage") ? null : get("imageUrl") || null);
      setLook(read(get, image));
    };
    update();
    form.addEventListener("input", update);
    form.addEventListener("change", update);
    return () => {
      form.removeEventListener("input", update);
      form.removeEventListener("change", update);
      if (picked) URL.revokeObjectURL(picked.url);
    };
    // `read` is a fixed mapping for each preview
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { ref, look };
}

const style = (v: string) => (v === "orange" || v === "light" || v === "dark" ? v : null);

/** A banner's preview that follows its form */
export function LiveBannerPreview({ initial }: { initial?: BannerLook }) {
  const start: BannerLook = initial ?? { layout: "art", style: "dark", eyebrow: null, title: null, subtitle: null, ctaLabel: "Shop now", imageUrl: null };
  const { ref, look } = useFormLook<BannerLook>(
    (get, image) => ({
      layout: get("layout") === "image" ? "image" : "art",
      style: style(get("style")) ?? "dark",
      eyebrow: get("eyebrow") || null,
      title: get("title") || null,
      subtitle: get("subtitle") || null,
      ctaLabel: get("ctaLabel") || null,
      imageUrl: image,
    }),
    start,
  );
  return (
    <div ref={ref} className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Preview</p>
      <div className="rounded-[24px] bg-[#2A2421] p-3">
        <BannerPreview banner={look} />
      </div>
    </div>
  );
}

/** A pop-up's preview that follows its form */
export function LivePopupPreview({ initial }: { initial?: PopupLook }) {
  const start: PopupLook = initial ?? { layout: "art", style: "orange", title: null, body: null, imageUrl: null, ctaLabel: "Take a look", dismissLabel: null };
  const { ref, look } = useFormLook<PopupLook>(
    (get, image) => ({
      layout: get("layout") === "image" ? "image" : "art",
      style: style(get("style")) ?? "orange",
      title: get("title") || null,
      body: get("body") || null,
      imageUrl: image,
      ctaLabel: get("ctaLabel"),
      dismissLabel: get("dismissLabel") || null,
    }),
    start,
  );
  return (
    <div ref={ref} className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Preview</p>
      <PopupPreview popup={look} />
    </div>
  );
}
