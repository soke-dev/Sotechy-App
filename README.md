# Sotechy Shop

Hybrid electronics retail platform for Sotechy Shop: online store, physical branches, inventory, payments and admin, all in one system.

| App | Path | Stack | What it is |
| --- | --- | --- | --- |
| Customer app | `apps/mobile` | Expo SDK 58 + Expo Router | Android, iOS **and** web shop |
| Landing page | `apps/web` | Next.js 16 + Tailwind | Marketing site (sotechy.shop) |
| Admin dashboard | `apps/admin` | Next.js 16 + Tailwind | Admin, managers and store staff (POS) |
| API | `apps/api` | Hono + Drizzle ORM + Postgres | Backend on **Railway** |
| Shared | `packages/shared` | TypeScript | Types, constants, formatting, API client |
| Brand assets | `brand-assets/` | — | Logo and images → `pnpm assets:sync` |

The UI is deliberately rough. Pages and flows are in place, and the design comes later.

## Getting started

Requirements: **Node 22.13+** (`.nvmrc` says 24, so run `nvm use 24`), **pnpm 10**, and a Postgres database (local, Docker, or a Railway Postgres URL).

```bash
pnpm install

# 1. API
cp apps/api/.env.example apps/api/.env      # set DATABASE_URL, JWT_SECRET, SEED_ADMIN_*
pnpm db:migrate                             # create tables
pnpm --filter @sotechy/api db:seed -- --demo   # config, head office, categories, first admin (+ [DEMO] products)
pnpm dev:api                                # http://localhost:4000

# 2. Admin dashboard
cp apps/admin/.env.example apps/admin/.env.local
pnpm dev:admin                              # http://localhost:3001 — sign in with SEED_ADMIN_EMAIL

# 3. Customer app (press w for web, a for Android, i for iOS)
cp apps/mobile/.env.example apps/mobile/.env
pnpm dev:mobile

# 4. Landing page
cp apps/web/.env.example apps/web/.env.local
pnpm dev:web                                # http://localhost:3000
```

Leave out `--demo` when seeding production. Demo products are clearly labelled `[DEMO]` and are not real inventory.

## How it fits together

```
Expo app (Android / iOS / web) ─┐
Admin dashboard (Next.js) ──────┼──► API (Hono, Railway) ──► Postgres (Railway)
Landing page (Next.js) ─────────┘         ▲
                                           └── Paystack webhook (card payments)
```

### Rules the API enforces (from the business blueprint)

- **Server-side totals.** Prices, discounts and delivery fees are computed in `apps/api/src/services/orders.ts`, and the client only sends variant IDs and quantities.
- **No overselling.** Stock rows are locked (`SELECT … FOR UPDATE`) inside transactions. Unpaid orders *reserve* stock, payment *commits* it, and expired holds are released automatically every minute.
- **Paid only when verified.** An order becomes paid only through one of three paths:
  1. a signed Paystack webhook, re-checked against the Paystack API;
  2. a manager confirming a bank transfer or crypto transfer in Admin → Orders, with the reference recorded;
  3. cash or POS-terminal payment confirmed at the till by staff.
  Screenshots and customer-submitted hashes never mark an order paid.
- **Idempotent.** Checkout requires an idempotency key, and payment confirmation is safe to repeat.
- **Prices captured at checkout.** Order items store the price and cost at the time of purchase.
- **Roles.** `customer` → `staff` (POS at their branch) → `manager` (stock, payment verification, products, reports) → `admin` (settings, staff, branches, audit log).
- **Audit trail** for payments, refunds, stock changes, order status changes and settings.
- **Cost prices are never returned** by storefront endpoints. Profit is shown only when cost data exists.
- **No private keys.** Only public crypto receiving addresses are stored.

## Deploying to Railway

Create one Railway project, then add a **Postgres** service and these services from this repo. Keep the root directory at the repo root, because pnpm workspaces need it, and set each service's *config file path*:

| Service | Config file | Variables |
| --- | --- | --- |
| api | `apps/api/railway.json` | `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `JWT_SECRET`, `CORS_ORIGINS`, `PAYSTACK_*` |
| admin | `apps/admin/railway.json` | `API_URL` (the API's URL) |
| web | `apps/web/railway.json` | `NEXT_PUBLIC_SHOP_URL` |

The API runs migrations as its pre-deploy step. Seed once with `railway run --service api pnpm --filter @sotechy/api db:seed` (with `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` set).

**Customer app.** Build Android and iOS with EAS: `cd apps/mobile && npx eas-cli@latest build`. Deploy the web version with `npx expo export -p web`, then host `dist/` (EAS Hosting via `eas deploy`, or any static host). `EXPO_PUBLIC_API_URL` is baked in at build time.

## Brand assets

Put the logo and images in `brand-assets/`, run `pnpm assets:sync`, and commit. See [brand-assets/README.md](brand-assets/README.md). The images you added to `apps/mobile/assets` were moved there.

## Still needs credentials or implementation

| Item | Status |
| --- | --- |
| **Paystack** (card / online bank) | Implemented. Needs `PAYSTACK_SECRET_KEY` and the webhook URL `https://<api>/payments/webhooks/paystack` in the Paystack dashboard. Then enable "Card" in Admin → Settings. |
| **Crypto / $MOVE verification** | **Not implemented.** `POST /payments/crypto/verify` returns 501. Integrate Sotechy's crypto payment provider or a Movement chain verifier in `apps/api/src/routes/payments.ts`, then enable Crypto and the MOVE asset. Until then, in-store crypto can be verified manually by a manager. |
| **$MOVE discount** | The promotion exists but is **off**. Turn it on, and set the cap, dates and limits, in Admin → Promotions. |
| Bank account details, delivery fees, support contacts | Admin → Settings |
| Second branch address | Admin → Branches |
| Product image uploads | Image URLs for now. Add object storage (e.g. Railway bucket or S3) later. |
| Notifications (email / SMS / push) | Not started |
| Policies (delivery, returns, warranty, privacy) | Placeholder text in `apps/web/src/app/policies` |
| App icons and store listings | Expo default icons in `brand-assets/app-icon/` |

## Roadmap

1. **Core store.** Catalogue, cart, checkout, orders, bank payments, admin products and orders. *(scaffolded)*
2. **Store operations.** Branch inventory, walk-in sales, stock adjustments and transfers, suppliers, reports, staff roles, audit log. *(scaffolded)*
3. **Crypto payments.** Verified MOVE payments, discount, reconciliation, crypto reporting.
4. **Marketplace.** Merchant onboarding, listings, commissions and payouts. The `merchants` table and `products.merchant_id` already exist, and onboarding is off.

## Useful commands

```bash
pnpm typecheck                         # all packages
pnpm --filter @sotechy/api db:generate # after editing apps/api/src/db/schema.ts
pnpm --filter @sotechy/api db:studio   # browse the database
pnpm assets:sync                       # copy brand-assets into the apps
```
