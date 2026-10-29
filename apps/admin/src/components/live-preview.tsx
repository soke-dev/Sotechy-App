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

// The app's colours for pop-ups (kept the same in light and dark mode)
const POPUP_STYLES = {
  orange: { bg: "#F7931E", fg: "#17120E", circle: "#FDB913" },
  dark: { bg: "#17120E", fg: "#FFFFFF", circle: "#F7931E" },
  light: { bg: "#FFF1DF", fg: "#17120E", circle: "#F7931E" },
} as const;

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

/** Roughly how it looks over the app's Home screen */
export function PopupPreview({ popup }: { popup: PopupLook }) {
  const s = POPUP_STYLES[popup.style];
  const buttons = (
    <div className="flex flex-col items-center gap-1.5 px-4 pb-4">
      <span className="w-full rounded-full bg-[#17120E] py-2 text-center text-xs font-bold text-white">{popup.ctaLabel || "Button"}</span>
      {popup.dismissLabel && <span className="text-[11px] font-semibold text-[#6B5E53]">{popup.dismissLabel}</span>}
    </div>
  );
  return (
    <div className="mx-auto w-full max-w-[260px] rounded-[28px] bg-[#2A2421] p-3">
      <div className="relative overflow-hidden rounded-2xl bg-white">
        <span className="absolute right-2 top-2 z-10 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-xs text-[#17120E] shadow">✕</span>
        {popup.layout === "image" ? (
          <>
            {popup.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={popup.imageUrl} alt="" className="block max-h-80 w-full object-cover" />
            ) : (
              <div className="grid aspect-[4/5] place-items-center bg-[#F3EDE6] text-xs text-[#6B5E53]">Your picture shows here</div>
            )}
            <div className="pt-3">{buttons}</div>
          </>
        ) : (
          <>
            <div className="relative flex h-36 flex-col items-center justify-start overflow-hidden px-4 pt-5" style={{ background: s.bg, color: s.fg }}>
              <div className="absolute -left-6 bottom-[-30px] h-20 w-20 rounded-full" style={{ background: s.circle }} />
              <div className="absolute -right-5 top-[-20px] h-14 w-14 rounded-full opacity-60" style={{ background: s.circle }} />
              <p className="relative text-center text-lg font-extrabold leading-tight">{popup.title || <span className="opacity-50">Your title</span>}</p>
            </div>
            {popup.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={popup.imageUrl} alt="" className="relative mx-auto -mt-10 h-28 w-28 rounded-2xl border-4 border-white object-cover shadow" />
            )}
            {popup.body && <p className="px-4 pt-3 text-center text-[11px] leading-snug text-[#3D332C]">{popup.body}</p>}
            <div className="pt-3">{buttons}</div>
          </>
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
