// The owner's controls, run from this computer with the owner key.
//   pnpm owner status            [--chain monad]
//   pnpm owner pause | unpause
//   pnpm owner limits <perMint> <perDay>
//   pnpm owner operator <address> on|off
//   pnpm owner uri <https://...{id}.json>
//   pnpm owner transfer <address>        (the new owner then runs "accept" with their key)
//   pnpm owner accept
//   pnpm owner retire --yes              (for good: when moving to a new contract)
import { formatEther, getAddress } from "viem";
import { chainArg, CHAINS, clients, fail, key, readArtifact, readDeployments } from "./lib.mjs";

const args = process.argv.slice(2);
const [command, ...rest] = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--chain");
const name = chainArg(args);
const current = (readDeployments()[name] ?? []).at(-1);
if (!current) fail(`Nothing deployed on ${name} yet.`);
const { abi } = readArtifact();
const { account, pub, wallet } = clients(name, key("OWNER_PRIVATE_KEY"));
const address = current.address;
const read = (functionName, a = []) => pub.readContract({ address, abi, functionName, args: a });

async function send(functionName, a = []) {
  const { request } = await pub.simulateContract({ address, abi, functionName, args: a, account });
  const hash = await wallet.writeContract(request);
  const r = await pub.waitForTransactionReceipt({ hash });
  console.log(`  ${functionName}: ${r.status} · ${CHAINS[name].explorer}/tx/${hash}`);
}

switch (command) {
  case "status":
  case undefined: {
    const [owner, paused, retired, perOp, perDay, today] = await Promise.all(["owner", "paused", "retired", "maxMintPerOp", "maxMintPerDay", "mintedToday"].map((f) => read(f)));
    const operatorOn = await read("isOperator", [current.operator]);
    const gas = await pub.getBalance({ address: account.address });
    console.log(`
  ${name} v${current.version} ${address}
  Owner     ${owner}${getAddress(owner) === account.address ? " (this key)" : " (NOT this key)"}
  Operator  ${current.operator} ${operatorOn ? "on" : "off"}
  State     ${retired ? "retired" : paused ? "paused" : "running"}
  Limits    ${perOp} per mint, ${perDay} a day (${today} minted on the last minting day)
  Owner gas ${formatEther(gas)} ${CHAINS[name].chain.nativeCurrency.symbol}
`);
    break;
  }
  case "pause":
    await send("setPaused", [true]);
    break;
  case "unpause":
    await send("setPaused", [false]);
    break;
  case "limits":
    if (rest.length !== 2) fail("Usage: pnpm owner limits <perMint> <perDay>");
    await send("setLimits", [BigInt(rest[0]), BigInt(rest[1])]);
    break;
  case "operator":
    if (rest.length !== 2 || !["on", "off"].includes(rest[1])) fail("Usage: pnpm owner operator <address> on|off");
    await send("setOperator", [getAddress(rest[0]), rest[1] === "on"]);
    break;
  case "uri":
    if (!rest[0]) fail("Usage: pnpm owner uri <https://...{id}.json>");
    await send("setURI", [rest[0]]);
    break;
  case "transfer":
    if (!rest[0]) fail("Usage: pnpm owner transfer <address>");
    await send("transferOwnership", [getAddress(rest[0])]);
    break;
  case "accept":
    await send("acceptOwnership");
    break;
  case "retire":
    if (!args.includes("--yes")) fail("Retiring stops this contract for good. Run again with --yes if you mean it.");
    await send("retire");
    break;
  default:
    fail(`Unknown command "${command}". Try: status, pause, unpause, limits, operator, uri, transfer, accept, retire`);
}
