"use client";

import { Bell, Check, Send } from "lucide-react";
import { useState } from "react";
import { RelTime } from "@/components/rel-time";
import { btn, Card, Field, inputClass, PageHeader, Pill, StatCard } from "@/components/ui";
import { products, sentNotices, store } from "@/lib/mock";

const TITLE_MAX = 50;
const BODY_MAX = 160;
const PER_WEEK = 3;
const sentThisWeek = (iso: string) => Date.now() - new Date(iso).getTime() < 7 * 24 * 3_600_000;

/** How the message looks when it pops up on a subscriber's phone */
function PhonePop({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[32px] bg-panel p-3">
      <div className="rounded-[24px] bg-[url('/demo/store-inside.jpg')] bg-cover bg-center p-3 pb-16">
        <div className="flex gap-3 rounded-2xl bg-white/95 p-3 text-[#17120e] shadow-lg">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={store.logo} alt="" className="h-[80%] w-[80%] object-contain" />
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

export default function NotificationsPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [sent, setSent] = useState(sentNotices);
  const [done, setDone] = useState(false);
  const thisWeek = sent.filter((s) => sentThisWeek(s.at)).length;
  const left = Math.max(0, PER_WEEK - thisWeek);
  const ready = title.trim().length > 0 && body.trim().length > 0 && left > 0;
  const opens = sent.reduce((n, s) => n + s.opened, 0) / Math.max(1, sent.reduce((n, s) => n + s.sentTo, 0));

  return (
    <>
      <PageHeader illo="chat" title="Notifications" description="Send deals and news to people who subscribed to your store in the Sotechy app. Only subscribers get them, as a pop-up and in their inbox." />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1">
        <StatCard accent illo="chat" label="Subscribers" value={store.followers.toLocaleString()} hint="Will get your message" />
        <StatCard illo="sparkle" label="Opened" value={`${Math.round(opens * 100)}%`} hint="Of your last messages" />
        <StatCard illo="receipt" label="Left this week" value={`${left} of ${PER_WEEK}`} hint="So subscribers don't switch you off" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card title="New message">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-good-soft">
                <Check size={26} className="text-good" />
              </span>
              <p className="font-display text-xl font-bold">Sent to {store.followers.toLocaleString()} subscribers</p>
              <p className="text-sm text-muted">It pops up on their phones now and stays in their Notifications inbox.</p>
              <button onClick={() => setDone(false)} className={btn.outline}>Write another</button>
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
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                </select>
              </Field>
              <div className="sm:hidden">
                <PhonePop title={title} body={body} />
              </div>
              <button
                disabled={!ready}
                onClick={() => {
                  setSent([{ id: `s${Date.now()}`, title: title.trim(), body: body.trim(), at: new Date().toISOString(), sentTo: store.followers, opened: 0, link }, ...sent]);
                  setTitle("");
                  setBody("");
                  setLink("");
                  setDone(true);
                }}
                className={btn.primary}
              >
                <Send size={16} /> Send to {store.followers.toLocaleString()} subscribers
              </button>
              {left === 0 && <p className="text-xs text-warn">You&apos;ve sent {PER_WEEK} this week. You can send again next week.</p>}
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
                <Pill tone="good" dot={false}>{s.sentTo ? Math.round((s.opened / s.sentTo) * 100) : 0}% opened</Pill>
                <RelTime iso={s.at} />
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
