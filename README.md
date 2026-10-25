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
                                           └── Money Moves webhook (online payments)
```

### Rules the API enforces (from the business blueprint)

- **Server-side totals.** Prices, discounts and delivery fees are computed in `apps/api/src/services/orders.ts`, and the client only sends variant IDs and quantities.
- **No overselling.** Stock rows are locked (`SELECT … FOR UPDATE`) inside transactions. Unpaid orders *reserve* stock, payment *commits* it, and expired holds are released automatically every minute.
- **Paid only when verified.** An order becomes paid only through one of three paths:
  1. a Money Moves webhook with a valid `mm-signature` (HMAC-SHA256, at most five minutes old), after the payment is re-read from the Money Moves API. Each event is handled once;
  2. a manager confirming a bank transfer in Admin → Payments, with the reference recorded (walk-in sales);
  3. cash or POS-terminal payment confirmed at the till by staff.
  Screenshots and customer-submitted hashes never mark an order paid.
- **Idempotent.** Checkout requires an idempotency key, and payment confirmation is safe to repeat.
- **Prices captured at checkout.** Order items store the price and cost at the time of purchase.
- **Roles.** `customer` → `staff` (POS at their branch) → `manager` (stock, payment verification, products, reports) → `admin` (settings, staff, branches, audit log).
- **Audit trail** for payments, refunds, stock changes, order status changes and settings.
- **Cost prices are never returned** by storefront endpoints. Profit is shown only when cost data exists.
- **No private keys.** Only public crypto receiving addresses are stored.

## Deploying to Railway

The Railway project (**Sotechy Shop**: Postgres, `api`, `admin`) is defined in [`.railway/railway.ts`](.railway/railway.ts) using Railway's Infrastructure as Code. It sets the build and start commands, health check, watch patterns and variables for each service. Preview and apply changes from the repo root:

```bash
railway config plan     # what would change on Railway
railway config apply    # apply it
railway up --service api --detach      # upload and deploy the API
railway up --service admin --detach    # upload and deploy the admin
```

Every API deploy runs the migrations and then the seed, which only adds what's missing: payment methods, the head office, base categories, and the first admin (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`). `SEED_DEMO_PRODUCTS=true` adds a few `[DEMO]` products to test with.

Secrets aren't in the repo. They use `preserve()` in `railway.ts`, so set them once with `railway variable set NAME --stdin --service api` or in the dashboard: `JWT_SECRET`, `SEED_ADMIN_PASSWORD`, `MONEYMOVES_SECRET_KEY`, `MONEYMOVES_WEBHOOK_SECRET`, `GOOGLE_CLIENT_IDS`. Every variable is explained in [`apps/api/.env.example`](apps/api/.env.example).

**Money Moves.** In the Money Moves dashboard, create an API key (`sk_test_…` while testing) and add a webhook endpoint `https://<api-domain>/payments/webhooks/moneymoves`. Put the key and the webhook's `whsec_…` secret in the api service. Admin → Settings shows whether the connection works and the exact webhook URL. Switch to the `sk_live_…` key and the live webhook secret when you go live.

**Customer app.** Point it at the API with `EXPO_PUBLIC_API_URL=https://<api-domain>` in `apps/mobile/.env` (leave it empty for demo mode). Build Android and iOS with EAS: `cd apps/mobile && npx eas-cli@latest build`. `EXPO_PUBLIC_API_URL` is baked in at build time, or loaded live by the dev build.

## Running the shop from the admin dashboard

| Admin page | What it controls in the app |
| --- | --- |
| **App switches** | Online ordering, delivery, pickup, promo codes, reviews, dollar estimates, low-stock badges, live chat, WhatsApp ordering, sign-ups, Google sign-in, **maintenance mode** (with message) and the **announcement bar**. Each switch saves straight away; the app picks changes up within a minute. The API enforces them too. |
| **Home banners** | The Home carousel: text, colour, picture upload, what it opens (category, product, Deals or a link), order, start/end dates, show/hide. With none on, the app shows its built-in banners. |
| Products, Categories | Everything on a product page, including photo uploads, key features, what's in the box, specs and options. Categories have pictures and sub-categories. |
| Inventory, Suppliers | Stock per branch, adjustments, transfers, purchase orders |
| Orders, Payments & refunds | Order status and tracking updates; Money Moves payments are confirmed automatically by webhook |
| Promotions | Promo codes and automatic offers |
| Reviews | Hide or show customer reviews |
| Customers | Block or unblock accounts |
| Settings | Money Moves connection status, the dollar exchange rate (live from Money Moves or your own), delivery fees, support phone / email / WhatsApp, stock hold time |
| Branches, Staff & roles, Audit log, Reports | As named |

