"use client";

// Offers: customers negotiating a product's price with this store, one conversation per customer per product.
// When the store agrees, only that customer can buy one at that price, for the product's offer hours.
import { ArrowLeft, Check, Clock, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { OfferStatus, OfferView } from "@sotechy/shared";
import { RelTime } from "@/components/rel-time";
import { btn, EmptyState, inputClass, PageHeader, Pill, ProductThumb, Tabs } from "@/components/ui";
import { answerOffer } from "@/lib/market-actions";
import { formatNaira } from "@/lib/money";

type Tab = "yours" | "theirs" | "agreed" | "closed";
const TAB_OF: Record<OfferStatus, Tab> = { waiting_store: "yours", waiting_customer: "theirs", agreed: "agreed", used: "agreed", declined: "closed", expired: "closed" };
const STATUS: Record<OfferStatus, { label: string; tone: "warn" | "info" | "good" | "bad" | "neutral" }> = {
  waiting_store: { label: "Your turn", tone: "warn" },
  waiting_customer: { label: "Waiting for them", tone: "info" },
  agreed: { label: "Agreed", tone: "good" },
  used: { label: "Bought", tone: "good" },
  declined: { label: "Declined", tone: "neutral" },
  expired: { label: "Expired", tone: "neutral" },
};
const percentOff = (amount: number, price: number) => Math.round(((price - amount) / price) * 100);

function Bubble({ m, o }: { m: OfferView["messages"][number]; o: OfferView }) {
  const mine = m.from === "store";
  const first = o.customer?.name.split(" ")[0] ?? "Customer";
  const label = m.kind === "offer" ? `${first} offered` : m.kind === "counter" ? (mine ? "You countered" : `${first} countered`) : m.kind === "accept" ? (mine ? "You accepted" : `${first} accepted`) : mine ? "You declined" : `${first} walked away`;
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`w-full max-w-sm rounded-2xl border p-4 text-sm ${m.kind === "accept" ? "border-good/40 bg-good-soft" : m.kind === "decline" ? "border-line bg-surface-alt" : mine ? "border-line bg-surface" : "border-brand/40 bg-brand-soft"}`}>
        <p className="text-xs font-bold uppercase tracking-wider text-muted">{label}</p>
        {m.amount ? (
          <p className="mt-1 font-display text-2xl font-extrabold">
            {formatNaira(m.amount)}
            {m.kind !== "accept" && <span className="ml-2 text-sm font-semibold text-muted">{percentOff(m.amount, o.listPrice)}% off</span>}
          </p>
        ) : null}
        {m.text && <p className="mt-2">{m.text}</p>}
        <p className="mt-1 text-[11px] text-muted">
          <RelTime iso={m.createdAt} />
        </p>
      </div>
    </div>
  );
}

