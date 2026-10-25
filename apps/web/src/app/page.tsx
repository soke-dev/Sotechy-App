import Link from "next/link";
import { BUSINESS } from "@sotechy/shared";

// Rough landing page — copy and visuals to be refined.
const SHOP_URL = process.env.NEXT_PUBLIC_SHOP_URL ?? "#";

const categories = [
  { name: "Phones & Accessories", blurb: "Smartphones, chargers, cables and cases" },
  { name: "Computers & Gadgets", blurb: "Laptops, accessories and personal electronics" },
  { name: "Home Appliances", blurb: "Small household appliances and home electronics" },
  { name: "TV & Audio", blurb: "TVs, speakers and entertainment" },
];

const reasons = [
  { title: "Shop online or in store", body: "Order in the app and get it delivered, or pick up from a Sotechy branch." },
  { title: "Pay your way", body: "Bank transfer, cards and supported cryptocurrency for eligible purchases." },
  { title: "Crypto-friendly retail", body: "Use supported digital assets to buy real products — no wallet needed just to browse." },
  { title: "Real stock, real stores", body: "Live availability by branch, warranty information and in-person support." },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          {/* Logo comes from brand-assets/logo (run `pnpm assets:sync` after changing it) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/light-logo-small.png" alt="SoTechy" className="h-10" />
          <nav className="hidden gap-6 text-sm text-neutral-600 md:flex">
            <a href="#categories">Shop</a>
            <a href="#why">Why Sotechy</a>
            <a href="#crypto">Pay with crypto</a>
            <a href="#stores">Stores</a>
            <a href="#merchants">For businesses</a>
          </nav>
          <a href={SHOP_URL} className="rounded-full bg-orange-500 px-4 py-2 text-sm font-medium text-white">
            Shop now
          </a>
        </div>
      </header>

      <main className="flex-1">
        <section className="bg-gradient-to-b from-orange-50 to-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-2 md:items-center">
            <div>
              <p className="mb-3 text-sm font-medium text-orange-600">{BUSINESS.tagline}</p>
              <h1 className="text-4xl font-bold leading-tight md:text-5xl">Electronics you can trust — online and in store.</h1>
              <p className="mt-4 text-lg text-neutral-600">
                Phones, laptops, appliances and accessories from Sotechy Shop in Benin City. Order online for delivery or pickup, and pay by bank or supported crypto.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href={SHOP_URL} className="rounded-full bg-orange-500 px-6 py-3 font-medium text-white">Start shopping</a>
                <a href="#download" className="rounded-full border border-neutral-300 px-6 py-3 font-medium">Get the app</a>
              </div>
            </div>
            <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
              Hero image — add to brand-assets/images
            </div>
          </div>
        </section>

        <section id="categories" className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="mb-8 text-2xl font-semibold">Shop by category</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((c) => (
              <a key={c.name} href={SHOP_URL} className="rounded-xl border border-neutral-200 p-5 hover:border-orange-400">
                <div className="mb-4 aspect-video rounded-lg bg-neutral-100" />
                <h3 className="font-medium">{c.name}</h3>
                <p className="mt-1 text-sm text-neutral-500">{c.blurb}</p>
              </a>
            ))}
          </div>
        </section>

        <section id="why" className="bg-neutral-50">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="mb-8 text-2xl font-semibold">Why Sotechy</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {reasons.map((r) => (
                <div key={r.title}>
                  <h3 className="font-medium">{r.title}</h3>
                  <p className="mt-2 text-sm text-neutral-600">{r.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="crypto" className="mx-auto max-w-6xl px-4 py-16">
          <div className="rounded-2xl bg-orange-500 p-8 text-white md:p-12">
            <h2 className="text-2xl font-semibold">Pay with $MOVE</h2>
            <p className="mt-3 max-w-2xl text-orange-100">
              Sotechy accepts supported cryptocurrency for real products. When the offer is running, get up to 10% off eligible purchases paid with $MOVE. Check the app for current offers.
            </p>
          </div>
        </section>

        <section id="stores" className="bg-neutral-50">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="mb-8 text-2xl font-semibold">Visit our stores</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-neutral-200 bg-white p-6">
                <h3 className="font-medium">Head office</h3>
                <p className="mt-1 text-neutral-600">{BUSINESS.headOffice}</p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white p-6">
                <h3 className="font-medium">Second branch</h3>
                <p className="mt-1 text-neutral-600">Address to be added</p>
              </div>
            </div>
          </div>
        </section>

        <section id="merchants" className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-semibold">For businesses</h2>
          <p className="mt-3 max-w-2xl text-neutral-600">
            Sotechy helps other businesses showcase products and accept crypto payments online and in store. Merchant accounts are coming soon — get in touch to learn more.
          </p>
        </section>

        <section id="download" className="bg-neutral-900 text-white">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Get the Sotechy app</h2>
              <p className="mt-2 text-neutral-400">Browse, order and track deliveries on Android and iOS.</p>
            </div>
            <div className="flex gap-3">
              <span className="rounded-lg border border-neutral-700 px-4 py-2 text-sm">App Store — coming soon</span>
              <span className="rounded-lg border border-neutral-700 px-4 py-2 text-sm">Google Play — coming soon</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-neutral-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-neutral-500 md:flex-row md:justify-between">
          <p>
            © {BUSINESS.name} · {BUSINESS.headOffice}
          </p>
          <div className="flex gap-4">
            <Link href="/policies">Delivery, returns & warranty</Link>
            <Link href="/policies#privacy">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
