# Sotechy on NEAR

Sotechy is a live marketplace of verified stores (iOS app, web shop at [sotechy.shop](https://sotechy.shop), and a merchant dashboard). Every store has its own reward token: customers earn it on every delivered order and can spend it only at that store.

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

It reads the live testnet contract (`NETWORK=mainnet npm start` reads mainnet):
- a store's token supply
- a customer's balances
- the receipt for order SO-1024, with its status-drawn picture
- a fingerprint check that passes with the right fingerprint and fails with a wrong one

It also gets a live NEAR Intents quote for paying an order in SOL. The output looks like this:

```
Sotechy on NEAR testnet: contract.sotechy-shop.testnet
Store tokens (NEP-245)
  token 1: $SOTECHY, supply 57200
  ada.sotechy-shop.testnet holds 57200 $SOTECHY and 572000 of store 2's token
Receipts (soulbound NEP-171)
  SO-1024: order SO-1024 at Sotechy Shop, delivered, owned by ada.sotechy-shop.testnet
  verify(right fingerprint): true
  verify(wrong fingerprint): false
NEAR Intents checkout
  send 0.1136 SOL → Sotechy receives 10.0 USDC on Base, in about 22s
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
- Only Sotechy's operator account can mint, burn or move tokens. Every change carries the order it belongs to as its `memo`.
- Nobody can trade the tokens. NEP-245's `mt_transfer` and the other transfer calls refuse, because a store's token is meant to bring its customers back, not be sold on.

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
4. When 1Click reports `SUCCESS`, the payment and the order are confirmed. A background watcher catches customers who close the app.
5. If the swap can't happen, 1Click returns the coins to the customer's refund address. Nothing is held in between.

### In Sotechy's app

| File | What it does |
|---|---|
| [`apps/api/src/services/near.ts`](../apps/api/src/services/near.ts) | The API worker that writes every ledger change and receipt to NEAR, in order, with retries. It opens receipts on payment and moves them as orders ship and deliver. |
| [`apps/api/src/services/intents.ts`](../apps/api/src/services/intents.ts), routes in [`apps/api/src/routes/payments.ts`](../apps/api/src/routes/payments.ts) (`/payments/intents/*`) | The 1Click client: coins on offer, quotes, status checks, and confirming orders. |
| [`apps/mobile/src/components/intents-pay.tsx`](../apps/mobile/src/components/intents-pay.tsx) | The React Native payment window: pick a coin, send the exact amount, watch the swap. |

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

How the rest of the repo splits between pre-hackathon and hackathon work is in the [main README](../README.md#near-hackathon).

## Team

Sotechy is built by the team behind Sotechy Shop in Benin City, Nigeria, which has sold to customers since 2022. Contact: hello@sotechy.shop · [@sotechyshop](https://x.com/sotechyshop)

## License

MIT
