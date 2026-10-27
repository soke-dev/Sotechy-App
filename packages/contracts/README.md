# Sotechy contracts

`SotechyTokens` holds every store's reward token in one contract, one id per store. Sotechy's database ledger is what counts: the chain is a public record of it. Only the operator (the API) mints, burns or moves tokens, and nobody can trade them.

Monad is the primary chain and gets every movement as it happens. Base gets the same movements in hourly batches.

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
pnpm chain:deploy --chain monad  # deploy; then commit deployments.json and dist/index.ts
pnpm owner status --chain monad
pnpm owner pause | unpause
pnpm owner limits <perMint> <perDay>
pnpm owner operator <address> on|off
pnpm owner retire --yes          # for good, when moving to a new contract
```

Chains: `monad`, `base`, `monad-testnet`, `base-sepolia`, and `local` (anvil) for trying things out.

## Moving to a new contract or chain

Retire the old contract, deploy the new one, and the API copies every balance across from the ledger. The old contract stays readable as history.
