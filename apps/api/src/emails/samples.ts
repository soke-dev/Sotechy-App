// Sample data for previewing every email at /dev/emails (local API only).
import type { Email } from "../lib/email";
import { assetUrl } from "./layout";
import * as T from "./templates";

const to = "ada@example.com";
const inHours = (h: number) => new Date(Date.now() + h * 3_600_000);

const delivery: T.OrderEmailData = {
  id: "sample-order",
  number: "SOT-1042",
  store: "Sotechy Shop",
  fulfilment: "delivery",
  items: [
    { name: "Spark 20 Smartphone", detail: "128GB · Cyber White", quantity: 1, amount: 250_000, image: assetUrl("sample/item-phone.png") },
    { name: "Power Bank 20,000mAh", detail: "Black", quantity: 2, amount: 56_000, image: assetUrl("sample/item-powerbank.png") },
  ],
  subtotal: 306_000,
  discount: 10_000,
  deliveryFee: 3_500,
  total: 299_500,
  address: "14 Airport Road, GRA, Benin City, Edo",
};
const pickup: T.OrderEmailData = {
  ...delivery,
  number: "SOT-1043",
  fulfilment: "pickup",
  items: [{ name: "Fast Charger 33W", detail: "USB-C", quantity: 1, amount: 18_500, image: assetUrl("sample/item-charger.png") }],
  subtotal: 18_500,
  discount: 0,
  deliveryFee: 0,
  total: 18_500,
  address: null,
  pickup: { place: "Sotechy Shop, 20 Etete Road, Benin City", hours: "Mon to Sat, 9am to 7pm" },
};

/** name → [who it's for, the email] */
export const SAMPLES: Record<string, ["Customers" | "Merchants", () => Email | null]> = {
  welcome: ["Customers", () => T.welcomeEmail(to, { name: "Ada Okafor" })],
  "admin-code": ["Merchants", () => T.staffCodeEmail(to, { name: "Collins", code: "730415", minutes: 10 })],
  "password-code": ["Customers", () => T.passwordCodeEmail(to, { code: "482913", minutes: 15 })],
  "order-paid": ["Customers", () => T.orderUpdateEmail(to, "paid", { name: "Ada Okafor", order: delivery })],
  "order-processing": ["Customers", () => T.orderUpdateEmail(to, "processing", { name: "Ada Okafor", order: delivery })],
  "order-dispatched": ["Customers", () => T.orderUpdateEmail(to, "dispatched", { name: "Ada Okafor", order: delivery })],
  "order-ready": ["Customers", () => T.orderUpdateEmail(to, "ready_for_pickup", { name: "Ada Okafor", order: pickup })],
  "order-delivered": ["Customers", () => T.orderUpdateEmail(to, "delivered", { name: "Ada Okafor", order: delivery })],
  "order-cancelled": ["Customers", () => T.orderUpdateEmail(to, "cancelled", { name: "Ada Okafor", order: delivery })],
  "order-refunded": ["Customers", () => T.orderUpdateEmail(to, "refunded", { name: "Ada Okafor", order: delivery })],
  "offer-accepted": [
    "Customers",
    () => T.offerAcceptedEmail(to, { name: "Ada Okafor", store: "Sotechy Shop", product: "Bluetooth Speaker X3", listPrice: 45_000, agreedPrice: 39_000, hours: 12, expiresAt: inHours(12), url: "https://www.sotechy.shop" }),
  ],
  "store-notice": [
    "Customers",
    () => T.storeNoticeEmail(to, { name: "Ada Okafor", store: "Sotechy Shop", title: "Weekend sale: 15% off chargers", message: "All chargers and power banks are 15% off until Sunday night. Delivery in Benin City is free on orders over ₦50,000.", url: "https://www.sotechy.shop" }),
  ],
  "store-opened": ["Merchants", () => T.storeOpenedEmail(to, { name: "Kemi Bello", store: "Kemi Phones" })],
  "new-order": ["Merchants", () => T.newOrderEmail(to, { store: "Sotechy Shop", order: delivery, customer: "Chidi O. (@chidi)", respondBy: inHours(24) })],
  "offer-received": [
    "Merchants",
    () => T.offerReceivedEmail(to, { store: "Sotechy Shop", customer: "@amaka.n", product: "Bluetooth Speaker X3", listPrice: 45_000, offer: 38_000, message: "I'll pick it up today if you can do 38k.", url: "https://merchant.sotechy.shop/offers" }),
  ],
  "payout-sent": [
    "Merchants",
    () =>
      T.payoutSentEmail(to, {
        store: "Sotechy Shop",
        amount: 412_300,
        bank: "GTBank",
        account: "••••4821",
        reference: "PO-2026-10-0193",
        orders: [
          { number: "SOT-1038", amount: 224_100, stage: "First part, on accept" },
          { number: "SOT-1031", amount: 188_200, stage: "Balance, on delivery" },
        ],
      }),
  ],
  "id-check-passed": ["Merchants", () => T.idCheckEmail(to, { name: "Kemi Bello", store: "Kemi Phones", outcome: "approved" })],
  "id-check-retry": ["Merchants", () => T.idCheckEmail(to, { name: "Kemi Bello", store: "Kemi Phones", outcome: "resubmit" })],
  "id-check-declined": ["Merchants", () => T.idCheckEmail(to, { name: "Kemi Bello", store: "Kemi Phones", outcome: "declined" })],
  "store-verified": ["Merchants", () => T.storeVerifiedEmail(to, { name: "Kemi Bello", store: "Kemi Phones" })],
  featured: ["Merchants", () => T.featuredEmail(to, { store: "Sotechy Shop", until: inHours(24 * 30), price: 2_000 })],
};
