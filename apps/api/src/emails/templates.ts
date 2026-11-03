// Every email Sotechy sends. Each builder takes plain data and returns what sendEmail needs.
// Preview them all with sample data at /dev/emails on a local API.
import type { OrderStatus } from "@sotechy/shared";
import { formatNaira } from "@sotechy/shared";
import type { Email } from "../lib/email";
import { renderEmail, type Block, type EmailContent, type Hero, type LineItem } from "./layout";

const first = (name?: string | null) => name?.trim().split(/\s+/)[0] || "there";
const build = (to: string, subject: string, content: EmailContent): Email => ({ to, subject, ...renderEmail(content) });
const appLink = (path: string) => `https://www.sotechy.shop${path}`;
const merchantLink = (path: string) => `https://merchant.sotechy.shop${path}`;
const when = (d: Date) => d.toLocaleString("en-NG", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" });

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------
export function welcomeEmail(to: string, d: { name: string | null }) {
  return build(to, "Welcome to Sotechy", {
    preheader: "Shop from stores across Nigeria and earn tokens on every order.",
    hero: "welcome",
    heading: `Welcome, ${first(d.name)}`,
    blocks: [
      { kind: "text", text: "Your Sotechy account is ready. Here's how it works:" },
      {
        kind: "rows",
        rows: [
          { icon: "store", label: "Many stores, one app", value: "Phones, gadgets, fashion, food and more from stores across Nigeria." },
          { icon: "coin", label: "Earn as you shop", value: "Every completed order earns you the store's tokens: **1 token for every ₦1**." },
          { icon: "tag", label: "Make an offer", value: "On items marked negotiable, send the store a price and chat it out." },
        ],
      },
      { kind: "button", label: "Start shopping", url: appLink("/") },
    ],
    reason: "You're getting this because you created a Sotechy account.",
  });
}

export function passwordCodeEmail(to: string, d: { code: string; minutes: number }) {
  return build(to, `${d.code} is your Sotechy code`, {
    preheader: `Use it to choose a new password. It works for ${d.minutes} minutes.`,
    hero: "code",
    heading: "Reset your password",
    blocks: [
      { kind: "text", text: "Enter this code in Sotechy to choose a new password." },
      { kind: "code", code: d.code, caption: `Works once, for ${d.minutes} minutes` },
      { kind: "note", tone: "warn", icon: "shield", text: "Sotechy will never ask for this code by phone, WhatsApp or chat. If you didn't ask for it, ignore this email; your password stays the same." },
    ],
    reason: "You're getting this because someone asked to reset the password on your Sotechy account.",
  });
}

export interface OrderEmailData {
  id: string;
  number: string;
  store: string;
  fulfilment: "delivery" | "pickup";
  items: LineItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  /** "14 Airport Road, Benin City, Edo" */
  address?: string | null;
  pickup?: { place: string; hours?: string | null } | null;
}

const STEPS = { delivery: ["Paid", "Packed", "On its way", "Delivered"], pickup: ["Paid", "Packed", "Ready", "Picked up"] };
const STEP_AT: Partial<Record<OrderStatus, number>> = { paid: 0, processing: 1, dispatched: 2, ready_for_pickup: 2, delivered: 3 };

const ORDER_COPY: Partial<Record<OrderStatus, (o: OrderEmailData) => { hero: Hero; subject: string; heading: string; lead: string }>> = {
  paid: (o) => ({ hero: "paid", subject: `Payment received for ${o.number}`, heading: "Payment received", lead: `**${o.store}** has your order and will start packing it soon.` }),
  processing: (o) => ({ hero: "processing", subject: `${o.number} is being packed`, heading: "Your order is being packed", lead: `**${o.store}** is getting your items ready.` }),
  ready_for_pickup: (o) => ({ hero: "ready", subject: `${o.number} is available for pickup`, heading: "Available for pickup", lead: "Your order is waiting at the pickup location. Bring your order number, and tap “I've picked it up” in the app once you have it." }),
  dispatched: (o) => ({ hero: "dispatched", subject: `${o.number} is on its way`, heading: "Your order is on its way", lead: `It's left **${o.store}** and is heading to you. Keep your phone close; the rider may call.` }),
  delivered: (o) => ({
    hero: "delivered",
    subject: `${o.number} ${o.fulfilment === "pickup" ? "picked up" : "delivered"}`,
    heading: o.fulfilment === "pickup" ? "Picked up. Enjoy!" : "Delivered. Enjoy!",
    lead: `Thanks for shopping with **${o.store}**. Your tokens arrive once the order is complete.`,
  }),
  cancelled: (o) => ({ hero: "cancelled", subject: `${o.number} was cancelled`, heading: "Your order was cancelled", lead: `**${o.store}** couldn't complete this order. If you paid, your refund is being processed and we'll email you when it's sent.` }),
  refunded: (o) => ({ hero: "refunded", subject: `Refund sent for ${o.number}`, heading: "Your refund is on its way", lead: `We've sent back **${formatNaira(o.total)}** for this order. Bank transfers can take up to 24 hours to show. Your order in the Sotechy app shows how it was sent, with the bank reference or transaction hash.` }),
};

export const ORDER_EMAIL_STATUSES = Object.keys(ORDER_COPY) as OrderStatus[];

export function orderUpdateEmail(to: string, status: OrderStatus, d: { name: string | null; order: OrderEmailData }) {
  const o = d.order;
  const copy = ORDER_COPY[status]?.(o);
  if (!copy) return null;
  const at = STEP_AT[status];
  const blocks: Block[] = [
    { kind: "text", text: `Hi ${first(d.name)}, ${copy.lead.charAt(0).toLowerCase()}${copy.lead.slice(1)}` },
    ...(at !== undefined ? [{ kind: "tracker" as const, steps: STEPS[o.fulfilment], at }] : []),
    {
      kind: "items",
      items: o.items,
      totals: [
        { label: "Subtotal", amount: o.subtotal },
        ...(o.discount ? [{ label: "Discount", amount: -o.discount }] : []),
        ...(o.fulfilment === "delivery" ? [{ label: "Delivery", amount: o.deliveryFee }] : []),
        { label: "Total", amount: o.total, strong: true },
      ],
    },
    {
      kind: "rows",
      rows:
        o.fulfilment === "pickup" && o.pickup
          ? [
              { icon: "store", label: "Pick up at", value: o.pickup.place },
              ...(o.pickup.hours ? [{ icon: "receipt" as const, label: "Opening hours", value: o.pickup.hours }] : []),
            ]
          : [{ icon: "pin", label: "Delivering to", value: o.address ?? "Your saved address" }],
    },
    ...(status === "delivered" ? [{ kind: "note" as const, tone: "good" as const, icon: "heart" as const, text: "Happy with it? A quick review helps other shoppers and earns you a bonus of up to 10% in tokens." }] : []),
    { kind: "button", label: status === "delivered" ? "Rate your order" : "Track your order", url: appLink(`/order/${o.id}`) },
  ];
  return build(to, copy.subject, { preheader: copy.lead.replace(/\*\*/g, ""), hero: copy.hero, eyebrow: `Order ${o.number}`, heading: copy.heading, blocks, reason: "You're getting this because you placed this order on Sotechy." });
}

export function offerAcceptedEmail(to: string, d: { name: string | null; store: string; product: string; listPrice: number; agreedPrice: number; hours: number; expiresAt: Date; url: string }) {
  return build(to, `${d.store} accepted your offer`, {
    preheader: `Pay ${formatNaira(d.agreedPrice)} for ${d.product} within ${d.hours} hours.`,
    hero: "offer-accepted",
    eyebrow: d.store,
    heading: "Your offer was accepted",
    blocks: [
      { kind: "text", text: `Good news, ${first(d.name)}. **${d.store}** agreed to your price for **${d.product}**.` },
      { kind: "price", was: d.listPrice, now: d.agreedPrice, caption: `Held for you until ${when(d.expiresAt)}` },
      { kind: "note", tone: "warn", icon: "sparkle", text: `This price is only for you and lasts **${d.hours} hours**. After that it goes back to ${formatNaira(d.listPrice)}.` },
      { kind: "button", label: "Buy at this price", url: d.url },
    ],
    reason: "You're getting this because you made an offer on Sotechy.",
  });
}

export function storeNoticeEmail(to: string, d: { name: string | null; store: string; title: string; message: string; url: string }) {
  return build(to, `${d.store}: ${d.title}`, {
    preheader: d.message,
    hero: "store-notice",
    eyebrow: `From ${d.store}`,
    heading: d.title,
    blocks: [
      { kind: "text", text: d.message },
      { kind: "button", label: `Visit ${d.store}`, url: d.url },
    ],
    reason: `You're getting this because you follow ${d.store} on Sotechy. Unfollow the store in the app to stop these.`,
  });
}

// ---------------------------------------------------------------------------
// Merchants
// ---------------------------------------------------------------------------
export function storeOpenedEmail(to: string, d: { name: string | null; store: string }) {
  return build(to, `${d.store} is open on Sotechy`, {
    preheader: "Explore your dashboard now. You can start selling once Sotechy verifies your store.",
    hero: "store-opened",
    eyebrow: "Sotechy for merchants",
    heading: `${d.store} is open`,
    blocks: [
      { kind: "text", text: `Welcome, ${first(d.name)}. Your store is open. Finish setup and send it to Sotechy for review: once it's verified, your store token is created and you can add products and take orders.` },
      {
        kind: "checklist",
        items: [
          { done: true, text: "Open your store" },
          { done: false, text: "Verify your identity (ID and a quick selfie)" },
          { done: false, text: "Add your business details" },
          { done: false, text: "Choose your store token's ticker" },
          { done: false, text: "Add a payout bank account" },
          { done: false, text: "Send your store for review" },
        ],
      },
      { kind: "button", label: "Continue setup", url: merchantLink("/onboarding") },
    ],
    reason: "You're getting this because you opened a store on Sotechy.",
  });
}

export function newOrderEmail(to: string, d: { store: string; order: OrderEmailData; customer: string; respondBy: Date }) {
  const o = d.order;
  return build(to, `New order ${o.number}: ${formatNaira(o.total)}`, {
    preheader: `Accept it by ${when(d.respondBy)}.`,
    hero: "new-order",
    eyebrow: `${d.store} · New order`,
    heading: `New order from ${d.customer}`,
    blocks: [
      { kind: "note", tone: "warn", icon: "sparkle", text: `Accept or decline by **${when(d.respondBy)}**. Orders not answered in time are cancelled and refunded.` },
      { kind: "items", items: o.items, totals: [{ label: o.fulfilment === "pickup" ? "Total (pickup)" : "Total (with delivery)", amount: o.total, strong: true }] },
      { kind: "rows", rows: o.fulfilment === "pickup" ? [{ icon: "store", label: "Customer picks up", value: o.pickup?.place ?? "At your store" }] : [{ icon: "bike", label: "Deliver to", value: o.address ?? "" }] },
      { kind: "button", label: "Review the order", url: merchantLink(`/orders/${o.id}`) },
    ],
    reason: "New-order emails can't be turned off, so you never miss a sale.",
  });
}

export function offerReceivedEmail(to: string, d: { store: string; customer: string; product: string; listPrice: number; offer: number; message?: string | null; url: string }) {
  const off = Math.round(((d.listPrice - d.offer) / d.listPrice) * 100);
  return build(to, `${d.customer} offered ${formatNaira(d.offer)} for ${d.product}`, {
    preheader: `${off}% below your price. Accept, counter or decline.`,
    hero: "offer",
    eyebrow: `${d.store} · Price offer`,
    heading: "You have a new offer",
    blocks: [
      { kind: "text", text: `**${d.customer}** wants **${d.product}**.` },
      { kind: "price", was: d.listPrice, now: d.offer, caption: `${off}% below your price` },
      ...(d.message ? [{ kind: "note" as const, icon: "chat" as const, text: `"${d.message}"` }] : []),
      { kind: "text", text: "If you accept, you choose how long they get to pay at that price: 6, 12 or 24 hours." },
      { kind: "button", label: "Answer the offer", url: d.url },
    ],
    reason: "You're getting this because a customer made an offer on one of your products.",
  });
}

export function payoutSentEmail(to: string, d: { store: string; amount: number; bank: string; account: string; reference: string; orders: { number: string; amount: number; stage: string }[] }) {
  // Named for the order, like a receipt: "money on its way to your bank" titles read as scams and land in spam
  const which = d.orders.length === 1 ? `${d.orders[0].number} (${d.orders[0].stage.toLowerCase()})` : `${d.orders.length} orders`;
  return build(to, `${d.store} payout for ${which}`, {
    preheader: `${formatNaira(d.amount)} paid to your ${d.bank} account ${d.account}. See it in your Sotechy dashboard.`,
    hero: "payout",
    eyebrow: `${d.store} · Payout`,
    heading: `${formatNaira(d.amount)} sent`,
    blocks: [
      { kind: "rows", rows: [{ icon: "bank", label: "Paid to", value: `${d.bank} · ${d.account}` }, { icon: "receipt", label: "Reference", value: d.reference }] },
      { kind: "items", items: d.orders.map((o) => ({ name: o.number, detail: o.stage, quantity: 1, amount: o.amount })), totals: [{ label: "Total", amount: d.amount, strong: true }] },
      { kind: "text", text: "Bank transfers usually arrive within minutes, and can take up to 24 hours." },
      { kind: "button", label: "See payouts", url: merchantLink("/payouts") },
    ],
    reason: "You're getting this because Sotechy sent money to your store's bank account.",
  });
}

export function storeChangesEmail(to: string, d: { name: string | null; store: string; note: string }) {
  return build(to, `${d.store}: a few changes before you go live`, {
    preheader: "Sotechy reviewed your store and needs a few things changed.",
    hero: "store-notice",
    eyebrow: d.store,
    heading: "A few changes, then you're live",
    blocks: [
      { kind: "text", text: `Hi ${first(d.name)}, we reviewed **${d.store}** and need a few things changed before it can start selling.` },
      { kind: "note", tone: "warn", icon: "doc", text: d.note },
      { kind: "text", text: "Make the changes in your setup and submit it again. We'll review it as soon as it's back." },
      { kind: "button", label: "Update your setup", url: merchantLink("/onboarding") },
    ],
    reason: "You're getting this because Sotechy reviewed your store.",
  });
}

export function storeDeclinedEmail(to: string, d: { name: string | null; store: string; note: string }) {
  return build(to, `${d.store} wasn't approved`, {
    preheader: "Sotechy reviewed your store and couldn't approve it.",
    hero: "store-notice",
    eyebrow: d.store,
    heading: "We couldn't approve your store",
    blocks: [
      { kind: "text", text: `Hi ${first(d.name)}, we reviewed **${d.store}** and couldn't approve it to sell on Sotechy.` },
      { kind: "note", tone: "bad", icon: "shield", text: d.note },
      { kind: "text", text: "If you think this is a mistake, or things have changed, reply to support@sotechy.shop and we'll look again." },
    ],
    reason: "You're getting this because Sotechy reviewed your store.",
  });
}

export function storeVerifiedEmail(to: string, d: { name: string | null; store: string }) {
  return build(to, `${d.store} is verified. You're live!`, {
    preheader: "Customers can now buy from your store.",
    hero: "verified",
    eyebrow: d.store,
    heading: "You're verified and live",
    blocks: [
      { kind: "text", text: `Congratulations, ${first(d.name)}. Sotechy has checked your details, and **${d.store}** now takes real orders.` },
      { kind: "note", tone: "good", icon: "shield", text: "Your store shows the verified badge to customers." },
      { kind: "button", label: "Open your dashboard", url: merchantLink("/") },
    ],
    reason: "You're getting this because your store's verification was approved.",
  });
}

export function featuredEmail(to: string, d: { store: string; until: Date; price: number }) {
  return build(to, `${d.store} is featured`, {
    preheader: `Shown on the Sotechy home page until ${when(d.until)}.`,
    hero: "featured",
    eyebrow: `${d.store} · Featured`,
    heading: "Your store is featured",
    blocks: [
      { kind: "text", text: `Thanks for your payment of **${formatNaira(d.price)}**. **${d.store}** now appears in the featured stores on the Sotechy home page, and your products show first in search.` },
      { kind: "rows", rows: [{ icon: "sparkle", label: "Featured until", value: when(d.until) }] },
      { kind: "button", label: "See how it's doing", url: merchantLink("/featured") },
    ],
    reason: "You're getting this because you paid to feature your store.",
  });
}

const ID_CHECK = {
  approved: {
    subject: "You're verified on Sotechy",
    heading: "Your identity is verified",
    lead: "Your ID and selfie matched.",
    note: { tone: "good" as const, text: "Next, Sotechy reviews the rest of your store setup. We'll email you as soon as your store is live." },
    button: "Continue setup",
  },
  resubmit: {
    subject: "Please redo part of your ID check",
    heading: "Almost there: redo part of your ID check",
    lead: "Some of what you sent wasn't clear enough to check.",
    note: { tone: "warn" as const, text: "Use good light, keep the whole ID in the frame with no glare, and keep your face uncovered." },
    button: "Redo it now",
  },
  declined: {
    subject: "We couldn't verify your ID",
    heading: "We couldn't verify your ID",
    lead: "Your ID check didn't pass.",
    note: { tone: "bad" as const, text: "If you think this is a mistake, reply to this email and our team will look at it with you." },
    button: "Open your setup",
  },
};

/**
 * The result of an owner's ID check. From Sotechy's own check, `redo` lists exactly what to send again and
 * `note` is the reviewer's message (or the reason it was declined).
 */
export function idCheckEmail(to: string, d: { name: string | null; store: string; outcome: keyof typeof ID_CHECK; redo?: string[]; note?: string | null }) {
  const c = ID_CHECK[d.outcome];
  const blocks: Block[] = [{ kind: "text", text: `Hi ${first(d.name)}, ${c.lead.charAt(0).toLowerCase()}${c.lead.slice(1)}` }];
  if (d.redo?.length) {
    blocks.push({ kind: "text", text: "Here's what to redo:" }, { kind: "checklist", items: d.redo.map((text) => ({ done: false, text })) });
  }
  if (d.note) blocks.push({ kind: "note", tone: d.outcome === "declined" ? "bad" : "brand", icon: "chat", text: d.note });
  if (d.outcome !== "resubmit" || !d.redo?.length) blocks.push({ kind: "note", tone: c.note.tone, icon: "shield", text: c.note.text });
  blocks.push({ kind: "button", label: c.button, url: merchantLink("/onboarding?step=you") });
  return build(to, c.subject, {
    preheader: `${c.lead} ${d.note ?? c.note.text}`,
    hero: "verified",
    eyebrow: `${d.store} · ID check`,
    heading: c.heading,
    blocks,
    reason: "You're getting this because you verified your identity to sell on Sotechy.",
  });
}

export function staffCodeEmail(to: string, d: { name: string | null; code: string; minutes: number }) {
  return build(to, `${d.code} is your Sotechy admin code`, {
    preheader: `Finish signing in to the admin dashboard. It works for ${d.minutes} minutes.`,
    hero: "code",
    eyebrow: "Sotechy admin",
    heading: "Your sign-in code",
    blocks: [
      { kind: "text", text: `Hi ${first(d.name)}, enter this code to finish signing in to the Sotechy admin dashboard.` },
      { kind: "code", code: d.code, caption: `Works once, for ${d.minutes} minutes` },
      { kind: "note", tone: "bad", icon: "shield", text: "Didn't just sign in? Someone has your password. Change it now and tell the other admins." },
    ],
    reason: "You're getting this because someone signed in to your Sotechy staff account with the right password.",
  });
}

// ---------------------------------------------------------------------------
// Admins
// ---------------------------------------------------------------------------
export function payoutApprovalEmail(to: string, d: { name: string | null; store: string; orderNumber: string; stage: string; amount: number; dueAt: Date }) {
  const due = d.dueAt > new Date();
  return build(to, `Approve ${formatNaira(d.amount)} to ${d.store}`, {
    preheader: `${d.stage} for ${d.orderNumber}${due ? `, due ${when(d.dueAt)}` : ", due now"}.`,
    hero: "payout",
    eyebrow: "Sotechy admin · Payout",
    heading: "A payout needs your approval",
    blocks: [
      { kind: "text", text: `Hi ${first(d.name)}, **${d.store}** is owed a payout. Nothing is sent until you approve it.` },
      {
        kind: "rows",
        rows: [
          { icon: "receipt", label: "Order", value: `${d.orderNumber} · ${d.stage}` },
          { icon: "bank", label: "Amount", value: formatNaira(d.amount) },
          { icon: "sparkle", label: "Due", value: due ? when(d.dueAt) : "Now" },
        ],
      },
      { kind: "button", label: "Review and approve", url: "https://admin.sotechy.shop/merchant-payouts" },
    ],
    reason: "You're getting this because you're a Sotechy admin.",
  });
}

export function supportChatEmail(to: string, d: { name: string | null; customer: string; message: string; ticketId: string; isNew: boolean; form?: boolean }) {
  return build(to, `${d.form ? "New support message" : d.isNew ? "New chat" : "New message"} from ${d.customer}`, {
    preheader: d.message.slice(0, 110),
    hero: "store-notice",
    eyebrow: `Sotechy admin · ${d.form ? "Help & support" : "Live chat"}`,
    heading: d.form ? "A customer sent a message" : d.isNew ? "A customer started a chat" : "A customer is waiting for a reply",
    blocks: [
      { kind: "text", text: `Hi ${first(d.name)}, **${d.customer}** ${d.form ? "sent a message from Help & support in the app" : "wrote in the app's live chat"}:` },
      { kind: "note", tone: "brand", icon: "chat", text: d.message.slice(0, 600) },
      { kind: "button", label: "Reply in admin", url: `https://admin.sotechy.shop/support/${d.ticketId}` },
    ],
    reason: "You're getting this because you're a Sotechy admin.",
  });
}

export function paybackRequestEmail(to: string, d: { store: string; orderNumber: string; amount: number; bankName: string; accountName: string; accountNumber: string }) {
  return build(to, `Please pay back ${formatNaira(d.amount)} for ${d.orderNumber}`, {
    preheader: `${d.orderNumber} was cancelled after you were paid. Send it back to Sotechy's account.`,
    hero: "payout",
    eyebrow: `${d.store} \u00b7 Payback`,
    heading: "An order you were paid for was cancelled",
    blocks: [
      { kind: "text", text: `${d.orderNumber} won't be fulfilled, so Sotechy is refunding the customer. You were already paid **${formatNaira(d.amount)}** for it. Please send it back to this account, then tap **I've paid it back** on the order in your dashboard.` },
      {
        kind: "rows",
        rows: [
          { icon: "bank", label: "Bank", value: d.bankName },
          { icon: "receipt", label: "Account", value: `${d.accountNumber} \u00b7 ${d.accountName}` },
          { icon: "tag", label: "Amount", value: formatNaira(d.amount) },
          { icon: "doc", label: "Narration", value: d.orderNumber },
        ],
      },
      { kind: "button", label: "Open your orders", url: "https://merchant.sotechy.shop/orders" },
    ],
    reason: "You're getting this because you sell on Sotechy.",
  });
}

export function paybackClaimedEmail(to: string, d: { name: string | null; store: string; orderNumber: string; amount: number; reference: string | null }) {
  return build(to, `${d.store} says it paid back ${formatNaira(d.amount)}`, {
    preheader: `For ${d.orderNumber}${d.reference ? `, reference ${d.reference}` : ""}. Check your account, then mark it repaid.`,
    hero: "payout",
    eyebrow: "Sotechy admin \u00b7 Payback",
    heading: "A store sent a payback",
    blocks: [
      { kind: "text", text: `Hi ${first(d.name)}, **${d.store}** says it has sent back the money for ${d.orderNumber}. Check it arrived, then mark it repaid in Order reviews.` },
      {
        kind: "rows",
        rows: [
          { icon: "tag", label: "Amount", value: formatNaira(d.amount) },
          { icon: "receipt", label: "Their reference", value: d.reference ?? "None given" },
        ],
      },
      { kind: "button", label: "Open order reviews", url: "https://admin.sotechy.shop/order-reviews" },
    ],
    reason: "You're getting this because you're a Sotechy admin.",
  });
}

export function pickupChangeEmail(to: string, d: { name: string | null; store: string; orderNumber: string; from: string | null; to: string }) {
  return build(to, `${d.store} wants another pickup location for ${d.orderNumber}`, {
    preheader: `New location: ${d.to}. Approve or decline it.`,
    hero: "store-notice",
    eyebrow: "Sotechy admin · Order review",
    heading: "A pickup location needs approval",
    blocks: [
      { kind: "text", text: `Hi ${first(d.name)}, **${d.store}** wants the customer to collect ${d.orderNumber} somewhere else. The order waits until you answer.` },
      {
        kind: "rows",
        rows: [
          { icon: "receipt", label: "Order", value: d.orderNumber },
          { icon: "pin", label: "Approved location", value: d.from ?? "None" },
          { icon: "pin", label: "New location", value: d.to },
        ],
      },
      { kind: "button", label: "Approve or decline", url: "https://admin.sotechy.shop/order-reviews" },
    ],
    reason: "You're getting this because you're a Sotechy admin.",
  });
}

export function orderNotReceivedEmail(to: string, d: { name: string | null; store: string; orderNumber: string; customer: string; note: string | null; orderId: string }) {
  return build(to, `${d.orderNumber}: customer says it didn't arrive`, {
    preheader: `${d.store} marked it delivered, but ${d.customer} says they didn't get it.`,
    hero: "store-notice",
    eyebrow: "Sotechy admin · Order review",
    heading: "An order needs checking",
    blocks: [
      { kind: "text", text: `Hi ${first(d.name)}, **${d.store}** marked ${d.orderNumber} delivered, but the customer says they didn't get it. The store's final payment is on hold until it's sorted.` },
      {
        kind: "rows",
        rows: [
          { icon: "receipt", label: "Order", value: d.orderNumber },
          { icon: "store", label: "Store", value: d.store },
          { icon: "chat", label: "Customer", value: d.note ? `${d.customer}: "${d.note}"` : d.customer },
        ],
      },
      { kind: "button", label: "Open order reviews", url: "https://admin.sotechy.shop/order-reviews" },
    ],
    reason: "You're getting this because you're a Sotechy admin.",
  });
}

export function payoutAccountChangedEmail(to: string, d: { name: string | null; store: string; bank: string; last4: string; accountName: string }) {
  return build(to, `${d.store}'s payouts now go to ${d.bank} ••••${d.last4}`, {
    preheader: "Your default payout account changed. If this wasn't you, tell us now.",
    hero: "payout",
    eyebrow: "Sotechy · Payouts",
    heading: "Your payout account changed",
    blocks: [
      { kind: "text", text: `Hi ${first(d.name)}, from now on every payout for **${d.store}** goes to this account:` },
      {
        kind: "rows",
        rows: [
          { icon: "bank", label: "Bank", value: d.bank },
          { icon: "receipt", label: "Account", value: `••••${d.last4} · ${d.accountName}` },
        ],
      },
      { kind: "text", text: "If you didn't make this change, email support@sotechy.shop straight away and change your password." },
      { kind: "button", label: "See payout accounts", url: "https://merchant.sotechy.shop/settings?tab=payout" },
    ],
    reason: "You're getting this because your store's payout account changed.",
  });
}

const TEAM_ROLE_LABEL: Record<string, string> = {
  admin: "Admin: everything except payout accounts and setup",
  orders: "Orders: accept, ship and deliver orders, walk-in sales",
  catalogue: "Catalogue: products, delivery areas and the storefront",
  finance: "Finance: payouts, the token and featuring",
  viewer: "Viewer: can see everything, change nothing",
};

export function teamInviteEmail(to: string, d: { store: string; from: string | null; role: string; link: string }) {
  return build(to, `Join ${d.store} on Sotechy`, {
    preheader: `${d.from ?? "The owner"} added you to ${d.store}'s team.`,
    hero: "welcome",
    eyebrow: "Sotechy · Team",
    heading: `You're invited to ${d.store}`,
    blocks: [
      { kind: "text", text: `${d.from ? `**${d.from}**` : "The store's owner"} added you to **${d.store}**'s team on Sotechy, so you can help run the store with your own sign-in.` },
      { kind: "rows", rows: [{ icon: "sparkle", label: "Your role", value: TEAM_ROLE_LABEL[d.role] ?? d.role }] },
      { kind: "button", label: "Accept the invite", url: d.link },
      { kind: "text", text: `Sign in or create an account with this email (${to}) to accept. If you weren't expecting this, you can ignore it.` },
    ],
    reason: "You're getting this because a Sotechy store invited this email address.",
  });
}

/** A move in a price offer: a counter, the customer accepting the store's price, or either side walking away */
export function offerUpdateEmail(
  to: string,
  d: { side: "customer" | "store"; name: string | null; store: string; customer: string; product: string; listPrice: number; amount: number | null; action: "counter" | "accept" | "decline"; message?: string | null; url: string },
) {
  const toCustomer = d.side === "customer";
  const who = toCustomer ? d.store : d.customer;
  const copy =
    d.action === "counter"
      ? { subject: `${who} offered ${formatNaira(d.amount ?? 0)} for ${d.product}`, heading: toCustomer ? "The store made you an offer" : "They made a new offer", button: toCustomer ? "See the offer" : "Answer the offer" }
      : d.action === "accept"
        ? { subject: `${who} accepted ${formatNaira(d.amount ?? 0)} for ${d.product}`, heading: "Your price was accepted", button: "See the offer" }
        : { subject: toCustomer ? `${who} declined your offer for ${d.product}` : `${who} walked away from the offer`, heading: toCustomer ? "Your offer was declined" : "The offer is closed", button: "See the offer" };
  return build(to, copy.subject, {
    preheader: d.action === "counter" ? `Accept, counter or decline.` : copy.heading,
    hero: d.action === "accept" ? "offer-accepted" : "offer",
    eyebrow: toCustomer ? d.store : `${d.store} · Price offer`,
    heading: copy.heading,
    blocks: [
      {
        kind: "text",
        text:
          d.action === "decline"
            ? toCustomer
              ? `Hi ${first(d.name)}, **${d.store}** didn't accept your offer for **${d.product}**. You can still buy it at ${formatNaira(d.listPrice)}, or try a new offer.`
              : `**${d.customer}** walked away from their offer for **${d.product}**.`
            : d.action === "accept"
              ? `**${d.customer}** accepted your price for **${d.product}**. They have until the hold runs out to pay.`
              : toCustomer
                ? `Hi ${first(d.name)}, **${d.store}** came back with a price for **${d.product}**.`
                : `**${d.customer}** came back with a new price for **${d.product}**.`,
      },
      ...(d.amount != null && d.action !== "decline" ? [{ kind: "price" as const, was: d.listPrice, now: d.amount, caption: d.action === "accept" ? "Agreed price" : "Their offer" }] : []),
      ...(d.message ? [{ kind: "note" as const, icon: "chat" as const, text: `"${d.message}"` }] : []),
      { kind: "button", label: copy.button, url: d.url },
    ],
    reason: toCustomer ? "You're getting this because you made an offer on Sotechy." : "You're getting this because a customer made an offer on one of your products.",
  });
}
