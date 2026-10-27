// Shared bits for the contract scripts: chains, the local key file and the deployments record.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia, foundry, monad, monadTestnet } from "viem/chains";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const DEPLOYMENTS = process.env.SOTECHY_DEPLOYMENTS ?? join(ROOT, "deployments.json");

/** Where the keys live: outside the repo, on this computer only */
export const KEY_FILE = process.env.SOTECHY_KEY_FILE ?? join(homedir(), ".sotechy", "chain-keys.env");

export const CHAINS = {
  monad: { chain: monad, explorer: "https://monadvision.com" },
  base: { chain: base, explorer: "https://basescan.org" },
  "monad-testnet": { chain: monadTestnet, explorer: "https://testnet.monadvision.com" },
  "base-sepolia": { chain: baseSepolia, explorer: "https://sepolia.basescan.org" },
  // anvil, for trying the scripts
  local: { chain: foundry, explorer: "http://localhost" },
};

export function chainArg(args) {
  const i = args.indexOf("--chain");
  const name = i >= 0 ? args[i + 1] : "monad";
  if (!CHAINS[name]) fail(`Unknown chain "${name}". Use one of: ${Object.keys(CHAINS).join(", ")}`);
  return name;
}

export function flag(args, name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
}

export function fail(message) {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

/** A key from the environment first, then the local key file */
export function key(name) {
  if (process.env[name]) return process.env[name];
  if (!existsSync(KEY_FILE)) fail(`No ${name}: run "pnpm wallets" first, or set ${name}.`);
  const line = readFileSync(KEY_FILE, "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${name}=`));
  if (!line) fail(`${name} isn't in ${KEY_FILE}`);
  return line.slice(name.length + 1).trim();
}

export function clients(chainName, privateKey) {
  const { chain } = CHAINS[chainName];
  const rpc = process.env.SOTECHY_RPC_URL ?? chain.rpcUrls.default.http[0];
  const account = privateKeyToAccount(privateKey);
  return {
    account,
    pub: createPublicClient({ chain, transport: http(rpc) }),
    wallet: createWalletClient({ chain, transport: http(rpc), account }),
  };
}

export function readDeployments() {
  return existsSync(DEPLOYMENTS) ? JSON.parse(readFileSync(DEPLOYMENTS, "utf8")) : {};
}

export function writeDeployments(d) {
  writeFileSync(DEPLOYMENTS, JSON.stringify(d, null, 2) + "\n");
}

export function readArtifact() {
  const file = join(ROOT, "out", "SotechyTokens.sol", "SotechyTokens.json");
  if (!existsSync(file)) fail('No build yet: run "pnpm build" first.');
  const a = JSON.parse(readFileSync(file, "utf8"));
  return { abi: a.abi, bytecode: a.bytecode.object };
}
