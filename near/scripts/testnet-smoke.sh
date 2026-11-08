#!/usr/bin/env bash
# Runs one order through the testnet contract as Sotechy's API would: register store tokens, open the order's
# receipt when it's paid, move it to shipped, then on delivery mint the customer's tokens and close the receipt.
# Safe to run again. Usage: scripts/testnet-smoke.sh [root]
set -uo pipefail
source ~/.cargo/env
R=${1:-sotechy-shop.testnet}
C="contract.$R"; API="api.$R"; ADA="ada.$R"; ORDER=SO-1024
FP="0x9f3c4a$(printf '0%.0s' {1..50})7b20e21a"
call() {
  timeout 120 near contract call-function as-transaction "$C" "$1" json-args "$2" prepaid-gas "100 Tgas" attached-deposit "0 NEAR" \
    sign-as "$API" network-config testnet sign-with-legacy-keychain send </dev/null 2>&1 | grep -E "EVENT_JSON|Registered|Skipped|Transaction ID|rror|panicked" | sed 's/^/  /'
}
view() {
  timeout 60 near contract call-function as-read-only "$C" "$1" json-args "$2" network-config testnet now </dev/null 2>&1 | sed -n '/^{\|^\[\|^"\|^true\|^false\|^null\|^[0-9]/,$p' | head -40
}
echo "• store tokens"
view store_token '{"token_id":"1"}' | grep -q SOTECHY || call register_token '{"token_id":"1","ticker":"SOTECHY"}'
view store_token '{"token_id":"2"}' | grep -q YOURSTORE || call register_token '{"token_id":"2","ticker":"YOURSTORE"}'
if view receipt_of_order "{\"order\":\"$ORDER\"}" | head -1 | grep -q "$ORDER"; then echo "• $ORDER already went through"; else
  echo "• $ORDER paid: its receipt opens"
  call issue "{\"list\":[{\"token_id\":\"$ORDER\",\"owner_id\":\"$ADA\",\"store_id\":\"2\",\"store_name\":\"Sotechy Shop\",\"order\":\"$ORDER\",\"fingerprint\":\"$FP\"}]}"
  echo "• $ORDER dispatched"
  call set_status "{\"token_id\":\"$ORDER\",\"status\":\"shipped\",\"fingerprint\":null}"
  # Batches carry queue numbers above the last one applied (the contract skips anything at or below it)
  N=$(( $(view last_seq '{}' | head -1) + 1 ))
  echo "• $ORDER delivered: tokens minted, receipt closed"
  call apply_ops "{\"ops\":[{\"kind\":\"mint\",\"token_id\":\"2\",\"to\":\"$ADA\",\"amount\":\"572000\",\"memo\":\"$ORDER\",\"seq\":$N},{\"kind\":\"mint\",\"token_id\":\"1\",\"to\":\"$ADA\",\"amount\":\"57200\",\"memo\":\"$ORDER\",\"seq\":$((N + 1))}]}"
  call set_status "{\"token_id\":\"$ORDER\",\"status\":\"delivered\",\"fingerprint\":null}"
fi
echo "• balances"; view mt_batch_balance_of "{\"account_id\":\"$ADA\",\"token_ids\":[\"1\",\"2\"]}"
echo "• receipt"; view receipt "{\"token_id\":\"$ORDER\"}"
