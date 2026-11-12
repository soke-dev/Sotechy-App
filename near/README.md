# Sotechy on NEAR

Sotechy is a live, tokenized marketplace of verified stores: on the App Store and the web at [sotechy.shop](https://sotechy.shop) (Android coming soon), with a merchant dashboard for stores. Every store has its own reward token: customers earn it on every order, can send it to a friend in the app, and spend it at that store.

This folder is what we built for the NEAR Hackathon to bring Sotechy to NEAR. One contract does both on-chain jobs:

1. **Store tokens on NEAR (NEP-245).** One multi-token contract holds every store's token, one id per store.
2. **Receipts that move with the order (NEP-171).** Every order gets a soulbound receipt NFT. Its status and its picture change as the order goes from paid to on its way to delivered.
3. **Pay with any coin through NEAR Intents.** A customer pays from BTC, ETH, SOL, NEAR, or USDC/USDT on many chains, and Sotechy receives the order's exact total in USDC.

These are wired into Sotechy's production API and app, in this same repo (see [In Sotechy's app](#in-sotechys-app)).

**Tracks:** Real-World Money (stablecoins, NEAR Intents, meta transactions) and NFTs That Do Something (dynamic NEP-171).

## Try it in one minute

You need Node 18 or later. No keys or wallet are required.

```sh
cd demo
npm install
npm start
```

It reads the live mainnet contract, `contract.sotechy.near` (`NETWORK=testnet npm start` reads the testnet copy):
- every store token and its supply
- the latest real order's receipt, with its status-drawn picture
- a fingerprint check that passes with the right fingerprint and fails with a wrong one
- that customer's token balances

It also gets a live NEAR Intents quote for paying an order in SOL. If a public RPC is busy, it falls back to another one. The output looks like this (the numbers grow as orders come in):

```
Sotechy on NEAR mainnet: contract.sotechy.near

Store tokens (NEP-245)
  4 store tokens, one token id per store
  token 1: $SOTECHY, supply 1,500
  token 2: $STAND, supply 0
  ...
Receipts (soulbound NEP-171)
  6 receipts issued
  latest: order SOT-1037 at Sotechy Shop, delivered, issued 2026-11-08, updated 2026-11-08
  owned by 0x6e57…42e9; on chain: only the store, order number, dates and a fingerprint
  NFT: "Sotechy receipt #SOT-1037": Order SOT-1037 at Sotechy Shop: Delivered
  verify(right fingerprint): true
  verify(wrong fingerprint): false

That customer's tokens (0x6e57…42e9)
  1,500 $SOTECHY

NEAR Intents checkout: what a customer would send in SOL for an order of about 10 USDC
  send 0.1222 SOL → Sotechy receives 10.0 USDC on Base, in about 22s
```

## Deployments

| | Testnet | Mainnet |
|---|---|---|
| Contract (store tokens and receipts) | [`contract.sotechy-shop.testnet`](https://testnet.nearblocks.io/address/contract.sotechy-shop.testnet) | [`contract.sotechy.near`](https://nearblocks.io/address/contract.sotechy.near) |
| Operator (Sotechy's API) | `api.sotechy-shop.testnet` | `api.sotechy.near` |
| Owner | `sotechy-shop.testnet` | `sotechy.near` |

## How it works

```
 Customer pays ──► NEAR Intents (1Click) ──► USDC on Base to Sotechy ──► order confirmed
                                                                            │
 Sotechy API ledger ── queue ──► NEAR mirror worker ──► Sotechy contract: store tokens (mt_mint / mt_burn / mt_transfer)
                                                                         receipts     (nft_mint, status_update)
```

Both live in one contract, [`contracts/sotechy`](contracts/sotechy). It has one owner who sets the rules and one operator (Sotechy's API) who writes. Keeping them together halves the NEAR locked for storage.

### 1. Store tokens: `src/tokens.rs` (NEP-245)

**Rules**
- One contract holds every store's token, and each store has its own token id. `"1"` is $SOTECHY, which customers earn as a bonus when they buy from other stores.
- Shoppers send tokens to each other in the app, by @username ([`apps/api/src/services/tokens.ts`](../apps/api/src/services/tokens.ts), `sendTokens`). Each send reaches the contract as a `move` and is logged as a standard `mt_transfer` event.
- Every change goes through Sotechy's operator account and carries the order or send it belongs to as its `memo`. Direct wallet-to-wallet calls (NEP-245's `mt_transfer` and the other transfer calls) are refused, so the app and the chain always agree, and a store's token isn't sold on outside Sotechy.

**Safety**
- Mints are capped per operation and per day. A leaked operator key can only do limited harm before the owner pauses the contract (`set_paused`) and swaps the operator (`set_operator`).
- Batched changes carry the API's queue number (`seq`). The contract skips anything at or below the last number it applied, so a batch resent after a lost reply can't mint twice.

**Standard events**
- It emits NEP-245 events (`mt_mint`, `mt_burn`, `mt_transfer`), so explorers and indexers can read it.

### 2. Receipts: `src/receipts.rs` (soulbound, dynamic NEP-171)

- **Issued when paid.** A receipt is issued as soon as an order is paid. `set_status` then moves it forward only: `paid → shipped → delivered`, or to `refunded`.
- **Status-drawn picture.** `nft_token` returns NEP-177 metadata whose `media` is an SVG drawn from the current status. A progress bar fills as the order moves, so the receipt in the customer's wallet changes with their order.
- **Private by design.** The chain holds only the store, the order number, the dates and a keccak256 fingerprint of the full receipt. There are no amounts and no personal details.
- **Verifiable.** Anyone holding the full receipt can check it with `verify`.
- **Soulbound.** `nft_transfer` refuses, and there's one receipt per order. Its token id is the order number.
- **Standard reads.** It implements NEP-171 views and NEP-181 enumeration (`nft_tokens_for_owner` and the rest).

### 3. Customers are NEAR accounts with no crypto setup

**Accounts**
- Every Sotechy account gets a wallet address at sign-up. NEAR accepts that `0x…` address as an account name (an eth-implicit account), so the same customer is the same account on NEAR and on Base.
- Sotechy's operator pays all the gas.

**Paying with Intents ([`apps/api/src/services/intents.ts`](../apps/api/src/services/intents.ts))**
1. The customer picks a coin and gives an address for refunds.
2. The API asks 1Click for an `EXACT_OUTPUT` quote: the order's naira total, at the live rate, in USDC on Base. It returns a one-off deposit address.
3. The app shows exactly what to send, then follows the swap.
4. The API watches the deposit address on the customer's chain (Solana, Tron, BNB Chain, Base and Ethereum, in [`deposit-watch.ts`](../apps/api/src/services/deposit-watch.ts)) and hands the transaction to 1Click the moment it lands, so the swap starts at once.
5. When 1Click reports `SUCCESS`, the payment and the order are confirmed. A background watcher catches customers who close the app.
6. If the swap can't happen, 1Click returns the coins to the customer's refund address. Nothing is held in between.

### In Sotechy's app

| File | What it does |
|---|---|
| [`apps/api/src/services/near.ts`](../apps/api/src/services/near.ts) | The API worker that writes every ledger change and receipt to NEAR, in order, with retries. It opens receipts on payment and moves them as orders ship and deliver. |
| [`apps/api/src/services/intents.ts`](../apps/api/src/services/intents.ts), routes in [`apps/api/src/routes/payments.ts`](../apps/api/src/routes/payments.ts) (`/payments/intents/*`) | The 1Click client: coins on offer, quotes, status checks, and confirming orders. |
| [`apps/api/src/services/deposit-watch.ts`](../apps/api/src/services/deposit-watch.ts) | Spots the customer's payment on Solana, Tron, BNB Chain, Base or Ethereum and hands it to 1Click straight away. |
| [`apps/mobile/src/components/intents-pay.tsx`](../apps/mobile/src/components/intents-pay.tsx) | The React Native payment window: pick a network and a coin, send the exact amount, watch the payment go through. |
| [`apps/api/src/services/tokens.ts`](../apps/api/src/services/tokens.ts) (`sendTokens`), [`apps/mobile/src/app/wallet.tsx`](../apps/mobile/src/app/wallet.tsx) | The wallet: balances, sending tokens to a friend, and a link to each token on chain. |
| [`apps/admin/src/app/(dashboard)/tokens/chain-card.tsx`](../apps/admin/src/app/(dashboard)/tokens/chain-card.tsx) | What Sotechy's team sees: the operator's gas, changes waiting to be written, and the contract. |

The receipt steps are queued from order changes in [`apps/api/src/services/orders.ts`](../apps/api/src/services/orders.ts), and the database columns come from migration [`0043_near_mirror.sql`](../apps/api/drizzle/0043_near_mirror.sql).

## Build and test the contracts

You need [Rust](https://rustup.rs) (stable, with the `wasm32-unknown-unknown` target) and [cargo-near](https://github.com/near/cargo-near).

```sh
cargo test                                   # 15 unit tests: store tokens and receipts
cd contracts/sotechy && cargo near build non-reproducible-wasm   # about 274 KB
```

To deploy your own copy on testnet, you need [near-cli](https://github.com/near/near-cli-rs) and a testnet account:

```sh
near account create-account sponsor-by-faucet-service <you>.testnet autogenerate-new-keypair save-to-legacy-keychain network-config testnet create
scripts/testnet-setup.sh <you>.testnet     # makes contract. and api. accounts and deploys the contract
scripts/testnet-smoke.sh <you>.testnet     # one order end to end: receipt on payment, shipped, tokens and delivered
```

## Built during the hackathon

Everything in this folder, and the NEAR code in `apps/`, was written for the NEAR Hackathon in November 2026:
- the contract and its tests
- the scripts and the demo
- the NEAR mirror, receipt steps and Intents checkout in the API and app

How the rest of the repo splits between pre-hackathon and hackathon work is in the [main README](../README.md#near-hackathon): tag `pre-hackathon` is the baseline, and tag `hackathon-submission` (branch `near-hackathon`) is the code as submitted.

We're also submitting **Money Moves × NEAR Intents**, a separate project with its own code: [github.com/soke-dev/money-moves-near](https://github.com/soke-dev/money-moves-near). The two share no code.

## Team

Sotechy is built by the team behind Sotechy Shop in Benin City, Nigeria, which has sold to customers since 2022. Contact: hello@sotechy.shop · [@sotechyshop](https://x.com/sotechyshop)

## License

MIT