## iOS development build (testing designs and updates)

The customer app uses an Expo **development build**: your own installable app containing every native package we need, so day-to-day design changes load straight from your computer with no rebuild. Rebuild only when you add a package with native code.

One-time setup (in your own terminal: Apple asks for your Apple ID and 2-factor code):

```bash
cd apps/mobile
npx eas-cli@latest login                  # Expo account
npx eas-cli@latest device:create          # register your iPhone (open the link on the phone)
pnpm build:ios:dev                        # signs with your Apple Developer account and builds in the cloud
```

Install the build on the iPhone from the link or QR code EAS gives you (on iOS 16+, also turn on Settings → Privacy & Security → Developer Mode). Then every day:

```bash
pnpm dev:mobile                           # scan the QR code with the iPhone camera, and it opens in the Sotechy dev app
```

The phone and computer must be on the same Wi-Fi (or run `npx expo start --tunnel`). Set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` to your computer LAN IP or the Railway API URL.

**Sharing updates without a cable or rebuild:** `pnpm --filter @sotechy/mobile update:dev` publishes the current JavaScript to the `development` channel (EAS Update). Testers open it from the dev app.

Native packages already included: camera and barcode/QR scanning, image picker, location, push notifications, Face ID, haptics, clipboard, sharing and printing (receipts), file system, WebView (payment pages), network status, Reanimated and Gesture Handler, SVG, FlashList, gradients and blur, keyboard controller, localization, store review and OTA updates.

## Google sign-in

The app has "Continue with Google", and the API verifies Google's ID token before signing anyone in. To switch it on:

1. In Google Cloud Console, create OAuth client IDs: **iOS** (bundle ID `shop.sotechy.app`), **Android** (package `shop.sotechy.app` plus your signing SHA-1), and **Web**.
2. Put them in `apps/mobile/.env` (`EXPO_PUBLIC_GOOGLE_*_CLIENT_ID`) and, comma-separated, in the API's `GOOGLE_CLIENT_IDS`.
3. iOS: add the reversed iOS client ID (`com.googleusercontent.apps.XXXX`) to `scheme` in `apps/mobile/app.json`, e.g. `"scheme": ["sotechy", "com.googleusercontent.apps.XXXX"]`.
4. **Rebuild the dev app** (`pnpm --filter @sotechy/mobile build:ios:dev`). Google sign-in uses `expo-crypto`, a native module. Older builds show a friendly "needs the latest app build" message instead of crashing.

It uses `expo-auth-session`'s Google provider. Expo now recommends `@react-native-google-signin/google-signin` for native Google sign-in, so consider switching before release.

## Brand assets

Put the logo and images in `brand-assets/`, run `pnpm assets:sync`, and commit. See [brand-assets/README.md](brand-assets/README.md). The images you added to `apps/mobile/assets` were moved there.

## Still needs credentials or decisions

| Item | Status |
| --- | --- |
| **Money Moves** keys | Integration done (checkout, signed webhooks, live exchange rate). Needs `MONEYMOVES_SECRET_KEY` and `MONEYMOVES_WEBHOOK_SECRET` on the API, and the webhook endpoint registered in Money Moves. Online orders are refused until the key is set. |
| Orders over ₦1,000,000 | Money Moves takes ₦100 to ₦1,000,000 per checkout for a registered business. Bigger orders get a message asking the customer to split the order or contact the store. |
| **$MOVE discount** | It applied when customers picked crypto at checkout. Crypto is now chosen inside Money Moves, so the automatic discount doesn't apply. Decide whether to run it as a promo code or apply it once Money Moves reports the method. |
| Bank details, delivery fees, support contacts | Admin → Settings |
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
