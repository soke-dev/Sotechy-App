#!/usr/bin/env bash
# Makes the testnet accounts under ROOT (the contract, and the API's operator) and deploys the contract.
# Usage: scripts/testnet-setup.sh [root account]   (keys come from ~/.near-credentials)
set -uo pipefail
source ~/.cargo/env
R=${1:-sotechy-shop.testnet}
WASM=$(cd "$(dirname "$0")/.." && pwd)/target/near/sotechy/sotechy.wasm
mk() {
  timeout 90 near account create-account fund-myself "$1.$R" "$2" autogenerate-new-keypair save-to-legacy-keychain \
    sign-as "$R" network-config testnet sign-with-legacy-keychain send </dev/null 2>&1 | grep -E "created successfully|rror"
}
mk contract "3.5 NEAR"
mk api "0.5 NEAR"
timeout 120 near contract deploy "contract.$R" use-file "$WASM" \
  with-init-call new json-args "{\"owner\":\"$R\",\"operator\":\"api.$R\",\"max_mint_per_op\":\"50000000\",\"max_mint_per_day\":\"1000000000\"}" \
  prepaid-gas "100 Tgas" attached-deposit "0 NEAR" network-config testnet sign-with-legacy-keychain send </dev/null 2>&1 | grep -E "successfully|rror|Transaction ID"
