<div align="center">
  <img src="apps/admin/public/brand/sotechy-icon-512.png" alt="Sotechy" width="80" />
  <h1>Sotechy × NEAR</h1>
  <p><strong>The tokenized marketplace of verified stores, powered by NEAR.</strong></p>
  <p>
    <a href="https://sotechy.shop">sotechy.shop</a> ·
    <a href="https://merchant.sotechy.shop">merchant.sotechy.shop</a> ·
    Live on the App Store and the web (Android coming soon)
  </p>
</div>

---

This branch is our NEAR Hackathon submission (tracks: **Real-World Money** and **NFTs That Do Something**).

**The problem.** Online shopping in Nigeria runs on low trust: fake sellers, and orders that never arrive. And loyalty points are locked inside each platform, so they're worth little to shoppers or to stores.

**What we built.** Sotechy is a tokenized marketplace of verified stores, live in production with real stores and orders. Every store is checked before it can sell. Each gets its own storefront and its own reward token, and every order gets a receipt shoppers can trust.

**How NEAR fits in.** NEAR runs Sotechy's rewards, its receipts and its crypto checkout.

1. **Store tokens (NEP-245).** One Rust contract on mainnet, [`contract.sotechy.near`](https://nearblocks.io/address/contract.sotechy.near), holds every store's token, one token ID per store. Every token a shopper earns, sends to a friend by username, or spends in the app is written to NEAR.
2. **Receipts that do something (soulbound, dynamic NEP-171).** Every order mints a receipt NFT. Its status only moves forward (paid, on its way, delivered), and the contract redraws its picture from that status. It holds no amounts or personal data, yet anyone holding the full receipt can verify it on chain.
3. **Pay with any coin through NEAR Intents.** Checkout uses 1Click exact-output quotes, so shoppers can pay with 45 coins on 22 networks, and the order's total arrives in USDC. Our server spots the deposit on the shopper's chain (Solana, Tron, BNB Chain, Base, Ethereum) and hands it to 1Click straight away.
4. **No crypto setup.** Each shopper's wallet address is also their NEAR account (an eth-implicit account), and Sotechy pays the gas.

All of this is wired into Sotechy's production API and app. This repo has the contract with tests, deploy scripts, and a demo that reads the live mainnet contract with no keys.

## Verify it in two minutes (no database, no keys)

```bash
cd near/demo
npm install
npm start
```

This reads the live mainnet contract, `contract.sotechy.near`, with nothing to sign: every store token and its supply, the latest real order's receipt with its status-drawn picture, a fingerprint check that passes with the right fingerprint and fails with a wrong one, and that customer's token balances. It then asks NEAR Intents' 1Click API, as a dry run, what a customer would send in SOL for Sotechy to receive 10 USDC. `NETWORK=testnet npm start` reads the testnet copy, which has a full example order.

The contract's tests and build (Rust stable with the `wasm32-unknown-unknown` target, and [cargo-near](https://github.com/near/cargo-near)):

```bash
cd near
cargo test                                                        # 15 tests: store tokens and receipts
cd contracts/sotechy && cargo near build non-reproducible-wasm   # about 274 KB
```

The API, with the NEAR code in it, typechecks from a fresh clone (Node 22.13+ and pnpm 10):

```bash
pnpm install && pnpm --filter @sotechy/api typecheck
```

To see it working end to end with real money, use the live app: pay for an order with "Pay with crypto", then open the order's receipt and your tokens in the Wallet, each with a link to view it on chain.

## Baseline and hackathon work (please read)

| Tag or branch | What it is |
|---|---|
| [`pre-hackathon`](../../tree/pre-hackathon) | This repo's first commit, `4bbbaa4` (25 Oct 2026). It brought in about 10,850 lines written before the hackathon: the API basics, the admin dashboard, the customer app shell and the landing page. **Baseline: already-done work.** |
| [`hackathon-submission`](../../tree/hackathon-submission) | The code as submitted. |
| [`near-hackathon`](../../tree/near-hackathon) | This branch: the submission, with this README. Every commit made during the hackathon is on it, with its message. |

**Everything to assess is the difference between the baseline and the submission:** [compare `pre-hackathon...hackathon-submission`](../../compare/pre-hackathon...hackathon-submission), or `git log pre-hackathon..hackathon-submission` for each commit.

Disclosed prior work:
- **Sotechy Shop** has been an electronics store in Nigeria since 2022. Its old website was a separate codebase and isn't in this repo.
- The baseline commit above.

Built during the hackathon (every commit after `4bbbaa4`, from 25 Oct 2026):
- the marketplace: store verification, storefronts, payouts, offers, promotions and walk-in sales
- the merchant dashboard
- store tokens, sending them to friends, and the reserve
- everything in [`near/`](near), writing tokens and receipts to NEAR, and the NEAR Intents checkout (listed below)

## Where the NEAR work is

To see each piece, open these files.

### The contract ([`near/`](near))

| To see | Open |
|---|---|
| Owner, operator and pause; one contract for both jobs, which halves the NEAR locked for storage | [`near/contracts/sotechy/src/lib.rs`](near/contracts/sotechy/src/lib.rs) |
| Store tokens (NEP-245): one token id per store, mint / burn / move from the operator only, mints capped per change and per day, the queue number (`seq`) that makes a resent batch apply once, NEP-245 events | [`near/contracts/sotechy/src/tokens.rs`](near/contracts/sotechy/src/tokens.rs) |
| Receipts (soulbound NEP-171, NEP-177 metadata, NEP-181 enumeration): status that only moves forward, the SVG picture drawn from the status, `verify` | [`near/contracts/sotechy/src/receipts.rs`](near/contracts/sotechy/src/receipts.rs) |
| Deploy and smoke-test scripts for testnet and mainnet | [`near/scripts/`](near/scripts) |
| The keyless demo | [`near/demo/demo.mjs`](near/demo/demo.mjs) |
| More detail on the contract | [`near/README.md`](near/README.md) |

### Sotechy's API and apps

| To see | Open |
|---|---|
| Writing every token change and receipt step to NEAR: batches in order, retries, gas per batch, FastNEAR with NEAR's RPC as a fallback | [`apps/api/src/services/near.ts`](apps/api/src/services/near.ts) |
| Receipt steps queued from order changes (paid, shipped, delivered, refunded), and the database columns for them | [`apps/api/src/services/orders.ts`](apps/api/src/services/orders.ts), [`apps/api/drizzle/0043_near_mirror.sql`](apps/api/drizzle/0043_near_mirror.sql) |
| Sending tokens to a friend by @username, recorded on NEAR as a transfer | [`apps/api/src/services/tokens.ts`](apps/api/src/services/tokens.ts) (`sendTokens`), [`apps/mobile/src/app/wallet.tsx`](apps/mobile/src/app/wallet.tsx) |
| The NEAR Intents 1Click client: coins and networks offered, exact output quotes, status, deposit submit, plain-words minimums | [`apps/api/src/services/intents.ts`](apps/api/src/services/intents.ts) |
| Spotting the customer's payment on Solana, Tron, BNB Chain, Base or Ethereum and handing it to 1Click straight away | [`apps/api/src/services/deposit-watch.ts`](apps/api/src/services/deposit-watch.ts) |
| The checkout endpoints (`/payments/intents/assets`, `initialize`, `status`, `submit`) | [`apps/api/src/routes/payments.ts`](apps/api/src/routes/payments.ts) |
| The app's pay-with-crypto screen: network and coin pickers with logos and search, the exact amount, the deposit address, progress until the order is paid | [`apps/mobile/src/components/intents-pay.tsx`](apps/mobile/src/components/intents-pay.tsx) |
| What Sotechy's team sees: the operator's gas, changes waiting to be written, the contract; the switch for crypto checkout | [`apps/admin/src/app/(dashboard)/tokens/chain-card.tsx`](apps/admin/src/app/(dashboard)/tokens/chain-card.tsx), [`apps/admin/src/app/(dashboard)/settings/page.tsx`](apps/admin/src/app/(dashboard)/settings/page.tsx) |

## How it works

```
Shopper pays with any coin
  → API asks 1Click for an EXACT_OUTPUT quote: the order's total in USDC on Base,
      refunds to the shopper's own address
  → shopper sends the exact amount to the one-off deposit address
  → API spots it on the shopper's chain and hands the transaction to 1Click
  → 1Click reports SUCCESS: the order is paid

Order paid, shipped, delivered; tokens earned, sent, spent
  → each change joins the API's ledger queue, with a queue number
  → the worker in near.ts writes the changes to contract.sotechy.near in order (Sotechy pays the gas)
  → the contract mints, moves or burns store tokens, and issues or moves the order's receipt;
     a change it has already applied is skipped
  → the shopper's wallet shows the tokens and the receipt
```

## Run it locally

You need Node 22.13+, pnpm 10 and PostgreSQL.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env      # DATABASE_URL, JWT_SECRET, SEED_ADMIN_*, and the NEAR settings below
pnpm db:migrate
pnpm --filter @sotechy/api db:seed -- --demo
pnpm dev:api                                # http://localhost:4000
pnpm dev:mobile                             # the app (press w for web)
```

`pnpm dev:local` runs the API with a built-in database instead, no installs needed. The other apps and every setting are in [`docs/PRODUCT.md`](docs/PRODUCT.md).

NEAR is off until the operator is set: `NEAR_NETWORK`, `NEAR_OPERATOR_ACCOUNT`, `NEAR_OPERATOR_KEY` and `NEAR_CONTRACT` in the API (deploy your own testnet copy with [`near/scripts/testnet-setup.sh`](near/scripts/testnet-setup.sh)). Crypto checkout needs `INTENTS_RECIPIENT` (the Base address that receives the USDC); `ONECLICK_JWT` and `ALCHEMY_API_KEY` are optional. Each is explained in [`apps/api/.env.example`](apps/api/.env.example).

## Deployments

| | Mainnet | Testnet |
|---|---|---|
| Contract (store tokens and receipts) | [`contract.sotechy.near`](https://nearblocks.io/address/contract.sotechy.near) | [`contract.sotechy-shop.testnet`](https://testnet.nearblocks.io/address/contract.sotechy-shop.testnet) |
| Operator (Sotechy's API) | `api.sotechy.near` | `api.sotechy-shop.testnet` |
| Owner | `sotechy.near` | `sotechy-shop.testnet` |

## Built with

- **NEAR**: near-sdk-rs 5 (NEP-245, NEP-171, NEP-177, NEP-181), near-api-js, FastNEAR RPC, and **NEAR Intents** (the 1Click API)
- TypeScript, Hono, Drizzle ORM, PostgreSQL, on Railway
- Expo and React Native (app), Next.js and Tailwind (merchant and admin dashboards, web)
- viem (Base, Ethereum, BNB Chain), Solana and Tron RPCs for spotting payments
- Money Moves and Nomba (naira payments), Bachs and Flutterwave (payouts to stores)

More about the product and the rest of the repo: [`docs/PRODUCT.md`](docs/PRODUCT.md).

## Other submission by the same builder

This builder is also submitting **Money Moves × NEAR Intents**, a separate, independent project with its own code: [github.com/soke-dev/money-moves-near](https://github.com/soke-dev/money-moves-near). The two share no code and should be judged independently.

## Team

Sotechy is built by the team behind Sotechy Shop in Nigeria. Contact: hello@sotechy.shop · [@sotechyshop](https://x.com/sotechyshop)

## License

The NEAR contract, scripts and demo in [`near/`](near) are MIT, see [`near/LICENSE`](near/LICENSE).
