# Sotechy contracts

- `SotechyTokens` holds every store's reward token in one contract, one id per store ($SOTECHY is 1). Only the operator (the API) mints, burns or moves tokens, and nobody can trade them.
- `SotechyReceipts` gives the customer a receipt for every delivered order (ERC-721 style, can't be sent on). On chain it holds only the store, the order number, the date and a fingerprint (keccak256) of the full receipt. No amounts and no personal details.

Sotechy's database ledger is what counts: the chain is a public record of it. Monad is the main chain and gets every change within seconds. Base gets a copy only when an admin presses "Send batch to Base" on the Tokens page.

## The two wallets

| Wallet | Lives | Does |
| --- | --- | --- |
| Owner | This computer only (`~/.sotechy/chain-keys.env`) | Pause, limits, swap the operator, retire |
| Operator | Railway, as `CHAIN_OPERATOR_KEY` | Deploys, registers store tokens, writes every movement |

If the operator key ever leaks, the owner pauses the contract and swaps the operator. The mint limits cap what a leaked key could do before then.

## Commands

You need [Foundry](https://getfoundry.sh) for `build` and `test`.

```sh
pnpm build                       # compile, then write dist/index.ts for the API
pnpm test                        # contract tests
pnpm wallets                     # make the owner and operator wallets (once)
pnpm chain:deploy --chain monad --contract tokens|receipts   # then commit deployments.json and dist/index.ts
pnpm owner status --chain monad --contract tokens|receipts
pnpm owner pause | unpause
pnpm owner limits <perMint> <perDay>
pnpm owner operator <address> on|off
pnpm owner retire --yes          # for good, when moving to a new contract
```

Chains: `monad`, `base`, `monad-testnet`, `base-sepolia`, and `local` (anvil) for trying things out.

## Moving to a new contract

1. Deploy the new version: `pnpm chain:deploy --chain monad --contract tokens` (it becomes v2, v3…). Raise `--max-per-day` if the ledger holds more than a day's limit.
2. Commit `deployments.json` and `dist/index.ts`, and redeploy the API. From then on nothing is written to that contract until step 3.
3. On the admin Tokens page, press **Copy everything to v2** (asks for your password). The new contract is rebuilt from the ledger: every token and every balance, or every receipt with its number. Monad writes it within seconds; on Base, send a batch.
4. Retire the old contract from this computer: `pnpm owner retire --yes --chain monad --contract tokens`. Its history stays readable.
