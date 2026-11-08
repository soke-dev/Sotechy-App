// Sotechy on NEAR, read-only: a customer's store-token balances, a soulbound receipt and its picture, a fingerprint
// check, and a live NEAR Intents quote for paying an order in SOL. Needs no keys: `npm install && npm start`.
// Point it at another deployment with NETWORK, CONTRACT, CUSTOMER and ORDER.
import { JsonRpcProvider } from "near-api-js";

const NETWORK = process.env.NETWORK ?? "testnet";
const RPC = NETWORK === "mainnet" ? "https://rpc.mainnet.near.org" : "https://rpc.testnet.near.org";
const ROOT = NETWORK === "mainnet" ? "sotechy.near" : "sotechy-shop.testnet";
const CONTRACT = process.env.CONTRACT ?? `contract.${ROOT}`;
const CUSTOMER = process.env.CUSTOMER ?? `ada.${ROOT}`;
const ORDER = process.env.ORDER ?? "SO-1024";
const near = new JsonRpcProvider({ url: RPC });
const view = (method, args = {}) => near.callFunction({ contractId: CONTRACT, method, args });

console.log(`\nSotechy on NEAR ${NETWORK}: ${CONTRACT}\n`);

console.log("Store tokens (NEP-245)");
console.log(" ", await view("mt_metadata_contract"));
for (const id of ["1", "2"]) {
  const t = await view("store_token", { token_id: id });
  if (t) console.log(`  token ${id}: $${t.ticker}, supply ${t.supply}`);
}
const balances = await view("mt_batch_balance_of", { account_id: CUSTOMER, token_ids: ["1", "2"] });
console.log(`  ${CUSTOMER} holds ${balances[0]} $SOTECHY and ${balances[1]} of store 2's token`);
console.log("  limits:", await view("limits"));

console.log("\nReceipts (soulbound NEP-171)");
const id = await view("receipt_of_order", { order: ORDER });
if (!id) console.log(`  no receipt for ${ORDER} yet`);
else {
  const r = await view("receipt", { token_id: id });
  const token = await view("nft_token", { token_id: id });
  console.log(`  ${id}: order ${r.order} at ${r.store_name}, ${r.status}, owned by ${r.owner_id}`);
  console.log(`  NFT: "${token.metadata.title}": ${token.metadata.description}`);
  console.log(`  picture: an SVG drawn from its status (${token.metadata.media.length} characters)`);
  console.log(`  verify(right fingerprint): ${await view("verify", { token_id: id, fingerprint: r.fingerprint })}`);
  console.log(`  verify(wrong fingerprint): ${await view("verify", { token_id: id, fingerprint: `0x${"0".repeat(64)}` })}`);
}

console.log("\nNEAR Intents checkout: what a customer would send in SOL for an order of about 10 USDC");
const res = await fetch("https://1click.chaindefuser.com/v0/quote", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    dry: true,
    swapType: "EXACT_OUTPUT",
    slippageTolerance: 100,
    originAsset: "nep141:sol.omft.near",
    depositType: "ORIGIN_CHAIN",
    destinationAsset: "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near",
    amount: "10000000",
    refundTo: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    refundType: "ORIGIN_CHAIN",
    recipient: "0xB73B75db9Da49F37f6f8aB658355DBE7D1558e89",
    recipientType: "DESTINATION_CHAIN",
    deadline: new Date(Date.now() + 30 * 60_000).toISOString(),
  }),
});
const q = await res.json();
if (!res.ok) console.log("  1Click said:", q.message ?? res.status);
else console.log(`  send ${q.quote.amountInFormatted} SOL → Sotechy receives ${q.quote.amountOutFormatted} USDC on Base, in about ${q.quote.timeEstimate}s`);
console.log("");
