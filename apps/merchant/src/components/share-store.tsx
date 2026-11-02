"use client";

// The store's link, to copy or share. It opens the store in the Sotechy app when it's installed,
// and on app.sotechy.shop when it isn't.
import { Check, Copy, Share2 } from "lucide-react";
import { useState } from "react";

const APP_SITE = "https://app.sotechy.shop";

export function ShareStore({ slug, name, live }: { slug: string; name: string; live: boolean }) {
  const url = `${APP_SITE}/store/${encodeURIComponent(slug)}`;
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title: name, text: `${name} on Sotechy`, url }).catch(() => {});
    } else await copy();
  };

  return (
    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Your store link</p>
        <p className="truncate text-sm text-brand-strong">{url.replace("https://", "")}</p>
        <p className="mt-0.5 text-xs text-muted">
          {live ? "Share it anywhere: it opens your store in the Sotechy app, or in the browser if they don't have the app." : "It works once Sotechy approves your store."}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button type="button" onClick={copy} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-sm font-semibold hover:bg-surface-alt">
          {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
          {copied ? "Copied" : "Copy"}
        </button>
        <button type="button" onClick={share} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-semibold text-surface hover:opacity-90">
          <Share2 size={16} />
          Share
        </button>
      </div>
    </div>
  );
}
