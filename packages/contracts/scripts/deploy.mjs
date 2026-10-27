// Deploys a contract. The operator wallet sends it and pays the gas; the owner wallet is set as
// owner in the constructor.
//   pnpm chain:deploy --chain monad [--contract tokens|receipts]
//     tokens:   [--max-per-op 10000000] [--max-per-day 200000000] [--uri https://...{id}.json]
//     receipts: [--uri https://.../receipts/]
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { getAddress } from "viem";
import { chainArg, CHAINS, clients, contractArg, flag, key, readArtifact, readDeployments, writeDeployments } from "./lib.mjs";

const args = process.argv.slice(2);
const name = chainArg(args);
const contract = contractArg(args);
const { abi, bytecode } = readArtifact(contract);
const owner = getAddress(key("OWNER_ADDRESS"));
const { account, pub, wallet } = clients(name, key("OPERATOR_PRIVATE_KEY"));

let constructorArgs;
if (contract === "tokens") {
  // Tokens are 1 per ₦1, so these are naira: ₦10m in one go, ₦200m a day across all stores
  const maxPerOp = BigInt(flag(args, "max-per-op", "10000000"));
  const maxPerDay = BigInt(flag(args, "max-per-day", "200000000"));
  constructorArgs = [owner, account.address, maxPerOp, maxPerDay, flag(args, "uri", "https://api.sotechy.shop/tokens/{id}.json")];
  console.log(`\n  Limits ${maxPerOp} per mint, ${maxPerDay} a day`);
} else {
  constructorArgs = [owner, account.address, flag(args, "uri", "https://api.sotechy.shop/receipts/")];
}

const balance = await pub.getBalance({ address: account.address });
console.log(`  Deploying ${contract} to ${name} (chain ${CHAINS[name].chain.id}) from ${account.address}`);
console.log(`  Balance ${Number(balance) / 1e18} ${CHAINS[name].chain.nativeCurrency.symbol} · owner ${owner}`);

const hash = await wallet.deployContract({ abi, bytecode, args: constructorArgs });
console.log(`  Sent ${hash}, waiting…`);
const receipt = await pub.waitForTransactionReceipt({ hash });
if (receipt.status !== "success" || !receipt.contractAddress) {
  console.error("  The deploy failed", receipt);
  process.exit(1);
}

const all = readDeployments();
const list = all[contract][name] ?? [];
const entry = {
  chainId: CHAINS[name].chain.id,
  address: receipt.contractAddress,
  version: list.length + 1,
  owner,
  operator: account.address,
  txHash: hash,
  block: Number(receipt.blockNumber),
  deployedAt: new Date().toISOString(),
};
all[contract][name] = [...list, entry];
writeDeployments(all);
execFileSync(process.execPath, [fileURLToPath(new URL("./export.mjs", import.meta.url))], { stdio: "inherit" });

console.log(`
  Deployed ${contract} v${entry.version}: ${entry.address}
  ${CHAINS[name].explorer}/address/${entry.address}

  Commit deployments.json and dist/index.ts, then redeploy the API.
`);
