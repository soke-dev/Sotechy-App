// Help and support: how to reach Sotechy, quick answers, and deleting an account (the app stores' support page)
import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT } from "../policies/content";
import { InShort, PolicyFrame } from "../policies/policy-page";

export const metadata: Metadata = {
  title: "Help and support — Sotechy",
  description: "Contact Sotechy: live chat in the app, email, or visit us in Benin City. Help with orders, payments, delivery, returns and your account.",
};

const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} className="font-semibold text-brand-strong hover:underline">
    {children}
  </Link>
);

export default function SupportPage() {
  return (
    <PolicyFrame title="Help and support" intro="We're here to help with your orders, payments, deliveries and account. Our team is in Monday to Saturday.">
      <InShort
        points={[
          "Fastest: open the Sotechy app, go to Account → Help & support, and tap Live chat.",
          `Email us at ${CONTACT.email}. We usually reply within one working day.`,
          "For a problem with an order, include your order number (it starts with SOT-).",
        ]}
      />
      <div className="mt-8">
        <h2>Contact us</h2>
        <ul>
          <li>
            <b>Live chat:</b> in the Sotechy app under Account → Help & support. It answers common questions straight away and passes the rest to our team.
          </li>
          <li>
            <b>Email:</b>{" "}
            <a href={`mailto:${CONTACT.email}`} className="font-semibold text-brand-strong hover:underline">
              {CONTACT.email}
            </a>
          </li>
          <li>
            <b>X:</b> <A href={CONTACT.x}>@sotechyshop</A>
          </li>
          <li>
            <b>Visit us:</b> {CONTACT.address}, Monday to Saturday
          </li>
        </ul>

        <h2>Quick answers</h2>
        <ul>
          <li>
            <b>Where is my order?</b> Open Orders in the app and tap the order to see each step. You also get a notification at every step.
          </li>
          <li>
            <b>It says delivered but I don&apos;t have it.</b> Open the order and tap Not received within 24 hours. We hold the store&apos;s payment while we sort it out. See <A href="/delivery">Delivery and pickup</A>.
          </li>
          <li>
            <b>Returns and refunds.</b> See <A href="/returns">Returns and refunds</A> and <A href="/warranty">Warranty</A>.
          </li>
          <li>
            <b>Paying.</b> See <A href="/payments">Payments</A>.
          </li>
          <li>
            <b>Store tokens.</b> See <A href="/rewards">Rewards and tokens</A>.
          </li>
          <li>
            <b>Selling on Sotechy.</b> Open your store at <A href="https://merchant.sotechy.shop">merchant.sotechy.shop</A>.
          </li>
        </ul>

        <h2>Deleting your account</h2>
        <p>
          In the app, go to Account → Security & notifications → Delete my account. This removes your account and personal data for good; past orders are kept without your name. If you
          can&apos;t open the app, email {CONTACT.email} from the address on your account and we&apos;ll delete it for you. See <A href="/privacy">Privacy</A> for what we keep and why.
        </p>
      </div>
    </PolicyFrame>
  );
}
