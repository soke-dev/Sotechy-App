# Sotechy

Sotechy is a multi-store marketplace. Verified stores sell through the Sotechy app, each with its own storefront and its own reward token, and Sotechy itself is one of those stores (its own electronics catalogue, branches and the **$SOTECHY** token). Sotechy collects every payment, pays stores out, checks every store before it goes live, and runs support.

| App | Path | Stack | Who uses it |
| --- | --- | --- | --- |
| Customer app | `apps/mobile` | Expo SDK 58 + Expo Router | Shoppers: Android, iOS **and** web |
| Merchant dashboard | `apps/merchant` | Next.js 16 + Tailwind | Stores: setup and verification, products, orders, delivery and pickup, payouts, token, promotions, walk-in sales, team |
| Admin dashboard | `apps/admin` | Next.js 16 + Tailwind | Sotechy: store review, payouts, orders, banners, support, tokens, settings; plus Sotechy's own catalogue, branches and POS |
| Landing page | `apps/web` | Next.js 16 + Tailwind | Marketing site (sotechy.shop) |
| API | `apps/api` | Hono + Drizzle ORM + Postgres | Backend for all of the above, on **Railway** |
| Shared | `packages/shared` | TypeScript | Types, money and token rules, categories, API client |
| Brand assets | `brand-assets/` | — | Logo and images → `pnpm assets:sync` |

How tokens, the reserve and payouts work is in [docs/tokens/README.md](docs/tokens/README.md).

## What the marketplace does

