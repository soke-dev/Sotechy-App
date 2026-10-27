"use client";

import { ArrowLeft, Check, Clock, MapPin, Phone, Store, Truck, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Illo } from "@/components/illustrations";
import { btn, Card, Field, inputClass, Pill, ProductThumb } from "@/components/ui";
import { RelTime } from "@/components/rel-time";
import { DEFAULT_PAYOUT_SETTINGS, splitByPlan } from "@sotechy/shared";
import { formatNaira, formatTokens } from "@/lib/money";
import { orderAction } from "@/lib/market-actions";
import { AddressInput } from "@/components/address-input";
import { ORDER_STATUS, orderMoney, type Order } from "@/lib/mock";
import { useAccount } from "@/components/account-context";

const DECLINE_REASONS = ["Out of stock", "Can't deliver to this location", "Price or listing mistake", "Other"];

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-[28px] bg-surface p-6 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
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

export function OrderView({ order }: { order: Order }) {
  const { store } = useAccount();
  const router = useRouter();
  const [dialog, setDialog] = useState<null | "accept" | "decline" | "ship" | "deliver">(null);
  const [reason, setReason] = useState(DECLINE_REASONS[0]);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const history = order.history;

  const s = order.status;
  const m = orderMoney(order);
  // What the store is paid and when, on its payout plan (the delivery fee comes with the first payment)
  const terms = order.payoutTerms ?? { plan: DEFAULT_PAYOUT_SETTINGS.standard, feeRate: DEFAULT_PAYOUT_SETTINGS.feeRate, finalAfterHours: DEFAULT_PAYOUT_SETTINGS.finalAfterHours };
  const pay = splitByPlan(order.subtotal, order.deliveryFee, terms.plan, terms.feeRate);
  const receive = pay.first + pay.second;
  const feePercent = Math.round(terms.feeRate * 1000) / 10;
  /** Where each of the two payments is: paid, on its way, or not yet due */
  const stageState = (stage: "first" | "final") => {
    const p = order.payouts?.find((x) => x.stage === stage);
    if (!p) return { label: stage === "first" ? "When you accept" : "When the customer confirms delivery", tone: "neutral" as const, done: false };
    if (p.status === "paid") return { label: `Paid ${new Date(p.paidAt!).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}`, tone: "good" as const, done: true };
    if (p.status === "cancelled") return { label: "Cancelled", tone: "neutral" as const, done: false };
    if (p.status === "held") return { label: "On hold", tone: "warn" as const, done: false };
    if (stage === "final" && !order.customerConfirmedAt && new Date(p.dueAt).getTime() > Date.now()) return { label: "When the customer confirms delivery", tone: "neutral" as const, done: false };
    return { label: new Date(p.dueAt).getTime() > Date.now() ? `Due ${new Date(p.dueAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}` : "On its way", tone: "info" as const, done: false };
  };
  const firstState = stageState("first");
  const finalState = stageState("final");
  const afterDays = terms.finalAfterHours >= 48 && terms.finalAfterHours % 24 === 0 ? `${terms.finalAfterHours / 24} days` : `${terms.finalAfterHours} hours`;
  /** Sends the step to the server; the page reloads with the order's new state */
  // Shipping details (sent with the update) and another pickup location (sent for approval)
  const [courier, setCourier] = useState("");
  const [tracking, setTracking] = useState("");
  const [otherPlace, setOtherPlace] = useState(false);
  const [newPoint, setNewPoint] = useState("");
  const change = order.pickupChange;
  const waiting = change?.status === "pending";
  const move = (action: "accept" | "ship" | "deliver" | "decline" | "pickup-change", note?: string) =>
    start(async () => {
      setError(null);
      const r = await orderAction(order.id, action, note);
      if ("error" in r) setError(r.error);
      else {
        setDialog(null);
        router.refresh();
      }
    });

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
          <p className="mt-1 text-sm text-muted">Placed <RelTime iso={order.createdAt} /> · {order.fulfilment === "pickup" ? `Pickup${order.pickupPoint ? ` at ${order.pickupPoint}` : ""}` : "Delivery"}</p>
        </div>
      </div>

      {/* What to do next */}
      {s === "new" && (
        <section className="mb-6 flex flex-col gap-4 rounded-2xl bg-panel p-6 text-white sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-sun">
              <Clock size={15} /> <RelTime iso={order.acceptBy!} left /> to answer
            </p>
            <p className="mt-1 text-xl font-bold">Can you fulfil this order?</p>
            <p className="mt-1 text-sm text-white/70">If you can&apos;t, decline it and the customer is refunded in full.</p>
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
        <NextStep
          illo={order.fulfilment === "pickup" ? "store" : "bike"}
          title={order.fulfilment === "pickup" ? (waiting ? "New pickup location waiting for approval" : "Get it ready for pickup") : "Ship the order"}
          body={
            waiting
              ? `You asked to hand it over at ${change!.point}. You can mark it ready once it's approved.`
              : change?.status === "declined"
                ? `${change.point} wasn't approved. Use your approved pickup location${order.pickupPoint ? ` (${order.pickupPoint})` : ""}.`
                : "When you mark it, we update the customer on WhatsApp and email straight away."
          }
        >
          <button onClick={() => setDialog("ship")} disabled={waiting} className={btn.dark}>
            {order.fulfilment === "pickup" ? <Store size={16} /> : <Truck size={16} />} {order.fulfilment === "pickup" ? "Ready for pickup" : "Mark as shipped"}
          </button>
        </NextStep>
      )}
      {s === "shipped" && (
        <NextStep
          illo={order.fulfilment === "pickup" ? "store" : "bike"}
          title={order.fulfilment === "pickup" ? "Available for pickup" : "On the way"}
          body={
            order.fulfilment === "pickup"
              ? `Waiting for the customer at ${order.pickupPoint ?? "your pickup location"}. They tap "I've picked it up" in the app, or mark it collected when you hand it over.`
              : "When the customer has it, mark it delivered."
          }
        >
          <button onClick={() => setDialog("deliver")} className={btn.dark}>
            <Check size={16} /> {order.fulfilment === "pickup" ? "Mark as collected" : "Mark as delivered"}
          </button>
        </NextStep>
      )}
      {s === "delivered" && (
        <NextStep illo="heart" title="Waiting for the customer to confirm" body={`Once ${order.customer.username ? `@${order.customer.username}` : "the customer"} confirms, they get their tokens. If they don't respond, Sotechy reviews and confirms.`} />
      )}
      {s === "completed" && <NextStep illo="sparkle" title="Completed" body={`Delivered, and the customer earns their $${store.ticker}. Your money is paid out on your payout plan.`} />}
      {s === "declined" && <NextStep illo="doc" title="You declined this order" body="The customer was refunded and their pending tokens were cancelled." />}
      {s === "payback" && (
        <section className="mb-6 rounded-2xl border-2 border-bad/30 bg-bad-soft p-6">
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
                    <p className="text-xs text-faint"><RelTime iso={h.at} /></p>
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
              <p className="flex items-start gap-2"><MapPin size={15} className="mt-0.5 text-muted" />{order.fulfilment === "pickup" ? `Picks up at ${order.pickupPoint ?? "your pickup location"}` : order.customer.address}</p>
            </div>
          </Card>

          <Card title="Your money">
            <MoneyRow label="Order total" value={formatNaira(order.subtotal + order.deliveryFee)} />
            {order.paidWithTokens > 0 && <MoneyRow label={`Paid with $${store.ticker}`} value={formatNaira(order.paidWithTokens)} tone="text-brand-strong" />}
            <MoneyRow label={`Sotechy fee (${feePercent}%)`} value={`−${formatNaira(pay.fee)}`} />
            <div className="my-2 border-t border-line" />
            <MoneyRow strong label="You receive" value={formatNaira(receive)} />
            <div className="mt-2 flex flex-col gap-2">
              {[
                { name: "First payment", amount: pay.first, state: firstState },
                { name: "Final payment", amount: pay.second, state: finalState },
              ].map((r) => (
                <div key={r.name} className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm ${r.state.done ? "bg-good-soft" : "bg-surface-alt"}`}>
                  <span className="min-w-0">
                    <span className="block font-semibold">{r.name}</span>
                    <span className={`block text-xs ${r.state.done ? "text-good" : "text-muted"}`}>
                      {r.state.done && <Check size={12} className="mr-0.5 inline" />}
                      {r.state.label}
                    </span>
                  </span>
                  <span className={`font-semibold ${r.state.done ? "text-good" : ""}`}>{formatNaira(r.amount)}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">
              {firstState.done && finalState.done
                ? "Paid in full to your payout account."
                : firstState.done
                  ? `First payment made. The rest comes when the customer confirms delivery, or ${afterDays} after you mark it delivered.`
                  : `Paid to your payout account: the first part when you accept, the rest when the customer confirms delivery (or ${afterDays} after you mark it delivered).`}
            </p>
            {order.paidWithTokens > 0 && <p className="mt-3 text-xs text-muted">The ${store.ticker} part is paid to you in naira by Sotechy, like the rest of the order.</p>}
          </Card>

          <Card title="Customer's tokens">
            {/* The store's token and the $SOTECHY bonus side by side */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex min-w-0 flex-col gap-1.5 rounded-2xl bg-brand-soft px-3 py-3">
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  <Illo name="coin" size={20} /> <span className="truncate">{formatTokens(m.tokens)} ${store.ticker}</span>
                </span>
                <Pill tone={s === "completed" ? "good" : s === "declined" ? "neutral" : "warn"}>{s === "completed" ? "Released" : s === "declined" ? "Cancelled" : "Pending"}</Pill>
              </div>
              <div className="flex min-w-0 flex-col gap-1.5 rounded-2xl bg-surface-alt px-3 py-3">
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  <Illo name="sparkle" size={20} /> <span className="truncate">{formatTokens(m.sotechyBonus)} $SOTECHY</span>
                </span>
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
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-semibold text-good">You receive</p>
            <p className="font-display text-2xl font-bold text-good">{formatNaira(receive)}</p>
          </div>
          <dl className="mt-2 flex flex-col gap-1.5 border-t border-good/20 pt-2.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-2">
                When you accept{order.deliveryFee > 0 && <span className="text-xs text-muted"> · incl. {formatNaira(order.deliveryFee)} delivery</span>}
              </dt>
              <dd className="font-semibold">{formatNaira(pay.first)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-2">
                After delivery <span className="text-xs text-muted">· when the customer confirms</span>
              </dt>
              <dd className="font-semibold">{formatNaira(pay.second)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">
                Sotechy fee · {feePercent}% of {formatNaira(order.subtotal)}
              </dt>
              <dd className="text-muted">−{formatNaira(pay.fee)}</dd>
            </div>
          </dl>
        </div>
        <p className="-mt-1 mb-4 text-xs text-muted">We tell the customer straight away.</p>
        {error && <p className="mb-3 rounded-2xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}
        <button disabled={busy} onClick={() => move("accept")} className={`${btn.primary} w-full`}>
          {busy ? "Accepting…" : "Accept order"}
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
        {error && <p className="mb-3 rounded-2xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}
        <button disabled={busy} onClick={() => move("decline", reason)} className={`${btn.danger} w-full`}>
          {busy ? "Declining…" : "Decline order"}
        </button>
      </Modal>

      <Modal open={dialog === "ship"} onClose={() => setDialog(null)} title={order.fulfilment === "pickup" ? "Ready for pickup" : "Mark as shipped"}>
        {order.fulfilment === "delivery" ? (
          <div className="flex flex-col gap-3">
            <div className="rounded-2xl bg-surface-alt px-4 py-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Delivering to</p>
              <p className="mt-0.5 font-semibold">{order.customer.name}</p>
              <p className="text-ink-2">{order.customer.address}</p>
            </div>
            <Field label="Rider or courier">
              <input value={courier} onChange={(e) => setCourier(e.target.value)} className={inputClass} placeholder="e.g. Kunle, or GIG Logistics" />
            </Field>
            <Field label="Phone or tracking number">
              <input value={tracking} onChange={(e) => setTracking(e.target.value)} className={inputClass} placeholder="0806 000 1122" />
            </Field>
          </div>
        ) : otherPlace ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ink-2">Sotechy checks a new pickup location before the customer is told. You can mark the order ready once it&apos;s approved.</p>
            <Field label="New pickup location">
              <AddressInput value={newPoint} onChange={setNewPoint} placeholder="e.g. GIG Logistics hub, Ekpoma" />
            </Field>
            <button type="button" onClick={() => setOtherPlace(false)} className="self-start text-sm font-semibold text-brand-strong hover:underline">
              Use {order.pickupPoint ? "the approved location" : "my approved location"} instead
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="rounded-2xl bg-surface-alt px-4 py-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Customer collects at</p>
              <p className="mt-0.5 font-semibold">{order.pickupPoint ?? "Your approved pickup location"}</p>
            </div>
            <p className="text-sm text-ink-2">We&apos;ll tell the customer it&apos;s ready to collect there.</p>
            <button type="button" onClick={() => setOtherPlace(true)} className="self-start text-sm font-semibold text-brand-strong hover:underline">
              Use another location
            </button>
          </div>
        )}
        {error && <p className="mt-3 rounded-2xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}
        {order.fulfilment === "pickup" && otherPlace ? (
          <button disabled={busy || newPoint.trim().length < 5} onClick={() => move("pickup-change", newPoint.trim())} className={`${btn.dark} mt-4 w-full`}>
            {busy ? "Sending…" : "Send for approval"}
          </button>
        ) : (
          <button
            disabled={busy}
            onClick={() => move("ship", order.fulfilment === "delivery" && (courier.trim() || tracking.trim()) ? `On its way${courier.trim() ? ` with ${courier.trim()}` : ""}${tracking.trim() ? ` · ${tracking.trim()}` : ""}` : undefined)}
            className={`${btn.dark} mt-4 w-full`}
          >
            {busy ? "Saving…" : order.fulfilment === "pickup" ? "Confirm, it's ready" : "Confirm"}
          </button>
        )}
      </Modal>

      <Modal open={dialog === "deliver"} onClose={() => setDialog(null)} title={order.fulfilment === "pickup" ? "Mark as collected?" : "Mark as delivered?"}>
        <p className="text-sm text-ink-2">We&apos;ll tell the customer and ask them to confirm they received it.</p>
        {error && <p className="mt-3 rounded-2xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}
        <button disabled={busy} onClick={() => move("deliver")} className={`${btn.dark} mt-4 w-full`}>
          {busy ? "Saving…" : "Mark as delivered"}
        </button>
      </Modal>
    </>
  );
}

function NextStep({ illo, title, body, children }: { illo: Parameters<typeof Illo>[0]["name"]; title: string; body: string; children?: ReactNode }) {
  return (
    <section className="mb-6 flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 sm:flex-row sm:items-center">
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

