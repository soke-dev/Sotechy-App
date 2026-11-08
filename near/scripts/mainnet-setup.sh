#!/usr/bin/env bash
# Mainnet: under your account ROOT (whose key you imported with
# `near account import-account using-web-wallet network-config mainnet`), makes contract.ROOT and api.ROOT and deploys
# the contract with ROOT as owner and api.ROOT as the operator. ROOT needs about 3.5 NEAR: about 2.8 is locked for the
# contract's storage (returned if the contract account is ever deleted), the rest is for the accounts and gas.
# Usage: [CONTRACT_NEAR=3] [API_NEAR=0.2] scripts/mainnet-setup.sh <root, e.g. sotechy.near>
set -uo pipefail
source ~/.cargo/env
R=${1:?Give your NEAR account, e.g. sotechy.near}
WASM=$(cd "$(dirname "$0")/.." && pwd)/target/near/sotechy/sotechy.wasm
[ -f "$WASM" ] || { echo "Build first: cd contracts/sotechy && cargo near build non-reproducible-wasm"; exit 1; }
mk() {
  timeout 120 near account create-account fund-myself "$1.$R" "$2" autogenerate-new-keypair save-to-legacy-keychain \
    sign-as "$R" network-config mainnet sign-with-legacy-keychain send </dev/null 2>&1 | grep -E "created successfully|rror"
}
mk contract "${CONTRACT_NEAR:-3} NEAR"
mk api "${API_NEAR:-0.2} NEAR"
timeout 180 near contract deploy "contract.$R" use-file "$WASM" \
  with-init-call new json-args "{\"owner\":\"$R\",\"operator\":\"api.$R\",\"max_mint_per_op\":\"50000000\",\"max_mint_per_day\":\"1000000000\"}" \
  prepaid-gas "100 Tgas" attached-deposit "0 NEAR" network-config mainnet sign-with-legacy-keychain send </dev/null 2>&1 | grep -E "successfully|rror|Transaction ID"
echo
echo "Railway (api service): NEAR_NETWORK=mainnet NEAR_CONTRACT=contract.$R NEAR_OPERATOR_ACCOUNT=api.$R"
echo "NEAR_OPERATOR_KEY is the private_key in ~/.near-credentials/mainnet/api.$R.json (keep it secret)"
