"use client";

import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { MerchantReview } from "@sotechy/shared";
import { RelTime } from "@/components/rel-time";
import { btn, Card, EmptyState, inputClass, PageHeader, Pill, ProductThumb, Tabs } from "@/components/ui";
import { replyToReview } from "@/lib/market-actions";

const Stars = ({ n, size = 15 }: { n: number; size?: number }) => (
  <span className="inline-flex gap-0.5 text-sun">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star key={i} size={size} fill={i <= n ? "currentColor" : "none"} className={i <= n ? "" : "text-line"} />
    ))}
  </span>
);

export function ReviewsView({ reviews }: { reviews: MerchantReview[] }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"todo" | "replied" | "all">(reviews.some((r) => !r.reply) ? "todo" : "all");
  const avg = reviews.length ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length : 0;
  const match = { todo: (r: MerchantReview) => !r.reply, replied: (r: MerchantReview) => !!r.reply, all: () => true };
  const shown = reviews.filter(match[tab]);
  const reply = (id: string) =>
    start(async () => {
      setError(null);
      const r = await replyToReview(id, drafts[id].trim());
      if ("error" in r) return setError(r.error);
      setDrafts((d) => ({ ...d, [id]: "" }));
      router.refresh();
    });

  return (
    <>
      <PageHeader illo="heart" title="Reviews" description="Only customers who bought the item can review it. Your reply shows under the review in the app." />
      {reviews.length === 0 ? (
        <EmptyState illo="heart" title="No reviews yet" message="When customers review your products, they show here and you can reply." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
          <Card className="self-start">
            <div className="flex items-center gap-5 lg:block">
              <div className="shrink-0">
                <p className="font-display text-5xl font-extrabold lg:text-6xl">{avg.toFixed(1)}</p>
                <Stars n={Math.round(avg)} size={16} />
                <p className="mt-1 text-sm text-muted">
                  {reviews.length} review{reviews.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5 lg:mt-5">
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
            </div>
          </Card>

          <div className="min-w-0">
            <Tabs
              className="mb-4"
              value={tab}
              onChange={setTab}
              tabs={[
                { id: "todo", label: "Needs reply", count: reviews.filter(match.todo).length, urgent: true },
                { id: "replied", label: "Replied", count: reviews.filter(match.replied).length },
                { id: "all", label: "All", count: reviews.length },
              ]}
            />
            {error && <p className="mb-4 rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}
            {shown.length === 0 && <EmptyState illo="heart" title={tab === "todo" ? "All caught up" : "Nothing here yet"} message={tab === "todo" ? "You've replied to every review." : "Reviews will show here."} />}
            <ul className="flex flex-col gap-4">
              {shown.map((r) => (
                <li key={r.id} className="rounded-2xl border border-line bg-surface p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <ProductThumb src={r.productImage} size={44} rounded="rounded-xl" />
                      <div>
                        <Stars n={r.rating} />
                        <p className="mt-1 text-sm">
                          <b>{r.customer ?? "Customer"}</b>{" "}
                          <span className="text-muted">
                            on {r.product} · <RelTime iso={r.createdAt} />
                          </span>
                        </p>
                      </div>
                    </div>
                    {r.verified && <Pill tone="good">Bought it</Pill>}
                  </div>
                  {r.title && <p className="mt-3 font-semibold">{r.title}</p>}
                  <p className="mt-1 text-ink-2">{r.body}</p>
                  {r.reply ? (
                    <div className="mt-4 rounded-2xl bg-surface-alt p-4 text-sm">
                      <p className="text-xs font-semibold text-muted">Your reply</p>
                      <p className="mt-1">{r.reply}</p>
                    </div>
                  ) : (
                    <div className="mt-4 flex gap-2">
                      <input value={drafts[r.id] ?? ""} maxLength={600} onChange={(e) => setDrafts({ ...drafts, [r.id]: e.target.value })} className={inputClass} placeholder="Reply publicly…" />
                      <button disabled={busy || !drafts[r.id]?.trim() || drafts[r.id].trim().length < 2} onClick={() => reply(r.id)} className={btn.dark}>
                        Reply
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
