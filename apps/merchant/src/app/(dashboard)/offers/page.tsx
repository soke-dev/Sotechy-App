"use client";

// Offers: customers negotiating a product's price with this store. One conversation per customer per product.
// When the store agrees, only that customer can buy at that price, for 6, 12 or 24 hours.
import { ArrowLeft, Check, Clock, MessageCircle, Send, X } from "lucide-react";
import { useState } from "react";
import { RelTime } from "@/components/rel-time";
import { btn, EmptyState, inputClass, PageHeader, Pill, ProductThumb, Tabs } from "@/components/ui";
import { formatNaira } from "@/lib/money";
import { OFFER_HOURS, OFFER_STATUS, offerThreads, products, type OfferHours, type OfferMessage, type OfferStatus, type OfferThread } from "@/lib/mock";

type Tab = "waiting_you" | "waiting_customer" | "agreed" | "closed";

const productOf = (t: OfferThread) => products.find((p) => p.id === t.productId)!;
const lastOffer = (t: OfferThread) => [...t.messages].reverse().find((m) => m.amount)?.amount;
const hoursFromNow = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();
const percentOff = (amount: number, price: number) => Math.round(((price - amount) / price) * 100);

function Bubble({ m, t }: { m: OfferMessage; t: OfferThread }) {
  const mine = m.from === "merchant";
  const price = productOf(t).price;
  if (m.kind === "text")
    return (
      <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
        <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${mine ? "rounded-br-lg bg-inverse text-on-inverse" : "rounded-bl-lg bg-surface-alt"}`}>
          {m.text}
          <span className={`mt-1 block text-[11px] ${mine ? "opacity-60" : "text-muted"}`}><RelTime iso={m.at} /></span>
        </div>
      </div>
    );
  const label =
    m.kind === "offer" ? `${t.customer.name.split(" ")[0]} offered` : m.kind === "counter" ? (mine ? "You countered" : "Counter-offer") : m.kind === "accepted" ? "Deal agreed" : "Declined";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`w-full max-w-sm rounded-2xl border-2 p-4 text-sm ${m.kind === "accepted" ? "border-good/40 bg-good-soft" : m.kind === "declined" ? "border-line bg-surface-alt" : "border-brand/40 bg-brand-soft"}`}>
        <p className="text-xs font-bold uppercase tracking-wider text-muted">{label}</p>
        {m.amount ? (
          <p className="font-display mt-1 text-2xl font-extrabold">
            {formatNaira(m.amount)}
            {m.kind !== "accepted" && <span className="ml-2 text-sm font-semibold text-muted">{percentOff(m.amount, price)}% off</span>}
          </p>
        ) : null}
        {m.hours && m.kind !== "offer" ? <p className="text-xs text-muted">{m.kind === "accepted" ? `Price held for ${m.hours} hours` : `If they accept, it's held for ${m.hours} hours`}</p> : null}
        {m.text && <p className="mt-2">{m.text}</p>}
        <p className="mt-1 text-[11px] text-muted"><RelTime iso={m.at} /></p>
      </div>
    </div>
  );
}

