// Deploys SotechyTokens. The operator wallet sends it and pays the gas; the owner wallet is set
// as owner in the constructor.
//   pnpm chain:deploy --chain monad [--max-per-op 10000000] [--max-per-day 200000000] [--uri https://...]
import { getAddress } from "viem";
import { chainArg, CHAINS, clients, flag, key, readArtifact, readDeployments, writeDeployments } from "./lib.mjs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const name = chainArg(args);
const { abi, bytecode } = readArtifact();
const owner = getAddress(key("OWNER_ADDRESS"));
const { account, pub, wallet } = clients(name, key("OPERATOR_PRIVATE_KEY"));

// Tokens are 1 per ₦1, so these are naira: ₦10m in one go, ₦200m a day across all stores
const maxPerOp = BigInt(flag(args, "max-per-op", "10000000"));
const maxPerDay = BigInt(flag(args, "max-per-day", "200000000"));
const uri = flag(args, "uri", "https://api.sotechy.shop/tokens/{id}.json");

const balance = await pub.getBalance({ address: account.address });
console.log(`\n  Deploying to ${name} (chain ${CHAINS[name].chain.id}) from ${account.address}`);
console.log(`  Balance ${Number(balance) / 1e18} ${CHAINS[name].chain.nativeCurrency.symbol}`);
console.log(`  Owner ${owner} · limits ${maxPerOp} per mint, ${maxPerDay} a day`);

const hash = await wallet.deployContract({ abi, bytecode, args: [owner, account.address, maxPerOp, maxPerDay, uri] });
console.log(`  Sent ${hash}, waiting…`);
const receipt = await pub.waitForTransactionReceipt({ hash });
if (receipt.status !== "success" || !receipt.contractAddress) {
  console.error("  The deploy failed", receipt);
  process.exit(1);
}

const all = readDeployments();
const list = all[name] ?? [];
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
all[name] = [...list, entry];
writeDeployments(all);
execFileSync(process.execPath, [fileURLToPath(new URL("./export.mjs", import.meta.url))], { stdio: "inherit" });

console.log(`
  Deployed v${entry.version}: ${entry.address}
  ${CHAINS[name].explorer}/address/${entry.address}

  Commit deployments.json and dist/index.ts, then redeploy the API.
`);
