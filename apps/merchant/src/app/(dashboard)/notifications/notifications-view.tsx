"use client";

import { Bell, Check, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { MerchantNotice, MerchantProduct } from "@sotechy/shared";
import { RelTime } from "@/components/rel-time";
import { btn, Card, Field, inputClass, PageHeader, Pill, StatCard } from "@/components/ui";
import { useAccount } from "@/components/account-context";
import { sendNotice } from "@/lib/market-actions";

const TITLE_MAX = 60;
const BODY_MAX = 240;
const PER_DAY = 3;
const sentToday = (iso: string, now: number) => now - new Date(iso).getTime() < 24 * 3_600_000;

/** How the message looks when it pops up on a subscriber's phone */
function PhonePop({ title, body }: { title: string; body: string }) {
  const { store, user } = useAccount();
  return (
    <div className="rounded-[32px] bg-panel p-3">
      <div className="rounded-[24px] bg-gradient-to-br from-[#3a2a1c] via-[#20180f] to-[#100c08] p-3 pb-16">
        <div className="flex gap-3 rounded-2xl bg-white/95 p-3 text-[#17120e] shadow-lg">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-extrabold text-white">{store.name.slice(0, 2).toUpperCase()}</span>
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold text-[#7f756c]">{store.name} · now</span>
            <span className="block truncate text-sm font-bold">{title || "Your title"}</span>
            <span className="line-clamp-2 block text-xs text-[#3a322c]">{body || "Your message shows here."}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export function NotificationsView({ followers, sent, products }: { followers: number; sent: MerchantNotice[]; products: MerchantProduct[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [done, setDone] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const [now] = useState(() => Date.now());
  const today = sent.filter((s) => sentToday(s.createdAt, now)).length;
  const left = Math.max(0, PER_DAY - today);
  const ready = title.trim().length >= 3 && body.trim().length >= 5 && left > 0 && followers > 0;
  const send = () =>
    start(async () => {
      setError(null);
      const r = await sendNotice({ title: title.trim(), body: body.trim(), productId: link || null });
      if ("error" in r) return setError(r.error);
      setTitle("");
      setBody("");
      setLink("");
      setDone(r.ok.sentTo);
      router.refresh();
    });

  return (
    <>
      <PageHeader illo="chat" title="Notifications" description="Send deals and news to people who follow your store in the Sotechy app. Only followers get them, as a notification and in their inbox." />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1">
        <StatCard accent illo="chat" label="Followers" value={followers.toLocaleString()} hint="Will get your message" />
        <StatCard illo="sparkle" label="Messages sent" value={sent.length.toLocaleString()} hint="All time" />
        <StatCard illo="receipt" label="Left today" value={`${left} of ${PER_DAY}`} hint="So followers don't switch you off" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card title="New message">
          {done !== null ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-good-soft">
                <Check size={26} className="text-good" />
              </span>
              <p className="font-display text-xl font-bold">Sent to {done.toLocaleString()} follower{done === 1 ? "" : "s"}</p>
              <p className="text-sm text-muted">It arrives on their phones now and stays in their Notifications inbox.</p>
              <button onClick={() => setDone(null)} className={btn.outline}>Write another</button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <Field label="Title" hint={`${title.length}/${TITLE_MAX}`}>
                <input value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="e.g. Weekend sale: 10% off phones" />
              </Field>
              <Field label="Message" hint={`${body.length}/${BODY_MAX}`}>
                <textarea rows={3} value={body} maxLength={BODY_MAX} onChange={(e) => setBody(e.target.value)} className={inputClass} placeholder="What's new, and why they should look today." />
              </Field>
              <Field label="When they tap it, open" hint="Optional. Opens your storefront if you leave it.">
                <select value={link} onChange={(e) => setLink(e.target.value)} className={inputClass}>
                  <option value="">Your storefront</option>
                  {products
                    .filter((p) => p.status === "live")
                    .map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
              </Field>
              <div className="sm:hidden">
                <PhonePop title={title} body={body} />
              </div>
              {error && <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}
              <button disabled={!ready || busy} onClick={send} className={btn.primary}>
                <Send size={16} /> {busy ? "Sending…" : `Send to ${followers.toLocaleString()} follower${followers === 1 ? "" : "s"}`}
              </button>
              {followers === 0 && <p className="text-xs text-muted">Nobody follows your store yet. Customers follow you from your store page in the app.</p>}
              {left === 0 && <p className="text-xs text-warn">You&apos;ve sent {PER_DAY} today. You can send again tomorrow.</p>}
              <p className="text-xs text-muted">Sotechy checks messages for spam. Order updates are sent separately and don&apos;t count.</p>
            </div>
          )}
        </Card>

        <div className="hidden flex-col gap-3 sm:flex">
          <p className="text-center text-sm font-semibold text-muted">How it pops up</p>
          <PhonePop title={title} body={body} />
        </div>
      </div>

      <Card className="mt-6" title="Sent">
        {sent.length === 0 && <p className="text-sm text-muted">Messages you send show here.</p>}
        <ul className="flex flex-col divide-y divide-line">
          {sent.map((s) => (
            <li key={s.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft">
                <Bell size={17} className="text-brand-strong" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{s.title}</span>
                <span className="block truncate text-sm text-muted">{s.body}</span>
              </span>
              <span className="flex shrink-0 flex-wrap items-center gap-2 text-xs text-muted">
                <Pill tone="neutral" dot={false}>{s.sentTo.toLocaleString()} sent</Pill>
                <RelTime iso={s.createdAt} />
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