function Conversation({ t, onChange, onBack }: { t: OfferThread; onChange: (next: OfferThread, note?: string) => void; onBack: () => void }) {
  const p = productOf(t);
  const [text, setText] = useState("");
  const [hours, setHours] = useState<OfferHours>(p.negotiable?.hours ?? 12);
  const [countering, setCountering] = useState(false);
  const [counter, setCounter] = useState(0);
  const offer = lastOffer(t);
  const below = p.negotiable?.floor && offer && offer < p.negotiable.floor;
  const now = () => new Date().toISOString();
  const add = (m: Omit<OfferMessage, "id" | "at">, patch: Partial<OfferThread> = {}, note?: string) =>
    onChange({ ...t, ...patch, messages: [...t.messages, { ...m, id: `m${Date.now()}`, at: now() }] }, note);
  const first = t.customer.name.split(" ")[0];
  const told = `${first} was told on WhatsApp, by email and in the app.`;

  return (
    <div className="flex min-h-[70vh] min-w-0 flex-col rounded-2xl border border-line bg-surface">
      {/* Product and customer */}
      <div className="flex items-center gap-3 border-b border-line p-4">
        <button onClick={onBack} aria-label="All offers" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-surface-alt lg:hidden">
          <ArrowLeft size={18} />
        </button>
        <ProductThumb src={p.image} size={48} rounded="rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{p.name}</p>
          <p className="text-sm text-muted">
            Your price {formatNaira(p.price)}
            {p.negotiable?.floor ? ` · lowest ${formatNaira(p.negotiable.floor)}` : ""} · qty {t.qty}
          </p>
          <p className="text-xs text-muted">
            {t.customer.name} · @{t.customer.username}
          </p>
          <span className="mt-1 block sm:hidden">
            <Pill tone={OFFER_STATUS[t.status].tone}>{OFFER_STATUS[t.status].label}</Pill>
          </span>
        </div>
        <span className="hidden shrink-0 sm:block">
          <Pill tone={OFFER_STATUS[t.status].tone}>{OFFER_STATUS[t.status].label}</Pill>
        </span>
      </div>

      {t.status === "agreed" && t.expiresAt && (
        <div className="flex flex-wrap items-center gap-2 bg-good-soft px-4 py-3 text-sm text-good">
          <Clock size={16} />
          <b>Only @{t.customer.username} can buy at {formatNaira(t.agreedPrice!)}</b> · <RelTime iso={t.expiresAt} left />
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {t.messages.map((m) => (
          <Bubble key={m.id} m={m} t={t} />
        ))}
      </div>

      {/* What the merchant can do next */}
      <div className="flex flex-col gap-3 border-t border-line p-4">
        {t.status === "waiting_you" && offer && (
          <>
            {below ? <p className="rounded-2xl bg-warn-soft px-3 py-2 text-xs text-warn">This offer is below the lowest price you set ({formatNaira(p.negotiable!.floor!)}).</p> : null}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted">Hold an agreed price for</span>
              <div className="flex rounded-full bg-surface-alt p-1">
                {OFFER_HOURS.map((h) => (
                  <button key={h} onClick={() => setHours(h)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${hours === h ? "bg-surface shadow-sm" : "text-muted"}`}>
                    {h}h
                  </button>
                ))}
              </div>
            </div>
            {countering ? (
              <div className="flex flex-wrap gap-2">
                <input autoFocus type="number" min={0} value={counter || ""} onChange={(e) => setCounter(Number(e.target.value))} placeholder="Your price (₦)" className={`${inputClass} min-w-0 flex-1`} />
                <button onClick={() => setCountering(false)} className={btn.ghost}>Cancel</button>
                <button
                  disabled={!counter || counter >= p.price * 2}
                  onClick={() => {
                    add({ from: "merchant", kind: "counter", amount: counter, hours, text: text.trim() || undefined }, { status: "waiting_customer" }, `Counter-offer sent. ${told}`);
                    setCountering(false);
                    setText("");
                  }}
                  className={btn.dark}
                >
                  Send counter-offer
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => add({ from: "merchant", kind: "accepted", amount: offer, hours }, { status: "agreed", agreedPrice: offer, expiresAt: hoursFromNow(hours) }, `Deal agreed at ${formatNaira(offer)} for ${hours} hours. ${told}`)}
                  className={btn.primary}
                >
                  <Check size={16} /> Accept
                </button>
                <button
                  onClick={() => {
                    setCounter(Math.round((offer + p.price) / 2 / 500) * 500);
                    setCountering(true);
                  }}
                  className={btn.outline}
                >
                  Counter
                </button>
                <button onClick={() => add({ from: "merchant", kind: "declined", text: text.trim() || undefined }, { status: "declined" }, `Offer declined. ${told}`)} className={btn.danger}>
                  <X size={16} /> Decline
                </button>
              </div>
            )}
          </>
        )}
        {t.status === "waiting_customer" && <p className="text-sm text-muted">Waiting for {first} to answer your counter-offer. You can still message them.</p>}
        {t.status === "agreed" && (
          <button onClick={() => add({ from: "merchant", kind: "declined", text: "I've had to cancel this deal." }, { status: "declined", expiresAt: undefined }, `Deal cancelled. ${told}`)} className={`${btn.danger} self-start`}>
            Cancel the deal
          </button>
        )}

        {t.status !== "declined" && t.status !== "expired" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!text.trim()) return;
              add({ from: "merchant", kind: "text", text: text.trim() });
              setText("");
            }}
            className="flex gap-2"
          >
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Message ${first}…`} className={`${inputClass} min-w-0 flex-1`} />
            <button aria-label="Send" disabled={!text.trim()} className={`${btn.dark} px-4`}>
              <Send size={16} />
            </button>
          </form>
        ) : (
          <p className="text-sm text-muted">This conversation is closed. {first} can start a new offer from the product page.</p>
        )}
      </div>
    </div>
  );
}

export default function OffersPage() {
  const [threads, setThreads] = useState(offerThreads);
  const [tab, setTab] = useState<Tab>("waiting_you");
  const [openId, setOpenId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const inTab = (s: OfferStatus) => (tab === "closed" ? s === "declined" || s === "expired" : s === tab);
  const shown = threads.filter((t) => inTab(t.status));
  const open = threads.find((t) => t.id === openId) ?? null;
  const count = (s: OfferStatus[]) => threads.filter((t) => s.includes(t.status)).length;

  const change = (next: OfferThread, note?: string) => {
    // Keep the shared sample list in step, so the nav and home see the change
    const i = offerThreads.findIndex((t) => t.id === next.id);
    if (i >= 0) offerThreads[i] = next;
    setThreads(threads.map((t) => (t.id === next.id ? next : t)));
    if (note) setNotice(note);
  };

  return (
    <>
      <PageHeader illo="tag" title="Offers" description="Customers offering a price on your negotiable products. Agree and only that customer can buy at it, for 6, 12 or 24 hours." />

      {notice && (
        <p className="mb-4 flex items-center gap-2 rounded-2xl bg-good-soft px-4 py-3 text-sm font-semibold text-good">
          <Check size={16} /> {notice}
          <button onClick={() => setNotice(null)} aria-label="Dismiss" className="ml-auto">
            <X size={16} />
          </button>
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <div className={`min-w-0 ${open ? "hidden lg:block" : ""}`}>
          <Tabs
            className="mb-4"
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "waiting_you", label: "Needs you", count: count(["waiting_you"]), urgent: true },
              { id: "waiting_customer", label: "Waiting", count: count(["waiting_customer"]) },
              { id: "agreed", label: "Agreed", count: count(["agreed"]) },
              { id: "closed", label: "Closed", count: count(["declined", "expired"]) },
            ]}
          />
          {shown.length === 0 ? (
            <EmptyState illo="tag" title="Nothing here" message={tab === "waiting_you" ? "No offers waiting. Turn on offers for a product from its edit page." : "No conversations in this list."} />
          ) : (
            <ul className="flex flex-col gap-2">
              {shown.map((t) => {
                const p = productOf(t);
                const amount = t.agreedPrice ?? lastOffer(t);
                const last = t.messages[t.messages.length - 1];
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => setOpenId(t.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl border bg-surface p-3 text-left transition ${openId === t.id ? "border-ink" : t.status === "waiting_you" ? "border-brand/40" : "border-line hover:border-faint"}`}
                    >
                      <ProductThumb src={p.image} size={48} rounded="rounded-xl" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                          <span className="truncate font-semibold">{t.customer.name}</span>
                          <span className="ml-auto shrink-0 text-xs text-muted"><RelTime iso={last.at} /></span>
                        </span>
                        <span className="block truncate text-xs text-muted">{p.name}</span>
                        <span className="mt-0.5 flex items-center gap-2 text-sm">
                          {amount ? <b className="font-display">{formatNaira(amount)}</b> : null}
                          <span className="text-xs text-faint line-through">{formatNaira(p.price)}</span>
                          {t.status === "agreed" && t.expiresAt ? (
                            <span className="ml-auto text-xs font-semibold text-good"><RelTime iso={t.expiresAt} left /></span>
                          ) : (
                            <MessageCircle size={14} className="ml-auto text-faint" />
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className={`min-w-0 ${open ? "" : "hidden lg:block"}`}>
          {open ? (
            <Conversation key={open.id} t={open} onChange={change} onBack={() => setOpenId(null)} />
          ) : (
            <div className="flex min-h-[50vh] items-center justify-center rounded-2xl border-2 border-dashed border-line p-6">
              <EmptyState illo="chat" title="Pick a conversation" message="Offers and messages from customers about your negotiable products show here." />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
