// Sotechy on NEAR, read-only, against the live mainnet contract: the store tokens, the latest order receipt and its
// status-drawn picture, a fingerprint check, the receipt owner's token balances, and a live NEAR Intents quote for
// paying an order in SOL. Needs no keys: `npm install && npm start`.
// NETWORK=testnet reads the testnet copy. CONTRACT, ORDER and CUSTOMER pick something else to read.
import { FailoverRpcProvider, JsonRpcProvider } from "near-api-js";

const NETWORK = process.env.NETWORK ?? "mainnet";
// FastNEAR first, then NEAR's own RPC if it's busy (the public RPCs drop connections when they're under load)
const RPCS = process.env.RPC ? [process.env.RPC] : NETWORK === "mainnet" ? ["https://free.rpc.fastnear.com", "https://rpc.mainnet.near.org"] : ["https://test.rpc.fastnear.com", "https://rpc.testnet.near.org"];
const CONTRACT = process.env.CONTRACT ?? (NETWORK === "mainnet" ? "contract.sotechy.near" : "contract.sotechy-shop.testnet");
const near = new FailoverRpcProvider(RPCS.map((url) => new JsonRpcProvider({ url }, { retries: 3, wait: 500, backoff: 2 })));
const view = (method, args = {}) => near.callFunction({ contractId: CONTRACT, method, args });
// Customers' accounts are their wallet addresses; shortened here
const short = (a) => (/^0x[0-9a-f]{40}$/i.test(a) ? `${a.slice(0, 6)}…${a.slice(-4)}` : a);
const day = (ms) => new Date(Number(ms)).toISOString().slice(0, 10);

console.log(`\nSotechy on NEAR ${NETWORK}: ${CONTRACT}\n`);

console.log("Store tokens (NEP-245)");
const count = Number(await view("token_count"));
const ids = Array.from({ length: Math.min(count, 6) }, (_, i) => String(i + 1));
console.log(`  ${count} store token${count === 1 ? "" : "s"}, one token id per store`);
const tokens = [];
for (const id of ids) {
  const t = await view("store_token", { token_id: id });
  if (t) tokens.push(t), console.log(`  token ${id}: $${t.ticker}, supply ${Number(t.supply).toLocaleString("en-US")}`);
}
const limits = await view("limits");
console.log(`  mints are capped at ${Number(limits.max_mint_per_op).toLocaleString("en-US")} per change and ${Number(limits.max_mint_per_day).toLocaleString("en-US")} a day`);

console.log("\nReceipts (soulbound NEP-171)");
const total = Number(await view("nft_total_supply"));
console.log(`  ${total} receipt${total === 1 ? "" : "s"} issued`);
let id = process.env.ORDER ? await view("receipt_of_order", { order: process.env.ORDER }) : null;
if (!id && total > 0) id = (await view("nft_tokens", { from_index: String(total - 1), limit: 1 }))[0]?.token_id;
let owner = process.env.CUSTOMER;
if (!id) console.log("  no receipt to show yet");
else {
  const r = await view("receipt", { token_id: id });
  const token = await view("nft_token", { token_id: id });
  owner ??= r.owner_id;
  console.log(`  latest: order ${r.order} at ${r.store_name}, ${r.status}, issued ${day(r.issued_at_ms)}, updated ${day(r.updated_at_ms)}`);
  console.log(`  owned by ${short(r.owner_id)}; on chain: only the store, order number, dates and a fingerprint`);
  console.log(`  NFT: "${token.metadata.title}": ${token.metadata.description}`);
  console.log(`  picture: an SVG the contract draws from the status (${token.metadata.media.length} characters)`);
  console.log(`  verify(right fingerprint): ${await view("verify", { token_id: id, fingerprint: r.fingerprint })}`);
  console.log(`  verify(wrong fingerprint): ${await view("verify", { token_id: id, fingerprint: `0x${"0".repeat(64)}` })}`);
}

if (owner && tokens.length) {
  const balances = await view("mt_batch_balance_of", { account_id: owner, token_ids: tokens.map((t) => t.token_id) });
  const held = tokens.map((t, i) => [t, Number(balances[i])]).filter(([, b]) => b > 0);
  console.log(`\nThat customer's tokens (${short(owner)})`);
  console.log(held.length ? held.map(([t, b]) => `  ${b.toLocaleString("en-US")} $${t.ticker}`).join("\n") : "  none yet");
}

console.log("\nNEAR Intents checkout: what a customer would send in SOL for an order of about 10 USDC");
const quote = (body) => fetch("https://1click.chaindefuser.com/v0/quote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
// A dropped connection is tried again, twice, before giving up
const withRetries = async (fn) => {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === 2) return { error: e };
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
};
const res = await withRetries(() =>
  quote({
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
);
if (res.error) console.log(`  couldn't reach NEAR Intents right now (${res.error.cause?.code ?? res.error.message}); run it again in a moment`);
else {
  const q = await res.json();
  if (!res.ok) console.log("  1Click said:", q.message ?? res.status);
  else console.log(`  send ${q.quote.amountInFormatted} SOL → Sotechy receives ${q.quote.amountOutFormatted} USDC on Base, in about ${q.quote.timeEstimate}s`);
}
console.log("");