function Conversation({ o, onBack }: { o: OfferView; onBack: () => void }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [countering, setCountering] = useState(false);
  const [counter, setCounter] = useState("");
  const [note, setNote] = useState("");
  const amount = Number(counter.replace(/\D/g, "")) || 0;
  const send = (action: "accept" | "decline" | "counter") =>
    start(async () => {
      setError(null);
      const r = await answerOffer(o.id, { action, amount: action === "counter" ? amount : undefined, text: note.trim() || null });
      if ("error" in r) return setError(r.error);
      setCountering(false);
      setCounter("");
      setNote("");
      router.refresh();
    });
  const yourTurn = o.status === "waiting_store";

  return (
    <div className="flex min-h-[70vh] min-w-0 flex-col rounded-2xl border border-line bg-surface">
      <div className="flex items-center gap-3 border-b border-line p-4">
        <button onClick={onBack} aria-label="All offers" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-surface-alt lg:hidden">
          <ArrowLeft size={18} />
        </button>
        <ProductThumb src={o.product.image} size={48} rounded="rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">
            {o.product.name}
            {o.product.variantName !== "Standard" ? ` · ${o.product.variantName}` : ""}
          </p>
          <p className="text-sm text-muted">
            Your price {formatNaira(o.listPrice)} · {o.customer?.name}
            {o.customer?.username ? ` · @${o.customer.username}` : ""}
          </p>
        </div>
        <Pill tone={STATUS[o.status].tone}>{STATUS[o.status].label}</Pill>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {o.messages.map((m) => (
          <Bubble key={m.id} m={m} o={o} />
        ))}
        {o.status === "agreed" && o.agreedUntil && (
          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted">
            <Clock size={13} /> Held for them until <RelTime iso={o.agreedUntil} />
          </p>
        )}
      </div>

      {yourTurn && (
        <div className="flex flex-col gap-3 border-t border-line p-4">
          {error && <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}
          {countering ? (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input autoFocus value={counter ? Number(counter.replace(/\D/g, "")).toLocaleString("en-NG") : ""} onChange={(e) => setCounter(e.target.value)} inputMode="numeric" placeholder={`More than ${formatNaira(o.lastAmount)}`} className={`${inputClass} flex-1`} />
                <button disabled={busy || amount <= o.lastAmount || amount >= o.listPrice} onClick={() => send("counter")} className={btn.dark}>
                  Send counter
                </button>
              </div>
              <button onClick={() => setCountering(false)} className="self-start text-sm text-muted hover:text-ink">
                Cancel
              </button>
            </div>
          ) : (
            <>
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Add a note (optional)" className={inputClass} />
              <div className="flex flex-wrap gap-2">
                <button disabled={busy} onClick={() => send("accept")} className={btn.primary}>
                  <Check size={16} /> Accept {formatNaira(o.lastAmount)}
                </button>
                <button disabled={busy} onClick={() => setCountering(true)} className={btn.outline}>
                  Counter
                </button>
                <button disabled={busy} onClick={() => send("decline")} className={btn.ghost}>
                  <X size={16} /> Decline
                </button>
              </div>
              <p className="text-xs text-muted">If you accept, only this customer can buy one at this price, for {o.hours} hours.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function OffersView({ offers }: { offers: OfferView[] }) {
  const [tab, setTab] = useState<Tab>(offers.some((o) => o.status === "waiting_store") ? "yours" : "theirs");
  const [openId, setOpenId] = useState<string | null>(null);
  const shown = offers.filter((o) => TAB_OF[o.status] === tab);
  const open = offers.find((o) => o.id === openId) ?? null;
  const count = (t: Tab) => offers.filter((o) => TAB_OF[o.status] === t).length;

  return (
    <>
      <PageHeader illo="tag" title="Offers" description="Customers can offer a price on products you mark as open to offers. Accept, counter or decline." />
      {offers.length === 0 ? (
        <EmptyState illo="tag" title="No offers yet" message="Turn on “Take offers” on a product and customers can suggest a price. Offers below your lowest price are declined for you." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
          <div className={open ? "hidden lg:block" : ""}>
            <Tabs
              className="mb-4"
              value={tab}
              onChange={setTab}
              tabs={[
                { id: "yours", label: "Your turn", count: count("yours"), urgent: true },
                { id: "theirs", label: "Their turn", count: count("theirs") },
                { id: "agreed", label: "Agreed", count: count("agreed") },
                { id: "closed", label: "Closed", count: count("closed") },
              ]}
            />
            <ul className="flex flex-col gap-2">
              {shown.map((o) => (
                <li key={o.id}>
                  <button onClick={() => setOpenId(o.id)} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${openId === o.id ? "border-ink bg-surface" : "border-line bg-surface hover:border-faint"}`}>
                    <ProductThumb src={o.product.image} size={48} rounded="rounded-xl" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{o.product.name}</span>
                      <span className="block text-sm text-muted">
                        {o.customer?.name} · {formatNaira(o.lastAmount)} <span className="text-faint">({percentOff(o.lastAmount, o.listPrice)}% off)</span>
                      </span>
                    </span>
                    <span className="text-xs text-muted">
                      <RelTime iso={o.updatedAt} />
                    </span>
                  </button>
                </li>
              ))}
              {!shown.length && <li className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">Nothing here.</li>}
            </ul>
          </div>
          <div className={open ? "" : "hidden lg:block"}>
            {open ? <Conversation key={open.id} o={open} onBack={() => setOpenId(null)} /> : <div className="flex min-h-[50vh] items-center justify-center rounded-2xl border border-dashed border-line text-sm text-muted">Choose an offer to see the conversation.</div>}
          </div>
        </div>
      )}
    </>
  );
}