- **Stores and verification.** A store signs up in the merchant dashboard, sets up its business (CAC details or as an individual), passes an ID and selfie check (Didit), adds a payout account and names its token. Admin approves it, asks for changes, or declines it, with a note the owner sees.
- **Products and categories.** Stores list products under the shared departments in `packages/shared/src/market-categories.ts` (the app's menu browses the same tree). Sotechy's own catalogue uses its own categories alongside.
- **Delivery and pickup.** Each store sets delivery areas with home delivery prices, and up to 5 pickup points per area (each with an optional price of its own and a Google Maps link). New areas and pickup changes wait for admin approval.
- **Cart and checkout.** One cart can hold several stores; each store checks out on its own. Customers pay through Money Moves, with stablecoin or by bank transfer (a direct checkout to the business account, turned on by `MONEYMOVES_DIRECT_KEY`), and can put store tokens towards an order.
- **Orders.** The store accepts, sends it (with tracking and the driver's phone for pickup), and marks it collected or delivered after ticking what it checked. The customer confirms they got it, or says it didn't arrive and Sotechy follows up.
- **Payouts.** Each order pays the store in two parts: the first when it accepts, the rest when the customer confirms delivery. Admin pays them by hand for now and marks them paid; the store is emailed.
- **Store tokens.** Customers earn the store's token on every order (plus $SOTECHY), held until it's paid and released on delivery. Tokens live on Monad; every delivered order also gets a receipt fingerprint recorded on-chain.
- **Selling tools.** Price offers, store promo codes, paid featuring and banners, walk-in sales that still earn customers tokens, reviews, followers and store news.
- **Talking to people.** Push notifications and an in-app notifications list, email (Resend), WhatsApp links, and live chat with Sotechy's team in the app.

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

# 3. Merchant dashboard
cp apps/merchant/.env.example apps/merchant/.env.local
pnpm dev:merchant                           # http://localhost:3002 — open a test store

# 4. Customer app (press w for web, a for Android, i for iOS)
cp apps/mobile/.env.example apps/mobile/.env
pnpm dev:mobile

# 5. Landing page
cp apps/web/.env.example apps/web/.env.local
pnpm dev:web                                # http://localhost:3000
```

Leave out `--demo` when seeding production. Demo products are clearly labelled `[DEMO]` and are not real inventory.

### Test everything locally (no Railway, no installs)

```bash
pnpm dev:local     # API + built-in Postgres + local Money Moves test page, on your Wi-Fi address
pnpm dev:admin     # admin at http://localhost:3001 (admin@local.test / password123)
pnpm dev:merchant  # merchant dashboard at http://localhost:3002
pnpm dev:mobile    # app; set EXPO_PUBLIC_API_URL in apps/mobile/.env to the address dev:local prints
```

`dev:local` keeps its data in `apps/api/.local-db` (delete the folder to start fresh) and adds demo products. Payments go through a local stand-in for Money Moves: a test page where you choose bank transfer, crypto or the app (or simulate an underpayment), which then sends a signed webhook and returns you to the app. No real money moves.

## How it fits together

```
Customer app (Expo) ────────┐
Merchant dashboard (Next.js) ┼──► API (Hono, Railway) ──► Postgres (Railway)
Admin dashboard (Next.js) ───┤        │  ▲
Landing page (Next.js) ──────┘        │  └── Money Moves webhook (payments)
                                      ├──► Monad (store tokens, receipt fingerprints)
                                      ├──► Resend (email), Expo push
                                      └──► Didit (store owners' ID checks)
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
- **Roles.** `customer` → `staff` (POS at their branch) → `manager` (stock, payment verification, products, reports) → `admin` (settings, staff, branches, stores, payouts, audit log). A store has its own team roles (owner and invited staff) in the merchant dashboard.
- **One store per order.** Each order comes from one seller, and the store's delivery or pickup price is worked out on the server from its approved areas and the pickup point chosen.
- **Stores sell once verified.** Products, orders and payouts need a store Sotechy has approved; a store waiting for review can look around but not sell.
- **Audit trail** for payments, refunds, stock changes, order status changes and settings.
- **Cost prices are never returned** by storefront endpoints. Profit is shown only when cost data exists.
- **No private keys.** Only public crypto receiving addresses are stored.

## Deploying to Railway

Railway deploys from GitHub: **pushing to `main` deploys** the `api`, `admin` and `merchant` services (and the landing page). Each API deploy runs the database migrations first (`pnpm --filter @sotechy/api db:migrate:prod`, the pre-deploy command), then starts the API. To keep deploys down, give each service Watch Paths so it only rebuilds for its own code (for example `/apps/api/**` and `/packages/**` for the API).

The service setup is also described in [`.railway/railway.ts`](.railway/railway.ts). Secrets aren't in the repo: set them in each service's Variables. Every API variable is explained in [`apps/api/.env.example`](apps/api/.env.example).

**Money Moves.** In the Money Moves dashboard, create an API key and add a webhook endpoint `https://<api-domain>/payments/webhooks/moneymoves`. Put the key and the webhook's `whsec_…` secret in the api service. Admin → Settings shows whether the connection works and the exact webhook URL.

**Chain keys.** The keys that send token and receipt transactions on Monad stay out of the repo. The contract owner key is kept off Railway entirely and only used locally when needed.

**Customer app.** Point it at the API with `EXPO_PUBLIC_API_URL=https://<api-domain>` in `apps/mobile/.env`. Build Android and iOS with EAS: `cd apps/mobile && npx eas-cli@latest build`.

## Running Sotechy from the admin dashboard

| Admin page | What it controls |
| --- | --- |
| **Merchants** | Review stores (ID check result, business details, payout account), then approve, ask for changes or decline. Suspend or reinstate live stores. |
| **Delivery areas** | Approve or decline stores' delivery areas and pickup points |
| **Merchant payouts** | Each store's first and final payments: pay by hand and mark paid, hold or release, paybacks for cancelled orders, payout plans |
| **Featured stores**, **Banners** | Paid featuring and Home banners (built-in, Sotechy's own, and stores') |
| **Order reviews** | Orders that need Sotechy: "didn't get it", pickup location changes, paybacks |
| **Support** | Live chat with customers, with photos |
| **Tokens** | Store tokens, $SOTECHY, the reserve and recycling pool, and on-chain status |
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
| **Bank transfer at checkout** | Shown as "Coming soon". Planned with Nomba (a virtual account per order), waiting for the Nomba keys. |
| **Automatic payouts** | Payouts are paid by hand from admin for now; the Bachs integration is in place but not used. |
| Orders over ₦1,000,000 | Money Moves takes ₦100 to ₦1,000,000 per checkout. Bigger orders are asked to split the order or contact the store. |
| Policies (delivery, returns, warranty, privacy) | Placeholder text in `apps/web/src/app/policies` |
| App icons and store listings | Expo default icons in `brand-assets/app-icon/` |

## Useful commands

```bash
pnpm typecheck                         # all packages
pnpm --filter @sotechy/api db:generate # after editing apps/api/src/db/schema.ts
pnpm --filter @sotechy/api db:studio   # browse the database
pnpm assets:sync                       # copy brand-assets into the apps
pnpm dev:local                         # API + database + payment test page, all on your computer
```
