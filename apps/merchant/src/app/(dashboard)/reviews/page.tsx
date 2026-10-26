"use client";

import { Camera, Star } from "lucide-react";
import { useState } from "react";
import { btn, Card, inputClass, PageHeader, Pill, ProductThumb } from "@/components/ui";
import { RelTime } from "@/components/rel-time";
import { formatTokens } from "@/lib/money";
import { reviews as initial, store } from "@/lib/mock";

const Stars = ({ n, size = 15 }: { n: number; size?: number }) => (
  <span className="inline-flex gap-0.5 text-sun">
    {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={size} fill={i <= n ? "currentColor" : "none"} className={i <= n ? "" : "text-line"} />)}
  </span>
);

export default function ReviewsPage() {
  const [reviews, setReviews] = useState(initial);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const avg = reviews.reduce((n, r) => n + r.rating, 0) / reviews.length;

  return (
    <>
      <PageHeader illo="heart" title="Reviews" description={`Only customers who received the item can review it. They earn bonus $${store.ticker}: 10% with a photo, 5% without.`} />

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <Card>
          <p className="font-display text-6xl font-extrabold">{avg.toFixed(1)}</p>
          <Stars n={Math.round(avg)} size={20} />
          <p className="mt-1 text-sm text-muted">{reviews.length} reviews</p>
          <div className="mt-5 flex flex-col gap-1.5">
            {[5, 4, 3, 2, 1].map((s) => {
              const n = reviews.filter((r) => r.rating === s).length;
              return (
                <div key={s} className="flex items-center gap-2 text-sm">
                  <span className="w-3 text-muted">{s}</span>
                  <Star size={12} className="text-sun" fill="currentColor" />
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-alt">
                    <span className="block h-full rounded-full bg-sun" style={{ width: `${(n / reviews.length) * 100}%` }} />
                  </span>
                  <span className="w-4 text-right text-muted">{n}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <ul className="flex flex-col gap-4">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-3xl border border-line bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Stars n={r.rating} />
                  <p className="mt-1 text-sm"><b>{r.customer}</b> <span className="text-muted">on {r.product} · <RelTime iso={r.at} /></span></p>
                </div>
                <Pill tone="brand">
                  {r.photo && <Camera size={12} />} +{formatTokens(r.bonus)} ${store.ticker} bonus
                </Pill>
              </div>
              <p className="mt-3 text-ink-2">{r.text}</p>
              {r.photo && <div className="mt-3"><ProductThumb src={r.photo} size={88} /></div>}
              {r.reply ? (
                <div className="mt-4 rounded-2xl bg-surface-alt p-4 text-sm">
                  <p className="text-xs font-semibold text-muted">Your reply</p>
                  <p className="mt-1">{r.reply}</p>
                </div>
              ) : (
                <div className="mt-4 flex gap-2">
                  <input value={drafts[r.id] ?? ""} onChange={(e) => setDrafts({ ...drafts, [r.id]: e.target.value })} className={inputClass} placeholder="Reply publicly…" />
                  <button
                    disabled={!drafts[r.id]?.trim()}
                    onClick={() => setReviews(reviews.map((x) => (x.id === r.id ? { ...x, reply: drafts[r.id].trim() } : x)))}
                    className={btn.dark}
                  >
                    Reply
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
