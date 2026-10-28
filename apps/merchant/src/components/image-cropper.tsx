"use client";

// Crop a picked logo or cover before it's uploaded: drag to move, zoom, rotate. The recommended size
// is shown, but the store can also keep the whole picture as it is.
import { RotateCw, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { btn } from "./ui";

export interface CropSpec {
  /** Width ÷ height of the frame */
  aspect: number;
  /** The size we recommend (and crop to) */
  width: number;
  height: number;
  /** Logos show as circles in the app */
  round?: boolean;
}

export const LOGO_SPEC: CropSpec = { aspect: 1, width: 512, height: 512, round: true };
export const COVER_SPEC: CropSpec = { aspect: 2, width: 1600, height: 800 };
/** A Home banner in the app: as wide as the screen, a little over half as tall */
export const BANNER_SPEC: CropSpec = { aspect: 1.92, width: 1600, height: 833 };

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("That file isn't a picture we can open"));
    img.src = src;
  });

/** The picture turned a quarter, as a new image */
async function rotated(img: HTMLImageElement) {
  const c = document.createElement("canvas");
  c.width = img.naturalHeight;
  c.height = img.naturalWidth;
  const ctx = c.getContext("2d")!;
  ctx.translate(c.width / 2, c.height / 2);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  return loadImage(c.toDataURL("image/png"));
}

export function ImageCropper({ file, spec, onDone, onCancel }: { file: File; spec: CropSpec; onDone: (file: File) => void; onCancel: () => void }) {
  const frame = useRef<HTMLDivElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  // null = not moved yet, so centred
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    let live = true;
    loadImage(url).then(
      (i) => live && setImg(i),
      (e) => live && setError(e.message),
    );
    return () => {
      live = false;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // The frame's size on screen
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientWidth / spec.aspect });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [spec.aspect]);

  // The picture always covers the frame: smallest scale that does, times the zoom
  const base = img && box.w ? Math.max(box.w / img.naturalWidth, box.h / img.naturalHeight) : 1;
  const scale = base * zoom;
  const shownW = img ? img.naturalWidth * scale : 0;
  const shownH = img ? img.naturalHeight * scale : 0;
  const clamp = (p: { x: number; y: number }) => ({ x: Math.min(0, Math.max(box.w - shownW, p.x)), y: Math.min(0, Math.max(box.h - shownH, p.y)) });
  const at = clamp(pos ?? { x: (box.w - shownW) / 2, y: (box.h - shownH) / 2 });

  const setZoomKeepingCentre = (z: number) => {
    const next = Math.min(4, Math.max(1, z));
    const cx = box.w / 2 - at.x;
    const cy = box.h / 2 - at.y;
    const k = next / zoom;
    setZoom(next);
    setPos({ x: box.w / 2 - cx * k, y: box.h / 2 - cy * k });
  };

  const down = (e: PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: at.x, y: at.y, px: e.clientX, py: e.clientY };
  };
  const move = (e: PointerEvent) => {
    if (!drag.current) return;
    setPos(clamp({ x: drag.current.x + e.clientX - drag.current.px, y: drag.current.y + e.clientY - drag.current.py }));
  };
  const up = () => {
    if (drag.current) setPos(at);
    drag.current = null;
  };

  const turn = async () => {
    if (!img) return;
    setImg(await rotated(img));
    setZoom(1);
    setPos(null);
  };

  /** Draws the framed part at the recommended size (or smaller, if the picture is smaller) */
  const crop = async () => {
    if (!img) return;
    const sw = box.w / scale;
    const sh = box.h / scale;
    const outW = Math.round(Math.min(spec.width, sw));
    const outH = Math.round(outW / spec.aspect);
    const c = document.createElement("canvas");
    c.width = outW;
    c.height = outH;
    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, -at.x / scale, -at.y / scale, sw, sh, 0, 0, outW, outH);
    // Logos keep transparency; covers are photos
    const type = spec.round ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, type, 0.88));
    if (!blob) return setError("Couldn't prepare the picture. Try another one.");
    const name = file.name.replace(/\.[^.]+$/, "") + (type === "image/png" ? ".png" : ".jpg");
    onDone(new File([blob], name, { type }));
  };

  const small = img && (img.naturalWidth < spec.width || img.naturalHeight < spec.height);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-2">
        Recommended: <b>{spec.width} × {spec.height} px</b>
        {spec.round ? ", square (it shows as a circle in the app)" : ` (${spec.aspect}:1, wide)`}. Drag to move, and zoom to fit.
      </p>

      <div
        ref={frame}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        className="relative w-full cursor-grab touch-none select-none overflow-hidden rounded-2xl bg-surface-alt active:cursor-grabbing"
        style={{ height: box.h || undefined, aspectRatio: box.h ? undefined : `${spec.aspect}` }}
      >
        {img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img.src} alt="" draggable={false} className="pointer-events-none absolute max-w-none" style={{ left: at.x, top: at.y, width: shownW, height: shownH }} />
        )}
        {spec.round && box.w > 0 && (
          // What shows in the app's circle
          <div className="pointer-events-none absolute inset-0 rounded-full" style={{ boxShadow: "0 0 0 9999px rgba(23,18,14,0.45)" }} />
        )}
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setZoomKeepingCentre(zoom - 0.25)} aria-label="Zoom out" className="text-muted hover:text-ink">
          <ZoomOut size={18} />
        </button>
        <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={(e) => setZoomKeepingCentre(Number(e.target.value))} aria-label="Zoom" className="flex-1 accent-[var(--color-brand)]" />
        <button type="button" onClick={() => setZoomKeepingCentre(zoom + 0.25)} aria-label="Zoom in" className="text-muted hover:text-ink">
          <ZoomIn size={18} />
        </button>
        <button type="button" onClick={turn} aria-label="Rotate" className="ml-1 flex h-9 w-9 items-center justify-center rounded-full border border-line hover:border-ink">
          <RotateCw size={16} />
        </button>
      </div>

      {img && (
        <p className={`text-xs ${small ? "text-warn" : "text-muted"}`}>
          Your picture is {img.naturalWidth} × {img.naturalHeight} px.{small ? " Smaller than recommended, so it may look soft on big screens." : ""}
        </p>
      )}
      {error && <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <button type="button" disabled={!img} onClick={crop} className={`${btn.dark} sm:flex-1`}>
          Use this crop
        </button>
        <button type="button" disabled={!img} onClick={() => onDone(file)} className={`${btn.outline} sm:flex-1`}>
          Use the whole picture
        </button>
      </div>
      <button type="button" onClick={onCancel} className="text-sm font-semibold text-muted hover:text-ink">
        Cancel
      </button>
    </div>
  );
}
