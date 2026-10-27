// Sotechy Shop's policies. Each has its own page (/terms, /privacy, /returns…) and they're all on /policies.
import Link from "next/link";
import type { ReactNode } from "react";
import { BUSINESS } from "@sotechy/shared";

export const CONTACT = { email: "hello@sotechy.shop", address: BUSINESS.headOffice, x: "https://x.com/sotechyshop" };
export const UPDATED = "27 October 2026";

export interface Policy {
  slug: string;
  title: string;
  summary: string;
  body: ReactNode;
}

const Mail = () => (
  <a href={`mailto:${CONTACT.email}`} className="font-semibold text-brand-strong hover:underline">
    {CONTACT.email}
  </a>
);

export const POLICIES: Policy[] = [
  {
    slug: "terms",
    title: "Terms of service",
    summary: "The agreement between you and Sotechy when you use our app, website and stores.",
    body: (
      <>
        <p>
          These terms apply when you use the Sotechy app, sotechy.shop, or buy from Sotechy Shop in store. Sotechy Shop is a retailer of electronics, gadgets and home appliances in Benin City,
          Nigeria, trading since {BUSINESS.founded}, at {CONTACT.address}. By creating an account or placing an order, you agree to these terms.
        </p>
        <h3>Your account</h3>
        <ul>
          <li>You must be at least 18, or have a parent or guardian&apos;s permission, to buy from us.</li>
          <li>Give accurate details and keep your password private. You&apos;re responsible for what happens on your account.</li>
          <li>We may suspend accounts used for fraud, abuse or anything unlawful.</li>
        </ul>
        <h3>Sotechy and other stores</h3>
        <p>
          Sotechy is also a marketplace. Some products are sold by independent stores that Sotechy has reviewed and verified. Each product shows who sells it. When you buy from another store, that
          store is the seller and is responsible for the product, its description and its delivery; Sotechy takes your payment, holds it, and pays the store in stages so that you&apos;re protected
          if something goes wrong.
        </p>
        <h3>Prices and orders</h3>
        <ul>
          <li>Prices are in naira and include VAT where it applies. Delivery fees are shown at checkout before you pay.</li>
          <li>An order is confirmed when payment is received. We may cancel an order if an item is out of stock or a price was clearly wrong, and you&apos;ll get a full refund.</li>
          <li>Dollar amounts shown in the app are estimates for reference only.</li>
        </ul>
        <h3>Store tokens</h3>
        <p>
          You may earn reward tokens when you shop. They&apos;re store credit: they can only be spent at the store that issued them (or at Sotechy stores, for $SOTECHY), can&apos;t be exchanged for
          cash, can&apos;t be sent outside Sotechy, and are not an investment. We may change or end the reward programme, and we&apos;ll tell you before any change affects tokens you hold.
        </p>
        <h3>Liability</h3>
        <p>
          Nothing in these terms limits your rights under the Federal Competition and Consumer Protection Act 2018 or other Nigerian law. Otherwise, our liability for an order is limited to what you
          paid for it.
        </p>
        <h3>Changes and disputes</h3>
        <p>
          We may update these terms and will show the date of the latest version here. These terms are governed by the laws of the Federal Republic of Nigeria. If something goes wrong, contact us
          first at <Mail /> and we&apos;ll work to put it right.
        </p>
        <p>
          Stores selling on Sotechy also agree to our{" "}
          <a href="https://merchant.sotechy.shop/terms" className="font-semibold text-brand-strong hover:underline">
            merchant terms
          </a>
          .
        </p>
      </>
    ),
  },
  {
    slug: "returns",
    title: "Returns and refunds",
    summary: "What you can return, how to do it, and when you get your money back.",
    body: (
      <>
        <h3>When you can return an item</h3>
        <ul>
          <li>
            <b>Faulty, damaged or not as described:</b> tell us within 7 days of delivery or pickup and we&apos;ll repair it, replace it or refund you in full, including delivery.
          </li>
          <li>
            <b>Wrong item:</b> tell us within 7 days and we&apos;ll collect it and send the right one, or refund you in full.
          </li>
          <li>
            <b>Changed your mind:</b> unused items in their original sealed packaging can be returned within 7 days. The refund is the item price; return delivery is at your cost.
          </li>
        </ul>
        <h3>What can&apos;t be returned</h3>
        <ul>
          <li>Items that have been used, installed or damaged after delivery, unless they were faulty.</li>
          <li>Opened software, SIM cards, airtime, gift cards and hygiene products such as earphones once unsealed.</li>
          <li>Items with missing parts, accessories or serial numbers that don&apos;t match our records.</li>
        </ul>
        <h3>How to return</h3>
        <ol>
          <li>Open the order in the app and choose &ldquo;Report a problem&rdquo;, or email <Mail /> with your order number, what&apos;s wrong and photos.</li>
          <li>We&apos;ll reply within 2 working days, usually sooner, with how to send it back or arrange collection.</li>
          <li>Bring or send the item with everything that came in the box. We check it within 3 working days of receiving it.</li>
        </ol>
        <h3>Refunds</h3>
        <ul>
          <li>Approved refunds go back to the way you paid (bank account or card) within 5–10 working days. Cash and POS payments in store are refunded by bank transfer.</li>
          <li>If you paid partly with store tokens, those tokens are returned to your wallet.</li>
          <li>Tokens you earned on a refunded order are taken back.</li>
          <li>If you cancel a paid order before it&apos;s shipped or ready for pickup, you get a full refund.</li>
        </ul>
        <h3>Orders from other stores</h3>
        <p>
          The same rules apply to items sold by other stores on Sotechy. Report the problem through the app; Sotechy holds the store&apos;s final payment until delivery is confirmed and steps in if a
          store doesn&apos;t resolve a valid complaint.
        </p>
      </>
    ),
  },
  {
    slug: "delivery",
    title: "Delivery and pickup",
    summary: "Where we deliver, how long it takes, what it costs, and how pickup works.",
    body: (
      <>
        <h3>Delivery</h3>
        <ul>
          <li>Sotechy delivers across Edo, Delta, Lagos and the FCT, Abuja. Other stores deliver to the areas shown on their store page.</li>
          <li>The delivery fee and estimated time are shown at checkout before you pay. Benin City orders usually arrive within 1–2 working days; other cities usually within 2–5 working days.</li>
          <li>We&apos;ll contact you on the phone number you give at checkout. Check the item when it arrives and tell the rider at once if the package is damaged.</li>
          <li>If we can&apos;t reach you after two delivery attempts, the order is returned and you can arrange pickup or a new delivery.</li>
        </ul>
        <h3>Pickup</h3>
        <ul>
          <li>Choose pickup at checkout to collect from our store at {CONTACT.address}, or from a store&apos;s pickup point where it offers one.</li>
          <li>We&apos;ll tell you when your order is ready, usually the same day. Bring your order number and the name on the order.</li>
          <li>Orders not collected within 7 days may be cancelled and refunded.</li>
        </ul>
      </>
    ),
  },
  {
    slug: "warranty",
    title: "Warranty",
    summary: "How product warranties work and how to make a claim.",
    body: (
      <>
        <ul>
          <li>Each product page shows its warranty, if it has one. Most new electronics and appliances come with the manufacturer&apos;s warranty, typically 6–12 months from purchase.</li>
          <li>Warranties cover faults in manufacture, not damage from drops, liquid, power surges, misuse or repairs by anyone else.</li>
          <li>Keep your receipt or order number; it&apos;s your proof of purchase.</li>
          <li>To claim, email <Mail /> or visit our store with the item and your order number. We&apos;ll arrange repair or replacement with the manufacturer, or do it ourselves where we can.</li>
          <li>Used and refurbished items show their own warranty on the product page.</li>
        </ul>
      </>
    ),
  },
  {
    slug: "payments",
    title: "Payments",
    summary: "How you can pay, how your payment is kept safe, and how stores are paid.",
    body: (
      <>
        <ul>
          <li>You can pay by bank transfer or card through our licensed payment partners. In store we also take cash and POS.</li>
          <li>We never see or store your full card details; they go straight to our payment partner over an encrypted connection.</li>
          <li>Your order is confirmed once your payment is received. If a payment fails or is reversed, the order isn&apos;t processed.</li>
          <li>When you buy from another store on Sotechy, you pay Sotechy. We pay the store part when it accepts your order and the rest after delivery, less Sotechy&apos;s fee, through our licensed payout partner.</li>
          <li>Promo codes and token discounts are shown at checkout before you pay and can&apos;t be exchanged for cash.</li>
        </ul>
      </>
    ),
  },
  {
    slug: "privacy",
    title: "Privacy policy",
    summary: "What personal data we collect, why, who we share it with, and your rights.",
    body: (
      <>
        <p>
          Sotechy Shop ({CONTACT.address}) is responsible for the personal data described here. We follow the Nigeria Data Protection Act 2023. Questions or requests: <Mail />.
        </p>
        <h3>What we collect</h3>
        <ul>
          <li>
            <b>Account details:</b> name, email, phone number, username, and your Google profile if you sign in with Google.
          </li>
          <li>
            <b>Orders:</b> what you buy, delivery addresses, payment status and receipts. We don&apos;t store card numbers.
          </li>
          <li>
            <b>Stores selling on Sotechy:</b> business and registration details, documents, owners&apos; identity checks (ID and a selfie, done by our verification partner) and payout bank details.
          </li>
          <li>
            <b>Using the app:</b> device and notification tokens, and basic logs to keep the service secure.
          </li>
        </ul>
        <h3>Why we use it</h3>
        <ul>
          <li>To take and deliver your orders, process payments and refunds, and send order updates by email, push notification or WhatsApp.</li>
          <li>To verify stores, prevent fraud and meet legal and tax obligations.</li>
          <li>To run your token wallet, reviews and support.</li>
          <li>To send offers, only if you&apos;ve agreed; you can stop them at any time.</li>
        </ul>
        <h3>Who we share it with</h3>
        <p>We never sell your data. We share only what&apos;s needed with:</p>
        <ul>
          <li>The store you buy from, for your order and delivery.</li>
          <li>Payment and payout partners, to take payments and pay stores.</li>
          <li>Our identity-verification partner, for store owners&apos; ID checks.</li>
          <li>Service providers for email, notifications, address lookup and hosting, under contract.</li>
          <li>Authorities, when the law requires it.</li>
        </ul>
        <h3>How long we keep it</h3>
        <p>We keep account data while your account is open, and order and payment records for as long as the law requires (usually six years). Verification documents are kept while a store sells on Sotechy and for the period the law requires after.</p>
        <h3>Your rights</h3>
        <p>
          You can ask to see, correct or delete your personal data, object to its use, or ask for a copy. Email <Mail /> and we&apos;ll reply within 30 days. You can also complain to the Nigeria Data
          Protection Commission.
        </p>
        <h3>Security</h3>
        <p>Data is encrypted in transit, private documents are stored encrypted and only seen by our review team, and staff access requires two-step sign-in.</p>
      </>
    ),
  },
];

export const CONTACT_BLOCK = (
  <p>
    Questions about any of these? Email <Mail />, visit us at {CONTACT.address}, or reach us on{" "}
    <Link href={CONTACT.x} className="font-semibold text-brand-strong hover:underline">
      X (@sotechyshop)
    </Link>
    .
  </p>
);
