"use client";

import { ArrowLeft, Check, Clock, MapPin, Phone, Store, Truck, X } from "lucide-react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Illo } from "@/components/illustrations";
import { btn, Card, Field, inputClass, Pill, ProductThumb } from "@/components/ui";
import { formatNaira, formatTokens, PLATFORM_FEE, timeAgo, timeLeft } from "@/lib/money";
import { ORDER_STATUS, orderMoney, orders, store, type OrderStatus } from "@/lib/mock";

const DECLINE_REASONS = ["Out of stock", "Can't deliver to this location", "Price or listing mistake", "Other"];

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-[28px] bg-surface p-6 sm:rounded-[28px]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-alt">
            <X size={17} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function MoneyRow({ label, value, strong, tone }: { label: ReactNode; value: ReactNode; strong?: boolean; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className={strong ? "font-semibold" : "text-muted"}>{label}</span>
      <span className={`${strong ? "font-display text-lg font-bold" : "font-medium"} ${tone ?? ""}`}>{value}</span>
    </div>
  );
}

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const order = orders.find((o) => o.id === id);
  // Demo: actions move the order along locally.
  const [status, setStatus] = useState<OrderStatus | null>(null);
  const [history, setHistory] = useState(order?.history ?? []);
  const [dialog, setDialog] = useState<null | "accept" | "decline" | "ship" | "deliver">(null);
  const [reason, setReason] = useState(DECLINE_REASONS[0]);
  if (!order) notFound();

  const s = status ?? order.status;
  const m = orderMoney(order);
  const firstPaid = m.firstPaid || ["accepted", "shipped", "delivered"].includes(s);
  const secondPaid = s === "completed";
  const move = (next: OrderStatus, label: string, note?: string) => {
    setStatus(next);
    setHistory((h) => [...h, { at: new Date().toISOString(), label, note }]);
    setDialog(null);
  };

  const steps = order.fulfilment === "pickup" ? ["Placed", "Accepted", "Ready", "Collected", "Completed"] : ["Placed", "Accepted", "Shipped", "Delivered", "Completed"];
  const stepIndex = { new: 0, accepted: 1, shipped: 2, delivered: 3, completed: 4, declined: 0, payback: 1 }[s];

  return (
    <>
      <Link href="/orders" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft size={16} /> Orders
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold">{order.number}</h1>
            <Pill tone={ORDER_STATUS[s].tone}>{ORDER_STATUS[s].label}</Pill>
          </div>
          <p className="mt-1 text-sm text-muted">Placed {timeAgo(order.createdAt)} · {order.fulfilment === "pickup" ? "Store pickup" : "Delivery"}</p>
        </div>
      </div>

      {/* What to do next */}
      {s === "new" && (
        <section className="mb-6 flex flex-col gap-4 rounded-[28px] bg-panel p-6 text-white sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-sun">
              <Clock size={15} /> {timeLeft(order.acceptBy!)} to answer
            </p>
            <p className="mt-1 text-xl font-bold">Can you fulfil this order?</p>
            <p className="mt-1 text-sm text-white/70">Accept and {formatNaira(m.first)} (the first 50%) is sent to your bank straight away.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setDialog("decline")} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white/10 px-5 font-semibold hover:bg-white/15">
              <X size={17} /> Decline
            </button>
            <button onClick={() => setDialog("accept")} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-brand px-6 font-semibold hover:bg-brand-strong">
              <Check size={17} /> Accept order
            </button>
          </div>
        </section>
      )}
      {s === "accepted" && (
        <NextStep illo={order.fulfilment === "pickup" ? "store" : "bike"} title={order.fulfilment === "pickup" ? "Get it ready for pickup" : "Ship the order"} body="Let the customer know it's on the way. They'll get a notification.">
          <button onClick={() => setDialog("ship")} className={btn.dark}>
            {order.fulfilment === "pickup" ? <Store size={16} /> : <Truck size={16} />} {order.fulfilment === "pickup" ? "Ready for pickup" : "Mark as shipped"}
          </button>
        </NextStep>
      )}
      {s === "shipped" && (
        <NextStep illo="bike" title="On the way" body="When the customer has it, mark it delivered. They'll then confirm to release your second 50%.">
          <button onClick={() => setDialog("deliver")} className={btn.dark}>
            <Check size={16} /> Mark as delivered
          </button>
        </NextStep>
      )}
      {s === "delivered" && (
        <NextStep illo="heart" title="Waiting for the customer to confirm" body={`Once @${order.customer.username} confirms, you receive ${formatNaira(m.second)} and they get their tokens. If they don't respond, Sotechy reviews and confirms.`} />
      )}
      {s === "completed" && <NextStep illo="sparkle" title="Completed" body={`Both halves are paid and @${order.customer.username} received their $${store.ticker}.`} />}
      {s === "declined" && <NextStep illo="doc" title="You declined this order" body="The customer was refunded and their pending tokens were cancelled." />}
      {s === "payback" && (
        <section className="mb-6 rounded-[28px] border-2 border-bad/30 bg-bad-soft p-6">
          <p className="text-xl font-bold text-bad">Please pay back {formatNaira(m.first)}</p>
          <p className="mt-1 text-sm text-ink-2">This order couldn&apos;t be shipped, so Sotechy is refunding the customer. Send the first 50% back to Sotechy&apos;s account below and tap &quot;I&apos;ve paid it back&quot;.</p>
          <div className="mt-4 grid gap-2 rounded-2xl bg-surface p-4 text-sm sm:grid-cols-3">
            <p><span className="text-muted">Bank</span><br /><b>Sotechy (via Money Moves)</b></p>
            <p><span className="text-muted">Account</span><br /><b>To be set in admin</b></p>
            <p><span className="text-muted">Reference</span><br /><b>{order.number}</b></p>
          </div>
          <button className={`${btn.dark} mt-4`}>I&apos;ve paid it back</button>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-6">
          {/* Progress */}
          {s !== "declined" && (
            <Card>
              <ol className="flex items-start">
                {steps.map((label, i) => (
                  <li key={label} className="flex flex-1 flex-col items-center gap-2 text-center">
                    <div className="flex w-full items-center">
                      <span className={`h-1 flex-1 rounded ${i === 0 ? "invisible" : i <= stepIndex ? "bg-brand" : "bg-line"}`} />
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${i < stepIndex ? "bg-brand text-white" : i === stepIndex ? "bg-panel text-white ring-4 ring-brand/30" : "bg-surface-alt text-muted"}`}>
                        {i < stepIndex ? <Check size={15} /> : i + 1}
                      </span>
                      <span className={`h-1 flex-1 rounded ${i === steps.length - 1 ? "invisible" : i < stepIndex ? "bg-brand" : "bg-line"}`} />
                    </div>
                    <span className={`text-xs ${i === stepIndex ? "font-bold" : "text-muted"}`}>{label}</span>
                  </li>
                ))}
              </ol>
            </Card>
          )}

          <Card title={`Items (${order.items.reduce((n, i) => n + i.qty, 0)})`}>
            <ul className="flex flex-col divide-y divide-line">
              {order.items.map((i) => (
                <li key={i.name} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <ProductThumb src={i.image} size={64} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{i.name}</p>
                    <p className="text-sm text-muted">{i.option ? `${i.option} · ` : ""}{i.qty} × {formatNaira(i.price)}</p>
                  </div>
                  <p className="font-semibold">{formatNaira(i.qty * i.price)}</p>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Timeline">
            <ol className="flex flex-col">
              {[...history].reverse().map((h, i) => (
                <li key={h.at + h.label} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className={`mt-1 h-3.5 w-3.5 rounded-full ${i === 0 ? "bg-brand ring-4 ring-brand-soft" : "border-2 border-line bg-surface"}`} />
                    {i < history.length - 1 && <span className="w-0.5 flex-1 bg-line" />}
                  </div>
                  <div className="pb-5">
                    <p className="text-sm font-semibold">{h.label}</p>
                    {h.note && <p className="text-sm text-muted">{h.note}</p>}
                    <p className="text-xs text-faint">{timeAgo(h.at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card title="Customer">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">{order.customer.name.split(" ").map((p) => p[0]).join("")}</span>
              <div>
                <p className="font-semibold">{order.customer.name}</p>
                <p className="text-sm text-muted">@{order.customer.username}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2 text-sm text-ink-2">
              <p className="flex items-start gap-2"><Phone size={15} className="mt-0.5 text-muted" />{order.customer.phone}</p>
              <p className="flex items-start gap-2"><MapPin size={15} className="mt-0.5 text-muted" />{order.fulfilment === "pickup" ? "Picks up at your store" : order.customer.address}</p>
            </div>
          </Card>

          <Card title="Your money">
            <MoneyRow label="Order total" value={formatNaira(m.total)} />
            {order.paidWithTokens > 0 && <MoneyRow label={`Paid with $${store.ticker}`} value={formatNaira(order.paidWithTokens)} tone="text-brand-strong" />}
            <MoneyRow label={`Sotechy fee (${PLATFORM_FEE * 100}%)`} value={`−${formatNaira(m.fee)}`} />
            <div className="my-2 border-t border-line" />
            <MoneyRow strong label="You receive" value={formatNaira(m.share)} />
            <div className="mt-3 flex flex-col gap-2">
              <Half label="First 50% · on accept" amount={m.first} paid={firstPaid} refundDue={s === "payback"} />
              <Half label="Second 50% · on delivery" amount={m.second} paid={secondPaid} />
            </div>
            {order.paidWithTokens > 0 && <p className="mt-3 text-xs text-muted">The ${store.ticker} part is paid to you in naira by Sotechy, like the rest of the order.</p>}
          </Card>

          <Card title="Customer's tokens">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between rounded-2xl bg-brand-soft px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-semibold"><Illo name="coin" size={22} /> {formatTokens(m.tokens)} ${store.ticker}</span>
                <Pill tone={s === "completed" ? "good" : s === "declined" ? "neutral" : "warn"}>{s === "completed" ? "Released" : s === "declined" ? "Cancelled" : "Pending"}</Pill>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-surface-alt px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-semibold"><Illo name="sparkle" size={22} /> {formatTokens(m.sotechyBonus)} $SOTECHY</span>
                <span className="text-xs text-muted">Sotechy bonus</span>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted">Tokens are released to the customer when the order completes. They can also earn up to 10% more by reviewing.</p>
          </Card>
        </div>
      </div>

      <Modal open={dialog === "accept"} onClose={() => setDialog(null)} title="Accept this order?">
        <p className="text-sm text-ink-2">You&apos;re confirming you have the items and can {order.fulfilment === "pickup" ? "have them ready for pickup" : "deliver them"}.</p>
        <div className="my-4 rounded-2xl bg-good-soft p-4">
          <p className="text-sm text-good">Paid to your bank now</p>
          <p className="font-display text-2xl font-bold text-good">{formatNaira(m.first)}</p>
          <p className="text-xs text-ink-2">The other {formatNaira(m.second)} follows when the customer confirms delivery.</p>
        </div>
        <button onClick={() => move("accepted", "You accepted", `First 50% (${formatNaira(m.first)}) sent to your bank`)} className={`${btn.primary} w-full`}>
          Accept and get paid 50%
        </button>
      </Modal>

      <Modal open={dialog === "decline"} onClose={() => setDialog(null)} title="Decline this order?">
        <p className="mb-4 text-sm text-ink-2">The customer is refunded in full and their pending tokens are cancelled.</p>
        <div className="mb-4 flex flex-col gap-2">
          {DECLINE_REASONS.map((r) => (
            <label key={r} className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${reason === r ? "border-ink" : "border-line"}`}>
              <input type="radio" checked={reason === r} onChange={() => setReason(r)} /> {r}
            </label>
          ))}
        </div>
        <button onClick={() => move("declined", "You declined", reason)} className={`${btn.danger} w-full`}>
          Decline order
        </button>
      </Modal>

      <Modal open={dialog === "ship"} onClose={() => setDialog(null)} title={order.fulfilment === "pickup" ? "Ready for pickup" : "Mark as shipped"}>
        {order.fulfilment === "delivery" ? (
          <div className="flex flex-col gap-3">
            <Field label="Rider or courier">
              <input className={inputClass} placeholder="e.g. Kunle, or GIG Logistics" />
            </Field>
            <Field label="Phone or tracking number">
              <input className={inputClass} placeholder="0806 000 1122" />
            </Field>
          </div>
        ) : (
          <p className="text-sm text-ink-2">We&apos;ll tell the customer their order is ready to collect.</p>
        )}
        <button onClick={() => move("shipped", order.fulfilment === "pickup" ? "Ready for pickup" : "Shipped")} className={`${btn.dark} mt-4 w-full`}>
          Confirm
        </button>
      </Modal>

      <Modal open={dialog === "deliver"} onClose={() => setDialog(null)} title="Mark as delivered?">
        <p className="text-sm text-ink-2">We&apos;ll ask @{order.customer.username} to confirm they received it. Your second 50% ({formatNaira(m.second)}) is sent once they do.</p>
        <button onClick={() => move("delivered", "Marked delivered", "Waiting for the customer to confirm")} className={`${btn.dark} mt-4 w-full`}>
          Mark as delivered
        </button>
      </Modal>
    </>
  );
}

function NextStep({ illo, title, body, children }: { illo: Parameters<typeof Illo>[0]["name"]; title: string; body: string; children?: ReactNode }) {
  return (
    <section className="mb-6 flex flex-col gap-4 rounded-[28px] border border-line bg-surface p-5 sm:flex-row sm:items-center">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-soft">
        <Illo name={illo} size={36} />
      </span>
      <div className="flex-1">
        <p className="text-lg font-bold">{title}</p>
        <p className="text-sm text-muted">{body}</p>
      </div>
      {children}
    </section>
  );
}

function Half({ label, amount, paid, refundDue }: { label: string; amount: number; paid: boolean; refundDue?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-line px-4 py-3">
      <div>
        <p className="text-xs text-muted">{label}</p>
        <p className="font-semibold">{formatNaira(amount)}</p>
      </div>
      <Pill tone={refundDue ? "bad" : paid ? "good" : "neutral"}>{refundDue ? "Pay back" : paid ? "Paid" : "Upcoming"}</Pill>
    </div>
  );
}
