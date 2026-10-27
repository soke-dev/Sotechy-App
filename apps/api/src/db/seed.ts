// Seeds required configuration, the head-office branch, base categories and the first admin.
// Safe to run on every deploy: existing rows are kept. Add [DEMO] products with --demo or SEED_DEMO_PRODUCTS=true.
import bcrypt from "bcryptjs";
import { db, pool } from "./client";
import * as s from "./schema";

// Demo products: `--demo`, or SEED_DEMO_PRODUCTS=true on a test deployment (they are marked [DEMO]).
const withDemo = process.argv.includes("--demo") || process.env.SEED_DEMO_PRODUCTS === "true";

await db
  .insert(s.paymentMethods)
  .values([
    // The app pays through Money Moves (bank transfer, crypto or the Money Moves app on their page).
    { code: "online", label: "Money Moves", isEnabled: true, online: true, inStore: false, instructions: "Pay securely with Money Moves: bank transfer, crypto or the Money Moves app." },
    // Walk-in sales at the POS
    { code: "bank_transfer", label: "Bank transfer", isEnabled: true, online: false, inStore: true, instructions: "Transfer the exact order total and use your order number as the narration." },
    { code: "crypto", label: "Crypto (manual)", isEnabled: false, online: false, inStore: true, instructions: "Customers paying online use crypto inside Money Moves." },
    { code: "cash", label: "Cash", isEnabled: true, online: false, inStore: true },
    { code: "pos_terminal", label: "POS terminal", isEnabled: true, online: false, inStore: true },
  ])
  .onConflictDoNothing();

await db.insert(s.cryptoAssets).values({ symbol: "MOVE", name: "Movement", network: "Movement" }).onConflictDoNothing();

const existingPromos = await db.select({ id: s.promotions.id }).from(s.promotions).limit(1);
if (existingPromos.length === 0) {
  await db.insert(s.promotions).values({
    name: "Pay with $MOVE — up to 10% off",
    discountType: "percentage",
    value: 10,
    paymentMethod: "crypto",
    cryptoAsset: "MOVE",
    isActive: false,
  });
}

await db
  .insert(s.appSettings)
  .values([
    { key: "delivery", value: { flatFee: 0, freeOver: null, note: "Configure delivery policy in Admin → Settings" } },
    { key: "reservation_hold", value: { minutes: 30 } },
    { key: "bank_transfer", value: { bankName: null, accountName: null, accountNumber: null } },
    { key: "support", value: { phone: null, email: null, whatsapp: null } },
  ])
  .onConflictDoNothing();

const [headOffice] = await db
  .insert(s.branches)
  .values({
    name: "Head Office — Etete Road",
    code: "BEN-01",
    address: "No. 20 Etete Road",
    city: "Benin City",
    state: "Edo",
  })
  .onConflictDoNothing()
  .returning();

const categoryRows = [
  { name: "Phones & Accessories", slug: "phones-accessories", sortOrder: 1 },
  { name: "Computers & Gadgets", slug: "computers-gadgets", sortOrder: 2 },
  { name: "Home Appliances", slug: "home-appliances", sortOrder: 3 },
  { name: "TV & Audio", slug: "tv-audio", sortOrder: 4 },
];
await db.insert(s.categories).values(categoryRows).onConflictDoNothing();

const adminEmail = process.env.SEED_ADMIN_EMAIL;
const adminPassword = process.env.SEED_ADMIN_PASSWORD;
if (adminEmail && adminPassword) {
  await db
    .insert(s.users)
    .values({
      email: adminEmail.toLowerCase(),
      passwordHash: await bcrypt.hash(adminPassword, 12),
      fullName: "Sotechy Admin",
      role: "admin",
    })
    // An existing account with this email is made an admin (its password is left as it is)
    .onConflictDoUpdate({ target: s.users.email, set: { role: "admin", isActive: true } });
  console.log(`Admin account: ${adminEmail}`);
}

if (withDemo) {
  const branchList = await db.select().from(s.branches);
  const cats = await db.select().from(s.categories);
  const catId = (slug: string) => cats.find((c) => c.slug === slug)?.id ?? null;

  const demo = [
    { name: "[DEMO] Android Smartphone 128GB", cat: "phones-accessories", price: 250000, featured: true, variants: ["128GB / Black", "128GB / Blue"] },
    { name: "[DEMO] Fast Charger 25W", cat: "phones-accessories", price: 12000 },
    { name: "[DEMO] 14\" Laptop 8GB/256GB", cat: "computers-gadgets", price: 620000, featured: true },
    { name: "[DEMO] Power Bank 20000mAh", cat: "computers-gadgets", price: 28000, featured: true },
    { name: "[DEMO] Electric Kettle 1.7L", cat: "home-appliances", price: 21000 },
    { name: "[DEMO] 43\" Smart TV", cat: "tv-audio", price: 390000, featured: true },
    { name: "[DEMO] Bluetooth Speaker", cat: "tv-audio", price: 35000 },
  ];

  for (const [i, d] of demo.entries()) {
    const slug = `demo-product-${i + 1}`;
    const [product] = await db
      .insert(s.products)
      .values({
        name: d.name,
        slug,
        brand: "Demo Brand",
        model: `DM-${i + 1}`,
        categoryId: catId(d.cat),
        description: "Placeholder product for development. Replace with real Sotechy inventory.",
        specifications: { Note: "Demo specification" },
        warrantyMonths: 6,
        isPublished: true,
        isFeatured: !!d.featured,
        isDemo: true,
      })
      .onConflictDoNothing()
      .returning();
    if (!product) continue;

    for (const [vi, vname] of (d.variants ?? ["Standard"]).entries()) {
      const [variant] = await db
        .insert(s.productVariants)
        .values({ productId: product.id, sku: `DEMO-${i + 1}-${vi + 1}`, name: vname, price: d.price })
        .returning();
      await db.insert(s.inventory).values(
        branchList.map((b, bi) => ({ variantId: variant.id, branchId: b.id, quantity: bi === 0 ? 8 : 3 })),
      );
    }
  }
  console.log("Demo products inserted");
}

console.log(headOffice ? "Seeded fresh database" : "Seed complete (existing rows kept)");
await pool.end();
