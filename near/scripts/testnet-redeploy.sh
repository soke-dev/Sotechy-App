#!/usr/bin/env bash
# Testnet only: deletes the contract account (its NEAR goes back to ROOT), makes it again and deploys the current
# build, for when the contract's stored layout changes. Usage: scripts/testnet-redeploy.sh [root]
set -uo pipefail
source ~/.cargo/env
R=${1:-sotechy-shop.testnet}
timeout 90 near account delete-account "contract.$R" beneficiary "$R" network-config testnet sign-with-legacy-keychain send </dev/null 2>&1 | grep -E "deleted|rror"
"$(dirname "$0")/testnet-setup.sh" "$R"
