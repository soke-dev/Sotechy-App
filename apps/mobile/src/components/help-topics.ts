// What the support chat answers on its own: topics, their questions, and the words that find them
// when a customer types instead of tapping. Anything it can't answer goes to the team.
import type { Href } from "expo-router";
import type { IconName } from "./ui";

export interface HelpAnswer {
  id: string;
  q: string;
  a: string;
  /** Lower-case words or phrases that point to this answer; phrases count double */
  keywords: string[];
  links?: { label: string; href: Href }[];
}

export interface HelpTopic {
  id: string;
  label: string;
  icon: IconName;
  intro: string;
  answers: HelpAnswer[];
}

const ORDERS: Href = "/orders";

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: "orders",
    label: "My order",
    icon: "cube-outline",
    intro: "Sure. What's going on with your order?",
    answers: [
      {
        id: "track",
        q: "Where is my order?",
        a: "Open Orders and tap the order. It shows each step: paid, accepted by the store, being prepared, on its way (or ready at the pickup point), and delivered. You also get a notification at every step.",
        keywords: ["where", "track", "tracking", "status", "where is my order", "order status", "shipped", "on its way", "dispatched"],
        links: [{ label: "Open my orders", href: ORDERS }],
      },
      {
        id: "late",
        q: "My order is taking too long",
        a: "Each store prepares and sends its own orders, and the delivery time you saw at checkout is their estimate. If the order hasn't moved for a while, check it under Orders. If it's past the time you were given, we'll chase the store for you.",
        keywords: ["late", "long", "delay", "delayed", "slow", "still waiting", "not arrived", "hasn't arrived", "taking"],
        links: [{ label: "Open my orders", href: ORDERS }],
      },
      {
        id: "not-received",
        q: "It says delivered but I don't have it",
        a: "Open the order and tap Not received. Sotechy then holds the store's payment and checks with them, and we'll contact you. Once it reaches you, tap I've got it now on the same order.",
        keywords: ["not received", "didn't receive", "didnt receive", "never got", "says delivered", "marked delivered", "not delivered", "missing"],
        links: [{ label: "Open my orders", href: ORDERS }],
      },
      {
        id: "received",
        q: "How do I confirm I got my order?",
        a: "When the store marks it delivered, the order asks: Did you get your order? Tap Received. Your tokens for that order are released once it's delivered.",
        keywords: ["confirm", "received", "got my order", "collected", "mark received"],
        links: [{ label: "Open my orders", href: ORDERS }],
      },
      {
        id: "cancel",
        q: "How do I cancel an order?",
        a: "You can cancel any order you haven't paid for yet: open it and tap Cancel order. Unpaid orders also cancel on their own after 24 hours. Once an order is paid, the store has started on it, so cancelling goes through our team, who also handle the refund.",
        keywords: ["cancel", "cancellation", "cancel my order", "cancel order", "stop my order", "don't want", "dont want", "changed my mind"],
        links: [{ label: "Open my orders", href: ORDERS }],
      },
    ],
  },
  {
    id: "payments",
    label: "Paying",
    icon: "card-outline",
    intro: "Happy to help with payment. What do you need?",
    answers: [
      {
        id: "how-pay",
        q: "How can I pay?",
        a: "At checkout you pick how to pay. Usually that's bank transfer (to a one-time account number just for your order) or stablecoin (USDT or USDC). You can also put your store tokens towards part of the order, with at least ₦100 paid in money.",
        keywords: ["pay", "payment", "how to pay", "bank transfer", "transfer", "card", "stablecoin", "usdt", "usdc", "crypto", "methods"],
      },
      {
        id: "paid-unpaid",
        q: "I paid but it still says unpaid",
        a: "Bank transfers usually confirm within a few minutes. Stablecoin can take a little longer while the network confirms it. Open the order to refresh it. If it still says unpaid after 30 minutes, tell our team and have your transfer receipt or transaction hash ready.",
        keywords: ["paid", "unpaid", "paid but", "still unpaid", "not confirmed", "pending payment", "payment pending", "debited", "deducted", "money left", "already paid"],
        links: [{ label: "Open my orders", href: ORDERS }],
      },
      {
        id: "pay-time",
        q: "How long do I have to pay?",
        a: "24 hours. After that an unpaid order cancels on its own, and if it used an offer price, that offer is used up. You can pay any time before then from the order.",
        keywords: ["how long", "time to pay", "deadline", "expire", "expired", "24 hours", "auto cancel", "cancelled itself"],
      },
      {
        id: "safe",
        q: "Is my money safe?",
        a: "Yes. You pay Sotechy, not the store directly. The store only gets its final payment after your order is delivered, and if something goes wrong, we hold it while we sort it out.",
        keywords: ["safe", "secure", "scam", "trust", "legit", "protected", "fraud"],
      },
    ],
  },
  {
    id: "delivery",
    label: "Delivery & pickup",
    icon: "bicycle-outline",
    intro: "Let's sort out delivery. What would you like to know?",
    answers: [
      {
        id: "area",
        q: "Do you deliver to my area?",
        a: "Each store chooses the states it delivers to. You'll find them on the store's About tab, and checkout only offers what's available for your address. If a store doesn't deliver to you, pick one of its pickup points instead.",
        keywords: ["deliver to", "my area", "my state", "location", "abuja", "lagos", "port harcourt", "benin", "ship to", "nationwide"],
      },
      {
        id: "fee",
        q: "How much is delivery?",
        a: "Each store sets its own delivery prices. You see the price and the expected time at checkout, before you pay.",
        keywords: ["delivery fee", "delivery cost", "shipping fee", "how much delivery", "shipping cost", "charge for delivery"],
      },
      {
        id: "pickup",
        q: "How does pickup work?",
        a: "Choose a pickup point at checkout. When your order is ready, it says so and you get a notification. Bring your order number when you collect it.",
        keywords: ["pickup", "pick up", "collect", "collection", "pickup point", "store location"],
      },
      {
        id: "address",
        q: "Change my delivery address",
        a: "Add or edit your addresses in Account → Addresses, and pick one at checkout. If your order is already paid, tell our team and we'll check with the store.",
        keywords: ["address", "change address", "wrong address", "new address"],
        links: [{ label: "My addresses", href: "/addresses" }],
      },
    ],
  },
  {
    id: "refunds",
    label: "Refunds & returns",
    icon: "return-up-back-outline",
    intro: "Sorry something went wrong. Which of these is it?",
    answers: [
      {
        id: "refund-how",
        q: "How do refunds work?",
        a: "When a paid order is cancelled or refunded, the refund shows on the order with its reference: the bank transfer reference, or the transaction hash for stablecoin. Any tokens you used come back to your wallet.",
        keywords: ["refund", "refunded", "money back", "get my money", "reversal", "reverse"],
        links: [{ label: "Open my orders", href: ORDERS }],
      },
      {
        id: "refund-details",
        q: "Sotechy asked for my refund details",
        a: "Open the order. There's a form there for your bank account or wallet address, or a note if we asked for something else. We send the refund once we have it.",
        keywords: ["refund details", "account number", "bank details", "wallet address", "asked for my", "details for refund"],
        links: [{ label: "Open my orders", href: ORDERS }],
      },
      {
        id: "damaged",
        q: "My item is damaged or wrong",
        a: "Sorry about that. Take a photo of the item and the packaging, then tell our team which order it is. We'll work it out with the store.",
        keywords: ["damaged", "broken", "wrong item", "faulty", "not working", "defect", "fake", "different", "spoilt", "spoiled"],
      },
      {
        id: "return",
        q: "Can I return an item?",
        a: "Returns depend on the store and the item. Tell our team which order it is and what's wrong, and we'll arrange it with the store.",
        keywords: ["return", "exchange", "swap", "warranty", "guarantee"],
      },
    ],
  },
  {
    id: "tokens",
    label: "Tokens & wallet",
    icon: "wallet-outline",
    intro: "Tokens are store credit you earn as you shop. What would you like to know?",
    answers: [
      {
        id: "earn",
        q: "How do I earn tokens?",
        a: "You get 1 token for every ₦1 you spend at a store, once the order is delivered. You also get 10% extra in $SOTECHY when you buy from other stores, 5% more for reviewing what you bought (10% with a photo), and tokens for buying in a store's own shop when you give them your @username.",
        keywords: ["earn", "get tokens", "how tokens", "reward", "rewards", "cashback", "points", "bonus"],
        links: [{ label: "Open my wallet", href: "/wallet" }],
      },
      {
        id: "spend",
        q: "How do I use my tokens?",
        a: "At checkout, at the store that gave them to you. You can mix tokens and money in one payment, as long as at least ₦100 is money. $SOTECHY works at any Sotechy store.",
        keywords: ["use tokens", "spend", "redeem", "pay with tokens", "use my tokens"],
        links: [{ label: "Open my wallet", href: "/wallet" }],
      },
      {
        id: "pending",
        q: "Why are my tokens pending?",
        a: "Tokens for an order arrive when the order is delivered. Until then they show as pending in your wallet. If an order is cancelled, its pending tokens don't arrive.",
        keywords: ["pending", "not showing", "haven't got tokens", "didn't get tokens", "missing tokens", "where are my tokens"],
        links: [{ label: "Open my wallet", href: "/wallet" }],
      },
      {
        id: "withdraw",
        q: "Can I withdraw or sell tokens?",
        a: "No. Tokens are store credit: you can't withdraw them to a bank or sell them. You can spend them, and send them to other people on Sotechy by their @username.",
        keywords: ["withdraw", "cash out", "sell tokens", "convert", "to naira", "bank", "trade"],
      },
      {
        id: "send",
        q: "Send tokens to a friend",
        a: "Open your wallet, tap Send, type their @username, pick the token and the amount. They need a Sotechy account.",
        keywords: ["send tokens", "transfer tokens", "gift", "friend", "username"],
        links: [{ label: "Open my wallet", href: "/wallet" }],
      },
    ],
  },
  {
    id: "offers",
    label: "Offers & promo codes",
    icon: "pricetag-outline",
    intro: "Looking for a better price? Here's how it works.",
    answers: [
      {
        id: "offer-how",
        q: "How do offers work?",
        a: "On products from stores that take offers, tap Make an offer and name your price. If the store accepts, you can buy at that price from My offers. If you don't pay for that order, the offer price is used up.",
        keywords: ["offer", "make an offer", "negotiate", "bargain", "price", "discount", "cheaper"],
        links: [{ label: "My offers", href: "/offers" }],
      },
      {
        id: "my-offers",
        q: "Where are my offers?",
        a: "In Account → My offers. They're sorted into Pending (waiting for the store), Used, and Closed.",
        keywords: ["my offers", "offer status", "accepted", "declined", "rejected"],
        links: [{ label: "My offers", href: "/offers" }],
      },
      {
        id: "promo",
        q: "How do promo codes work?",
        a: "Type the code at checkout and the discount shows before you pay. Codes come from stores, so each one works on that store's items, and some have an end date or a minimum order.",
        keywords: ["promo", "promo code", "coupon", "voucher", "code"],
      },
    ],
  },
  {
    id: "account",
    label: "My account",
    icon: "person-circle-outline",
    intro: "Sure. What do you want to change?",
    answers: [
      {
        id: "profile",
        q: "Change my name or photo",
        a: "Open Account and tap your name card. You can edit your details there, pick an avatar or upload your own photo.",
        keywords: ["name", "photo", "picture", "avatar", "profile", "edit profile", "phone number", "email"],
        links: [{ label: "Edit my profile", href: "/profile" }],
      },
      {
        id: "notifications",
        q: "Notifications and security",
        a: "Account → Security & notifications lets you choose which notifications you get and manage how you sign in.",
        keywords: ["notification", "notifications", "security", "password", "sign in", "login", "log in", "otp"],
        links: [{ label: "Security & notifications", href: "/security" }],
      },
      {
        id: "theme",
        q: "Switch to dark mode",
        a: "On the Account tab, tap the light/dark switch at the top right of your name card.",
        keywords: ["dark mode", "light mode", "theme", "dark"],
      },
    ],
  },
  {
    id: "stores",
    label: "Stores & selling",
    icon: "storefront-outline",
    intro: "Sotechy has many stores. What do you want to know?",
    answers: [
      {
        id: "badges",
        q: "What do Official store and Verified mean?",
        a: "Official store (orange tick) means a registered business Sotechy has checked. Verified seller (blue tick) is an individual or freelancer we've checked. Tap the badge on a store's page to see more.",
        keywords: ["official", "verified", "badge", "tick", "legit store", "trusted", "real store"],
        links: [{ label: "Browse stores", href: "/stores" }],
      },
      {
        id: "sell",
        q: "How do I open my own store?",
        a: "Go to merchant.sotechy.shop and sign up. Businesses and freelancers are welcome, and every store gets its own token to reward its customers.",
        keywords: ["sell", "seller", "open a store", "my own store", "merchant", "vendor", "list my products", "become"],
      },
      {
        id: "follow",
        q: "Follow a store",
        a: "Tap the bell on a store's page. You'll hear about its new products and deals.",
        keywords: ["follow", "subscribe", "bell", "updates from store"],
        links: [{ label: "Browse stores", href: "/stores" }],
      },
    ],
  },
];

const ANSWERS = HELP_TOPICS.flatMap((t) => t.answers);
export const answerById = (id: string) => ANSWERS.find((a) => a.id === id) ?? null;
export const topicById = (id: string) => HELP_TOPICS.find((t) => t.id === id) ?? null;

/** Asking for a person straight out skips the questions */
export const wantsPerson = (text: string) => /\b(human|real person|a person|agent|someone|staff|representative|customer care|customer service|talk to (you|someone|somebody))\b/i.test(text);

/** The answers a typed question most likely means, best first */
export function searchHelp(text: string): { answer: HelpAnswer; score: number }[] {
  const t = ` ${text.toLowerCase().replace(/[^a-z0-9₦$ ]/g, " ").replace(/\s+/g, " ")} `;
  return ANSWERS.map((answer) => ({
    answer,
    score: answer.keywords.reduce((n, k) => (t.includes(k.includes(" ") ? k : ` ${k}`) ? n + (k.includes(" ") ? 2 : 1) : n), 0),
  }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
