// Sotechy's policies. Each has its own page (/terms, /delivery, /returns…), and they're all on /policies.
// Every policy opens with "In short", the plain-words version, then the full terms.
import Link from "next/link";
import type { ReactNode } from "react";
import { BUSINESS } from "@sotechy/shared";

export const CONTACT = { email: "hello@sotechy.shop", address: BUSINESS.headOffice, x: "https://x.com/sotechyshop" };
export const UPDATED = "2 November 2026";

export interface Policy {
  slug: string;
  title: string;
  /** One line under the title */
  summary: string;
  /** The friendly version, shown first */
  short: string[];
  body: ReactNode;
}

const Mail = () => (
  <a href={`mailto:${CONTACT.email}`} className="font-semibold text-brand-strong hover:underline">
    {CONTACT.email}
  </a>
);

const P = ({ slug, children }: { slug: string; children: ReactNode }) => (
  <Link href={`/${slug}`} className="font-semibold text-brand-strong hover:underline">
    {children}
  </Link>
);

export const POLICIES: Policy[] = [
  {
    slug: "terms",
    title: "Terms of service",
    summary: "The agreement between you and Sotechy when you use the Sotechy app, sotechy.shop and the stores on Sotechy.",
    short: [
      "Sotechy is a marketplace: independent stores sell on it, and Sotechy also has its own store.",
      "You pay Sotechy, and we only pay a store in full after your order is delivered.",
      "Each store is responsible for its products, descriptions, delivery and warranty. We step in when something goes wrong.",
      "Tokens are store credit, not money.",
      "Your rights under Nigerian consumer law always apply.",
    ],
    body: (
      <>
        <h3>1. Who we are</h3>
        <p>
          Sotechy (&ldquo;Sotechy&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) runs the Sotechy app, the website sotechy.shop and the Sotechy marketplace from {CONTACT.address}, and has traded since{" "}
          {BUSINESS.founded}. These terms apply whenever you browse, create an account, place an order, use tokens, make an offer, chat with us or leave a review. By creating an account or placing
          an order, you accept these terms and the policies they link to: <P slug="payments">Payments</P>, <P slug="delivery">Delivery and pickup</P>, <P slug="returns">Returns and refunds</P>,{" "}
          <P slug="warranty">Warranty</P>, <P slug="rewards">Rewards and tokens</P> and <P slug="privacy">Privacy</P>.
        </p>

        <h3>2. How the marketplace works</h3>
        <ul>
          <li>
            Sotechy is a marketplace. Most products are listed and sold by independent stores (&ldquo;stores&rdquo;) that Sotechy has reviewed before they could sell. Every product shows the store
            that sells it.
          </li>
          <li>
            When you buy from a store, that store is the seller. It&apos;s responsible for the product, its description, photos, price, stock, packaging, delivery and warranty. Sotechy provides the
            platform, takes your payment, holds it, and pays the store in stages, so you&apos;re protected if something goes wrong.
          </li>
          <li>Products sold by Sotechy&apos;s own store are sold by Sotechy, and we&apos;re the seller for those.</li>
          <li>
            <b>Official store</b> (orange tick) means a registered business whose documents we&apos;ve checked. <b>Verified seller</b> (blue tick) means an individual or freelancer whose identity
            we&apos;ve checked. These badges show we&apos;ve checked who the seller is. They aren&apos;t a guarantee of every product they sell.
          </li>
          <li>
            Stores agree to our{" "}
            <a href="https://merchant.sotechy.shop/terms" className="font-semibold text-brand-strong hover:underline">
              merchant terms
            </a>
            , which require accurate listings, honest prices and proper delivery. We can pause products and suspend stores that break them.
          </li>
        </ul>

        <h3>3. Your account</h3>
        <ul>
          <li>You must be at least 18 to create an account, or have a parent or guardian&apos;s permission and supervision.</li>
          <li>Give accurate details, including a phone number and delivery address where you can be reached. Keep your password and sign-in codes private.</li>
          <li>You&apos;re responsible for activity on your account. Tell us straight away at <Mail /> if you think someone else has used it.</li>
          <li>One person, one account. Accounts can&apos;t be sold or transferred.</li>
          <li>Your account comes with a Sotechy wallet that holds your tokens. We look after it for you; it can&apos;t be used outside Sotechy.</li>
        </ul>

        <h3>4. Prices and listings</h3>
        <ul>
          <li>Prices are in naira (₦) and include VAT where it applies. Delivery fees, discounts and the total are shown at checkout before you pay.</li>
          <li>Any dollar figures are estimates for reference only.</li>
          <li>
            Stores work hard to keep listings right, but mistakes happen. If a price or description is clearly wrong (for example, a phone listed at ₦1,000), the store or Sotechy may cancel the order
            and you&apos;ll get a full refund.
          </li>
          <li>Photos are for illustration. Colours and small details may vary slightly. Specifications come from the store or the manufacturer.</li>
        </ul>

        <h3>5. Orders</h3>
        <ul>
          <li>Placing an order is an offer to buy. The order is confirmed once your payment is received and the store accepts it.</li>
          <li>Unpaid orders are cancelled automatically after 24 hours, and the items go back on sale.</li>
          <li>
            A store has 24 hours to accept a paid order. If it doesn&apos;t, Sotechy steps in: we chase the store, and if it can&apos;t fulfil the order, we cancel it and refund you in full.
          </li>
          <li>
            A store or Sotechy may cancel an order if the item is out of stock, the price was clearly wrong, the delivery address can&apos;t be reached, or we suspect fraud. If you&apos;ve paid,
            you get a full refund.
          </li>
          <li>You can cancel an unpaid order in the app at any time. Once paid, contact us and we&apos;ll cancel it if the store hasn&apos;t sent it yet.</li>
        </ul>

        <h3>6. Offers and promo codes</h3>
        <ul>
          <li>Some stores let you make an offer on a product. The store has 48 hours to accept or decline. If it doesn&apos;t answer in time, the offer expires.</li>
          <li>
            An accepted offer lets you buy at that price once. If the order isn&apos;t paid within 24 hours, the offer price is used up and the item returns to its normal price.
          </li>
          <li>
            Promo codes come from stores or from Sotechy. Each has its own rules (which items, end date, minimum order, uses per person), shown when you apply it. Codes have no cash value and
            can&apos;t be combined unless the code says so.
          </li>
        </ul>

        <h3>7. Tokens</h3>
        <p>
          You earn reward tokens when you shop. They&apos;re store credit with no cash value, as set out in <P slug="rewards">Rewards and tokens</P>.
        </p>

        <h3>8. Reviews, photos and messages</h3>
        <ul>
          <li>Reviews must be honest and about your own purchase. No offensive content, personal details, ads or links.</li>
          <li>By posting a review or photo, you let Sotechy and the store show it in the app and on the website.</li>
          <li>We may remove content that breaks these rules, and take back any review bonus tokens it earned.</li>
        </ul>

        <h3>9. Fair use</h3>
        <p>To keep Sotechy safe for everyone, you agree not to:</p>
        <ul>
          <li>use Sotechy for fraud, money laundering or anything unlawful, or buy with someone else&apos;s money or account without permission;</li>
          <li>make false claims (for example, saying an order didn&apos;t arrive when it did) or misuse refunds, offers, promo codes or token bonuses;</li>
          <li>harass stores, riders or our staff;</li>
          <li>copy, scrape, reverse-engineer or overload the app or website, or try to get around its security.</li>
        </ul>
        <p>
          If we find misuse, we may cancel orders, hold or reverse refunds and tokens, and suspend or close the account. Where we can, we&apos;ll tell you why and give you the chance to explain.
        </p>

        <h3>10. Records on the blockchain</h3>
        <p>
          Token balances and order receipts are recorded on a public blockchain so they can be checked. These records show wallet addresses and amounts, never your name, phone or address. Blockchain
          records can&apos;t be edited or deleted. If something needs correcting, we record a new entry that corrects it.
        </p>

        <h3>11. Our responsibility to you</h3>
        <ul>
          <li>
            Nothing in these terms limits your rights under the Federal Competition and Consumer Protection Act 2018 or other Nigerian law, including your right to goods that match their
            description and work as they should.
          </li>
          <li>
            Where the law allows, Sotechy&apos;s total responsibility for an order is limited to what you paid for it. We aren&apos;t responsible for indirect losses, such as lost profits, lost
            data or business interruption.
          </li>
          <li>
            We aren&apos;t responsible for delays or failures caused by things outside our reasonable control, such as network outages, strikes, flooding, civil unrest or problems with banks and
            payment networks. We&apos;ll keep you updated and help where we can.
          </li>
          <li>
            The app may link to other websites, such as a store&apos;s social media or a blockchain explorer. We don&apos;t run them and aren&apos;t responsible for their content.
          </li>
        </ul>

        <h3>12. Suspending or closing accounts</h3>
        <p>
          You can close your account at any time by writing to <Mail />. We may suspend or close an account that breaks these terms. Orders already paid will still be completed or refunded. Unused
          tokens end when an account is closed for misuse.
        </p>

        <h3>13. Changes to these terms</h3>
        <p>
          We may update these terms as Sotechy grows. The date at the top shows the latest version. For important changes, we&apos;ll tell you in the app or by email before they apply. Orders placed
          before a change follow the terms in place when you ordered.
        </p>

        <h3>14. Disputes and the law</h3>
        <ul>
          <li>These terms are governed by the laws of the Federal Republic of Nigeria.</li>
          <li>If something goes wrong, please contact us first through live chat or at <Mail />. Most problems are sorted within a few days.</li>
          <li>
            If we can&apos;t agree, either of us may refer the matter to mediation in Benin City before going to court. The courts of Edo State will hear any dispute. You can also contact the
            Federal Competition and Consumer Protection Commission.
          </li>
        </ul>
      </>
    ),
  },
  {
    slug: "payments",
    title: "Payments",
    summary: "How you can pay, how Sotechy keeps your money safe, and how stores get paid.",
    short: [
      "Pay by bank transfer or stablecoin (USDT or USDC), and use your tokens for part of it.",
      "You always pay Sotechy, never the store directly.",
      "We hold your money and pay the store in full only after delivery.",
      "Pay the exact amount shown, to the details shown for your order.",
    ],
    body: (
      <>
        <h3>1. Ways to pay</h3>
        <ul>
          <li>
            <b>Bank transfer:</b> at checkout you get an account number made just for your order. Transfer the exact amount before it expires (the time is shown). It usually confirms within a few
            minutes.
          </li>
          <li>
            <b>Stablecoin:</b> pay in USDT or USDC through our payment partner. You&apos;ll see the amount, the network and the address to send to. Stablecoin can take a little longer while the
            network confirms it.
          </li>
          <li>
            <b>Tokens:</b> you can put your tokens towards part of an order at the store that issued them. At least ₦100 of every order is paid in money.
          </li>
          <li>The ways to pay available for an order are shown at checkout. They may change from time to time.</li>
        </ul>

        <h3>2. Paying safely</h3>
        <ul>
          <li>Only pay to the account number or wallet address shown in the Sotechy app for your order. Never pay a store, rider or anyone else directly, even if they ask.</li>
          <li>Sotechy staff will never ask for your password, sign-in code or bank PIN.</li>
          <li>Payments go through licensed payment partners over encrypted connections.</li>
        </ul>

        <h3>3. If a payment goes wrong</h3>
        <ul>
          <li>
            <b>Paid less than the total:</b> the order isn&apos;t confirmed. Contact us and we&apos;ll either help you pay the difference or refund what you sent.
          </li>
          <li>
            <b>Paid more than the total:</b> we refund the extra once we&apos;ve confirmed it.
          </li>
          <li>
            <b>Paid after the order expired or was cancelled:</b> we refund it.
          </li>
          <li>
            <b>Stablecoin sent on the wrong network, in the wrong coin or to the wrong address:</b> blockchain payments can&apos;t be reversed. We&apos;ll try to help recover it, but we can&apos;t
            promise to, so please check the details before you send.
          </li>
          <li>Refunds for payment mistakes are sent once we&apos;ve matched the payment to you. We may ask for your receipt or transaction hash.</li>
        </ul>

        <h3>4. How stores are paid</h3>
        <p>
          You pay Sotechy. We pay the store part of the order when it accepts it, and the rest a set time after the order is delivered, less Sotechy&apos;s fee. If you report a problem before then,
          we hold the store&apos;s final payment until it&apos;s sorted. This is how we protect you.
        </p>

        <h3>5. Unpaid orders</h3>
        <p>
          An order waits 24 hours for payment. After that it&apos;s cancelled automatically, any tokens you put towards it come back to your wallet, and any offer price on it is used up.
        </p>

        <h3>6. Fraud and reversals</h3>
        <p>
          If a payment is reversed, disputed or turns out to be fraudulent, we may cancel the order, take back tokens earned on it, and ask you to return the item or pay for it.
        </p>
      </>
    ),
  },
  {
    slug: "delivery",
    title: "Delivery and pickup",
    summary: "Where stores deliver, how long it takes, what it costs, how pickup works, and what to do if your order doesn't arrive.",
    short: [
      "Each store sets its own delivery areas, fees and times. You see them all before you pay.",
      "You can choose home delivery or collect from a store's pickup point.",
      "Check your order when it arrives. If it says delivered but didn't reach you, tap Not received within 24 hours.",
      "If a store doesn't deliver within 7 days, Sotechy steps in.",
    ],
    body: (
      <>
        <h3>1. Who delivers</h3>
        <p>
          Each store delivers its own orders, with its own riders or a courier it chooses. Sotechy&apos;s own store delivers its orders. A store&apos;s delivery areas and pickup points are on its
          About tab and on each product.
        </p>

        <h3>2. Fees and times</h3>
        <ul>
          <li>The delivery fee and estimated time are shown at checkout, before you pay. They depend on the store, your address and the size of the order.</li>
          <li>
            Times are estimates from the store. Weather, traffic, public holidays and courier delays can make an order late. The order in the app shows each step, and you get a notification as it
            moves.
          </li>
          <li>If an order hasn&apos;t been delivered within 7 days of being paid, Sotechy steps in. We chase the store, and if it can&apos;t deliver, we cancel the order and refund you in full.</li>
        </ul>

        <h3>3. Your address and phone</h3>
        <ul>
          <li>Give a full address and a phone number where you can be reached. The rider may call before they arrive.</li>
          <li>If you need to change the address after paying, contact us quickly. We&apos;ll ask the store, but we can&apos;t promise a change once the order has left, and a new fee may apply.</li>
          <li>
            If the rider can&apos;t reach you after two attempts, or the address is wrong, the order may go back to the store. You can arrange pickup or a new delivery, which may cost another
            delivery fee. If we can&apos;t reach you within 7 days, the order is cancelled and refunded, less delivery costs.
          </li>
        </ul>

        <h3>4. When your order arrives</h3>
        <ul>
          <li>
            Check the package before the rider leaves. If it&apos;s opened, crushed or wet, take photos, note it with the rider, and tell us in the app. You can refuse a package that is clearly
            damaged.
          </li>
          <li>Once the store marks the order delivered, the app asks: Did you get your order? Tap Received to confirm.</li>
          <li>
            If it says delivered but didn&apos;t reach you, tap <b>Not received</b> on the order within 24 hours. We hold the store&apos;s final payment and look into it with the store and the
            rider.
          </li>
          <li>
            If we don&apos;t hear from you within 24 hours, we treat the order as received and the store is paid. You can still report faults and wrong items under our{" "}
            <P slug="returns">Returns and refunds</P> policy.
          </li>
          <li>Responsibility for the item passes to you once it&apos;s handed to you, or to someone at your address who accepts it for you.</li>
        </ul>

        <h3>5. Pickup</h3>
        <ul>
          <li>Choose a pickup point at checkout. The app tells you, and sends a notification, when your order is ready to collect.</li>
          <li>Bring your order number and the name on the order. The store may ask for ID for high-value items. Someone else can collect it if you share the order number with them.</li>
          <li>Check the item at the counter before you leave.</li>
          <li>Please collect within 7 days of the order being ready. After that, the store may cancel it and you&apos;ll be refunded, less any costs the store had.</li>
        </ul>
      </>
    ),
  },
  {
    slug: "returns",
    title: "Returns and refunds",
    summary: "What you can return, how to do it, and how and when you get your money back.",
    short: [
      "Faulty, damaged, wrong or not as described? Tell us within 7 days and you'll get a repair, replacement or full refund.",
      "Changed your mind? Some stores accept returns of unopened items. It's shown on the product.",
      "Report problems in the app, with photos. We hold the store's payment while we sort it out.",
      "Refunds go back the way you paid. Tokens you used come back to your wallet.",
    ],
    body: (
      <>
        <h3>1. When you can return an item</h3>
        <ul>
          <li>
            <b>Faulty, damaged or not as described:</b> tell us within 7 days of delivery or pickup. After checking, the store repairs it, replaces it or refunds you in full, including delivery.
          </li>
          <li>
            <b>Damaged in delivery:</b> please tell us within 24 hours of delivery, with photos of the item and the packaging.
          </li>
          <li>
            <b>Wrong item or missing parts:</b> tell us within 7 days. The store sends the right item or the missing parts, or refunds you.
          </li>
          <li>
            <b>Changed your mind:</b> this depends on the store. Where a product says it accepts change-of-mind returns, you can return it unused, in its original sealed packaging, within the time
            shown. The refund is the item price, and you pay to send it back.
          </li>
          <li>Faults that show up after 7 days are covered by the product&apos;s <P slug="warranty">warranty</P>.</li>
        </ul>

        <h3>2. What can&apos;t be returned</h3>
        <p>Unless it was faulty, damaged on arrival or not as described, we can&apos;t accept:</p>
        <ul>
          <li>items that have been used, installed, set up or damaged after delivery;</li>
          <li>items with broken seals where the seal protects hygiene or content: earphones, software, SIM cards, airtime, gift cards and personal care items;</li>
          <li>items missing their box, accessories, manuals or free gifts, or whose serial or IMEI number doesn&apos;t match our records;</li>
          <li>phones and devices still signed in to the buyer&apos;s accounts (Google, iCloud, Samsung). Please sign out before returning;</li>
          <li>custom or made-to-order items, and items marked final sale.</li>
        </ul>

        <h3>3. How to return an item</h3>
        <ol>
          <li>Open live chat in the app (or email <Mail />) and tell us the order number, what&apos;s wrong, and add photos or a short video.</li>
          <li>We reply within 2 working days, usually much sooner, and arrange the return with the store.</li>
          <li>Send or bring back the item with everything that came in the box. For faulty, damaged or wrong items, the return is free.</li>
          <li>The store checks it within 3 working days of getting it back, and we tell you the outcome.</li>
        </ol>
        <p>While a return is open, we hold the store&apos;s final payment, so your money stays protected.</p>

        <h3>4. Refunds</h3>
        <ul>
          <li>
            Once a refund is approved, we send it within 5 working days. You&apos;ll see it on the order with its reference: the bank transfer reference, or the transaction hash for stablecoin.
          </li>
          <li>
            <b>Bank transfer:</b> refunded by bank transfer to an account in your name. We may ask for your account details in the app.
          </li>
          <li>
            <b>Stablecoin:</b> refunded in the same coin, for the naira value of the refund at our rate on the day we send it, less the network fee, to the wallet address you give us. Please
            double-check the address and network. Blockchain payments can&apos;t be reversed.
          </li>
          <li>Tokens you used on the order come back to your wallet. Tokens you earned on it, including any bonus, are taken back.</li>
          <li>
            Delivery fees are refunded when the item was faulty, damaged, wrong, or the order was cancelled before it was sent. For change-of-mind returns, delivery isn&apos;t refunded.
          </li>
          <li>If you cancel a paid order before it&apos;s sent or ready for pickup, you get a full refund.</li>
        </ul>

        <h3>5. If a store won&apos;t sort it out</h3>
        <p>
          The rules are the same at every store on Sotechy. If a store doesn&apos;t resolve a valid complaint, Sotechy decides the outcome using the order record, your photos and the store&apos;s
          response, and refunds you where it&apos;s fair. Our decision doesn&apos;t affect your rights under Nigerian law.
        </p>
      </>
    ),
  },
  {
    slug: "warranty",
    title: "Warranty",
    summary: "What a product's warranty covers, who provides it, and how to make a claim.",
    short: [
      "Each product shows its warranty. Most new electronics have the manufacturer's warranty.",
      "Warranties cover manufacturing faults, not drops, water, power surges or misuse.",
      "Your order number is your proof of purchase.",
      "Claim through live chat. The store handles it, and Sotechy helps if needed.",
    ],
    body: (
      <>
        <h3>1. What warranty a product has</h3>
        <ul>
          <li>The warranty, if there is one, is shown on the product page and in your order. It starts on the day you receive the item.</li>
          <li>Most new electronics and appliances come with the manufacturer&apos;s warranty, usually 6 to 12 months.</li>
          <li>Used, open-box and refurbished items show their own warranty, which may be shorter or none. If no warranty is shown, the item has no warranty beyond your legal rights.</li>
          <li>The store that sold the item provides the warranty, or arranges it with the manufacturer. For Sotechy&apos;s own store, that&apos;s us.</li>
        </ul>

        <h3>2. What it covers</h3>
        <p>Faults in materials or manufacturing that appear during normal use within the warranty period.</p>

        <h3>3. What it doesn&apos;t cover</h3>
        <ul>
          <li>damage from drops, cracks, liquid, sand, heat, power surges or unstable electricity;</li>
          <li>misuse, wrong installation, or using the wrong charger or voltage;</li>
          <li>repairs, opening or modifications by anyone other than the store or an authorised service centre;</li>
          <li>normal wear and tear: scratches, worn batteries after normal use, fading;</li>
          <li>software problems, viruses, lost data, or locks from forgotten passwords and accounts;</li>
          <li>accessories and consumables (cables, cases, remotes, bulbs) unless the product page says they&apos;re covered;</li>
          <li>items with a removed or damaged serial number or warranty sticker.</li>
        </ul>

        <h3>4. How to claim</h3>
        <ol>
          <li>Open live chat in the app (or email <Mail />) with your order number, what&apos;s wrong, and a photo or video of the fault.</li>
          <li>We pass it to the store and tell you where to bring or send the item. For manufacturer warranties, the store may send it to the manufacturer&apos;s service centre.</li>
          <li>The item is inspected. If the fault is covered, it&apos;s repaired, or replaced if it can&apos;t be repaired. If neither is possible, you get a refund for what you paid.</li>
          <li>If the fault isn&apos;t covered, you&apos;ll be told why and offered a paid repair if one is available. Nothing is charged without your agreement.</li>
        </ol>
        <ul>
          <li>Repairs usually take 5 to 14 working days. Manufacturer service centres may take longer, and we&apos;ll keep you updated.</li>
          <li>Back up your data and remove your accounts and passwords first. Repairs can erase data, and neither the store nor Sotechy is responsible for lost data.</li>
          <li>A repaired or replaced item is covered for the rest of the original warranty.</li>
        </ul>

        <h3>5. Your rights</h3>
        <p>This warranty is on top of your rights under Nigerian law, not instead of them.</p>
      </>
    ),
  },
  {
    slug: "rewards",
    title: "Rewards and tokens",
    summary: "How you earn and spend tokens, and what they are and aren't.",
    short: [
      "Earn 1 token for every ₦1 you spend at a store, once your order is delivered.",
      "Spend them at the store that gave them. $SOTECHY works at every store.",
      "Tokens are store credit: no cash value, no withdrawals, not an investment.",
      "You can send them to other people on Sotechy by @username.",
    ],
    body: (
      <>
        <h3>1. What tokens are</h3>
        <p>
          Every store on Sotechy has its own reward token, like $OVIE from Ovie&apos;s Gadgets. Sotechy&apos;s is $SOTECHY. Tokens are store credit that you can spend at checkout. They&apos;re kept in
          your Sotechy wallet and recorded on a public blockchain so balances can be checked.
        </p>

        <h3>2. How you earn them</h3>
        <ul>
          <li>1 token for every ₦1 you spend at a store, on the amount you paid in money after discounts. You don&apos;t earn on delivery fees or on the part you paid with tokens.</li>
          <li>10% extra in $SOTECHY when you buy from stores other than Sotechy&apos;s own.</li>
          <li>5% more for reviewing what you bought, or 10% with a photo.</li>
          <li>Tokens from a store&apos;s own shop when you give them your @username at the till, if the store offers it.</li>
          <li>Tokens arrive when the order is delivered. Until then they show as pending. Pending tokens don&apos;t arrive if the order is cancelled.</li>
        </ul>

        <h3>3. How you spend them</h3>
        <ul>
          <li>At checkout, at the store that issued them. $SOTECHY can be spent at any store on Sotechy.</li>
          <li>You can mix tokens and money in one payment. At least ₦100 of every order is paid in money.</li>
          <li>The app shows what your tokens are worth in naira before you use them.</li>
          <li>Tokens put towards an unpaid order are held. They come back if the order is cancelled or expires.</li>
        </ul>

        <h3>4. Sending tokens</h3>
        <p>
          You can send tokens to anyone with a Sotechy account, by @username or Sotechy wallet address. Check the recipient before you send. Sent tokens can&apos;t be taken back, except by the
          person who received them sending them back.
        </p>

        <h3>5. What tokens are not</h3>
        <ul>
          <li>Not money: they can&apos;t be withdrawn, exchanged for cash or paid into a bank account.</li>
          <li>Not tradeable: they can&apos;t be sold, swapped or sent to wallets outside Sotechy.</li>
          <li>Not an investment: their value doesn&apos;t go up.</li>
        </ul>
        <p>A store may one day choose to make its token tradeable. If that happens, we&apos;ll tell you before anything changes.</p>

        <h3>6. When tokens can be taken back</h3>
        <ul>
          <li>Tokens earned on an order that&apos;s refunded or returned.</li>
          <li>Review bonuses on a review that&apos;s removed for breaking our rules.</li>
          <li>Tokens earned through mistakes, fraud or misuse of the programme.</li>
        </ul>

        <h3>7. Changes to the programme</h3>
        <p>
          We may change how many tokens you earn, add or end bonuses, or end the programme. We&apos;ll tell you in the app before a change affects tokens you already have, and give you a fair
          chance to spend them.
        </p>
      </>
    ),
  },
  {
    slug: "privacy",
    title: "Privacy policy",
    summary: "What personal data we collect, why, who we share it with, how long we keep it, and your rights.",
    short: [
      "We collect only what we need to run your account and deliver your orders.",
      "We never sell your data.",
      "Stores see only what they need for your order.",
      "The blockchain shows wallet addresses and amounts, never your name or contact details.",
      "You can ask to see, correct or delete your data at any time.",
    ],
    body: (
      <>
        <h3>1. Who&apos;s responsible</h3>
        <p>
          Sotechy ({CONTACT.address}) is responsible for the personal data described here, under the Nigeria Data Protection Act 2023. Questions or requests: <Mail />.
        </p>

        <h3>2. What we collect</h3>
        <ul>
          <li>
            <b>Account:</b> name, email, phone number, username, avatar or photo, and your Google profile if you sign in with Google.
          </li>
          <li>
            <b>Orders:</b> what you buy, delivery addresses, payment status, offers, promo codes and receipts. We don&apos;t see or store card numbers or bank PINs.
          </li>
          <li>
            <b>Refunds:</b> the bank account or wallet address you give us for a refund.
          </li>
          <li>
            <b>Tokens:</b> your wallet address, balances and token activity.
          </li>
          <li>
            <b>Support:</b> live chat messages, photos you send, and emails.
          </li>
          <li>
            <b>Reviews:</b> your rating, words and photos.
          </li>
          <li>
            <b>The app:</b> device type, notification tokens, notification choices, and basic logs to keep the service working and secure.
          </li>
          <li>
            <b>Stores selling on Sotechy:</b> business and registration details, documents, owners&apos; identity checks (ID and a selfie, done by our verification partner) and payout bank
            details.
          </li>
        </ul>

        <h3>3. Why we use it</h3>
        <ul>
          <li>To take, deliver and support your orders, process payments and refunds, and send order updates by push notification, email or WhatsApp.</li>
          <li>To run your wallet, tokens, offers and reviews.</li>
          <li>To verify stores, prevent fraud and misuse, and meet legal, tax and accounting duties.</li>
          <li>To improve the app and fix problems.</li>
          <li>To send offers and store news, only if you&apos;ve agreed or follow that store. You can turn these off at any time in Security &amp; notifications.</li>
        </ul>

        <h3>4. Who we share it with</h3>
        <p>We never sell your data. We share only what&apos;s needed with:</p>
        <ul>
          <li>the store you buy from: your name, phone and delivery address, for your order;</li>
          <li>payment and payout partners, to take payments, send refunds and pay stores;</li>
          <li>our identity-verification partner, for store owners&apos; ID checks;</li>
          <li>service providers for hosting, email, notifications, maps and address lookup, under contracts that protect your data;</li>
          <li>authorities, when the law requires it or to prevent fraud.</li>
        </ul>
        <p>Some of these providers store data outside Nigeria. When they do, we use the safeguards the Nigeria Data Protection Act requires.</p>

        <h3>5. The blockchain</h3>
        <p>
          Token movements and order receipts are recorded on a public blockchain. These records show wallet addresses, amounts and a fingerprint of the receipt, never your name, phone, email or
          address. They can&apos;t be deleted, even if you close your account, but without our records they can&apos;t be linked to you.
        </p>

        <h3>6. How long we keep it</h3>
        <ul>
          <li>Account data: while your account is open, and up to 2 years after it closes in case of disputes.</li>
          <li>Orders, payments and refunds: 6 years, as tax and accounting law requires.</li>
          <li>Support chats: 3 years.</li>
          <li>Store verification documents: while the store sells on Sotechy and for the period the law requires after.</li>
        </ul>

        <h3>7. Your rights</h3>
        <p>
          You can ask to see, correct, delete or get a copy of your personal data, object to how we use it, or withdraw consent for marketing. Email <Mail /> and we&apos;ll reply within 30 days.
          We may need to keep some records the law requires. You can also complain to the Nigeria Data Protection Commission.
        </p>

        <h3>8. Security</h3>
        <p>
          Data is encrypted in transit. Private documents are stored encrypted and only seen by our review team. Staff access needs two-step sign-in, and we review who can see what. No system is
          perfectly secure, so we&apos;ll tell you and the Commission promptly if a breach puts your data at risk.
        </p>

        <h3>9. Children</h3>
        <p>Sotechy isn&apos;t meant for children under 13, and we don&apos;t knowingly collect their data.</p>
      </>
    ),
  },
];

export const CONTACT_BLOCK = (
  <p>
    Questions about any of these? Use live chat in the Sotechy app, email <Mail />, visit us at {CONTACT.address}, or reach us on{" "}
    <Link href={CONTACT.x} className="font-semibold text-brand-strong hover:underline">
      X (@sotechyshop)
    </Link>
    .
  </p>
);
