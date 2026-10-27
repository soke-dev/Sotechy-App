// Makes the two wallets: the owner (sets the rules, stays on this computer) and the operator
// (Sotechy's API, which writes every movement). Keys go to a file outside the repo; only the
// addresses are printed.
import { chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { fail, KEY_FILE } from "./lib.mjs";

if (existsSync(KEY_FILE)) fail(`${KEY_FILE} already exists. Move it away first if you really want new wallets.`);

const owner = generatePrivateKey();
const operator = generatePrivateKey();
const ownerAddress = privateKeyToAccount(owner).address;
const operatorAddress = privateKeyToAccount(operator).address;

mkdirSync(dirname(KEY_FILE), { recursive: true });
writeFileSync(
  KEY_FILE,
  [
    "# Sotechy chain wallets. Keep this file private and backed up somewhere safe.",
    "# OWNER: stays on this computer. Never put it on Railway.",
    `OWNER_ADDRESS=${ownerAddress}`,
    `OWNER_PRIVATE_KEY=${owner}`,
    "# OPERATOR: goes on Railway as CHAIN_OPERATOR_KEY.",
    `OPERATOR_ADDRESS=${operatorAddress}`,
    `OPERATOR_PRIVATE_KEY=${operator}`,
    "",
  ].join("\n"),
);
try {
  chmodSync(KEY_FILE, 0o600);
} catch {}

console.log(`
  Keys saved to ${KEY_FILE}

  Owner     ${ownerAddress}
            Sets the rules (pause, limits, operator). Needs a little gas, ~1 MON.

  Operator  ${operatorAddress}
            Deploys and writes every movement. Fund it with MON on Monad (and ETH on Base later).
`);
