// The X Layer steps of `dev/xlayer-e2e.mjs`: a real order through the real escrow and circuits, on a local copy of
// X Layer. Places an order, opens the USDT payment, signs the buyer's permit (the buyer has no OKB), relays it, then
// ships, delivers and confirms it (release); a second order is cancelled after paying (refund).
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { createPublicClient, encodeAbiParameters, http, keccak256, parseAbi, toHex, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { db, schema } from "../src/db/client";
import { cancelOrder, placeOrder, updateOrderStatus } from "../src/services/orders";
import { chainOrder, openXlayerPayment, permitFor, relayXlayerPayment, savedXlayer, USDT0, xlayer, xlayerReceived } from "../src/services/xlayer";
import { earning } from "../src/services/tokens";

const { appSettings, users, branches, products, productVariants, inventory, payments, orders, refunds } = schema;
const ESCROW = process.env.XLAYER_ESCROW as Address;
const RECEIPTS: Address = "0x80b42099567D5eF1A8e8421bD38ae6cAc589F180";
const TOKENS: Address = "0x704c1Fc6e6adb2De17436b509e196F1A57968f7B";
const buyer = privateKeyToAccount(process.env.E2E_BUYER_KEY as Hex);
const chain = createPublicClient({ chain: xlayer, transport: http(process.env.XLAYER_RPC_URL) });
const erc20 = parseAbi(["function balanceOf(address) view returns (uint256)"]);
const nft = parseAbi(["function ownerOf(uint256) view returns (address)", "function receipt(uint256) view returns ((address holder, uint32 storeId, uint8 status, uint40 issuedAt, uint40 updatedAt))"]);
const tokens = parseAbi(["function balanceOf(address account, uint256 id) view returns (uint256)"]);
const usdt = (a: Address) => chain.readContract({ address: USDT0, abi: erc20, functionName: "balanceOf", args: [a] });

let failed = 0;
const check = (what: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "  ✓" : "  ✗"} ${what}${detail ? `  (${detail})` : ""}`);
  if (!ok) failed++;
};

async function newPaidOrder(customerId: string, variantId: string, branchId: string) {
  const order = await placeOrder(customerId, { items: [{ variantId, quantity: 1 }], fulfilmentType: "pickup", branchId, paymentMethod: "online", idempotencyKey: crypto.randomUUID() } as never);
  const [payment] = await db.select().from(payments).where(and(eq(payments.orderId, order.id), eq(payments.status, "pending")));
  const { payUrl, saved } = await openXlayerPayment(order, payment);
  console.log(`  ${order.orderNumber}: ₦${payment.amount.toLocaleString("en-NG")} = ${(Number(saved.amount) / 1e6).toFixed(2)} USDT · pay page ${payUrl.split("?")[0]}`);
  const p = await permitFor(saved, buyer.address);
  const signature = await buyer.signTypedData({
    domain: { ...p.domain, verifyingContract: p.domain.verifyingContract as Address },
    types: p.types,
    primaryType: "Permit",
    message: { owner: buyer.address, spender: p.message.spender as Address, value: BigInt(p.message.value), nonce: BigInt(p.message.nonce), deadline: BigInt(p.message.deadline) },
  });
  const gasBefore = await chain.getBalance({ address: buyer.address });
  const { tx } = await relayXlayerPayment(payment.id, buyer.address, signature);
  check("the buyer only signed: Sotechy relayed the payment", (await chain.getBalance({ address: buyer.address })) === gasBefore && gasBefore === 0n, `buyer OKB ${gasBefore}, tx ${tx}`);
  return { order, saved };
}

async function main() {
  await db.insert(appSettings).values({ key: "xlayer", value: { mode: "everyone" } }).onConflictDoUpdate({ target: appSettings.key, set: { value: { mode: "everyone" } } });
  const [admin] = await db.select().from(users).where(eq(users.role, "admin"));
  const actor = { id: admin.id, email: admin.email, role: admin.role, branchId: null };
  const [customer] = await db.insert(users).values({ email: `buyer-${Date.now()}@e2e.test`, fullName: "E2E Buyer", walletAddress: buyer.address }).returning();
  const [stock] = await db
    .select({ variantId: productVariants.id, branchId: inventory.branchId, price: productVariants.price })
    .from(inventory)
    .innerJoin(productVariants, eq(productVariants.id, inventory.variantId))
    .innerJoin(products, eq(products.id, productVariants.productId))
    .innerJoin(branches, eq(branches.id, inventory.branchId))
    .where(and(isNull(products.merchantId), eq(products.isPublished, true), eq(productVariants.isActive, true), gt(inventory.quantity, 2), eq(branches.isActive, true)))
    .orderBy(productVariants.price)
    .limit(1);

  const treasury0 = await usdt("0xB73B75db9Da49F37f6f8aB658355DBE7D1558e89");
  const buyer0 = await usdt(buyer.address);
  console.log(`\nBuyer ${buyer.address}: ${(Number(buyer0) / 1e6).toFixed(2)} USDT, no OKB`);

  console.log("\n1. Pay, ship, collect, confirm → the circuits release the money");
  const a = await newPaidOrder(customer.id, stock.variantId, stock.branchId);
  const id = BigInt(a.saved.orderId);
  let [o] = await db.select().from(orders).where(eq(orders.id, a.order.id));
  check("Sotechy's order is paid", o.status === "paid", o.status);
  let c = await chainOrder(o.orderNumber);
  check("the USDT is held in the escrow", c.stage === 2 && c.buyer === buyer.address, `stage ${c.stage}`);
  check("the receipt NFT is the buyer's", (await chain.readContract({ address: RECEIPTS, abi: nft, functionName: "ownerOf", args: [id] })) === buyer.address);

  await updateOrderStatus(actor as never, o.id, "processing");
  await updateOrderStatus(actor as never, o.id, "ready_for_pickup");
  c = await chainOrder(o.orderNumber);
  check("ready for pickup → marked shipped on chain", c.shippedAt > 0);
  await updateOrderStatus(actor as never, o.id, "delivered", "Collected");
  await xlayerReceived(o.id);
  c = await chainOrder(o.orderNumber);
  check("collected and confirmed → the circuits released it", c.stage === 3, `stage ${c.stage}`);
  const [pa] = await db.select().from(payments).where(and(eq(payments.orderId, o.id), eq(payments.status, "confirmed")));
  check("Sotechy recorded the release", !!savedXlayer(pa.raw)?.released);
  check("the USDT went to Sotechy's wallet", (await usdt("0xB73B75db9Da49F37f6f8aB658355DBE7D1558e89")) - treasury0 === BigInt(a.saved.amount));
  const earned = await chain.readContract({ address: TOKENS, abi: tokens, functionName: "balanceOf", args: [buyer.address, 1n] });
  check("$SOTECHY minted to the buyer on release", earned === BigInt(earning(o)), `${earned} of ${earning(o)}`);
  const r = await chain.readContract({ address: RECEIPTS, abi: nft, functionName: "receipt", args: [id] });
  check("the receipt says delivered", r.status === 4, `status ${r.status}`);

  console.log("\n2. Pay, then the order is cancelled → the circuits refund the buyer");
  const before = await usdt(buyer.address);
  const b = await newPaidOrder(customer.id, stock.variantId, stock.branchId);
  check("the buyer paid", (await usdt(buyer.address)) === before - BigInt(b.saved.amount));
  await cancelOrder(actor as never, b.order.id, "Out of stock");
  const c2 = await chainOrder(b.order.orderNumber);
  check("the circuits refunded it on chain", c2.stage === 4, `stage ${c2.stage}`);
  check("the buyer has their USDT back", (await usdt(buyer.address)) === before);
  [o] = await db.select().from(orders).where(eq(orders.id, b.order.id));
  check("Sotechy's order is refunded", o.status === "refunded", o.status);
  const [rf] = await db.select().from(refunds).where(eq(refunds.orderId, o.id));
  check("the refund is recorded as sent, with the X Layer transaction", rf?.status === "processed" && !!rf.txHash && rf.network === "X Layer", `${rf?.status} ${rf?.txHash}`);

  console.log("\n3. X Layer as the main chain: every token change and receipt is written there, once");
  await db.insert(appSettings).values({ key: "chain", value: { primary: "xlayer" } }).onConflictDoUpdate({ target: appSettings.key, set: { value: { primary: "xlayer" } } });
  const { writeQueued } = await import("../src/services/chain");
  const { forgetPrimary } = await import("../src/services/chain-primary");
  forgetPrimary();
  const d = await newPaidOrder(customer.id, stock.variantId, stock.branchId);
  const cd = await chainOrder(d.order.orderNumber);
  check("a new USDT order leaves the tokens to Sotechy's record (the escrow mints none)", cd.tokens === 0n, `${cd.tokens}`);
  // As at server start: Sotechy's own token and each store's are queued for creation on the main chain
  await (await import("../src/services/tokens")).ensureStoreTokens();
  let rounds = 0;
  while ((await writeQueued("xlayer", 200)) > 0 && rounds++ < 10);
  const ops = schema.chainOps;
  const left = await db.select().from(ops).where(isNull(ops.xlayerAt));
  check("the queue is all written to X Layer", left.length === 0, `${left.length} left${left.length ? `: ${left.map((o) => `${o.contract}/${o.kind} ${JSON.stringify(o.data)} ${o.xlayerError ?? ""}`).join("; ")}` : ""}`);
  const [o1] = await db.select().from(orders).where(eq(orders.id, a.order.id));
  const total = await chain.readContract({ address: TOKENS, abi: tokens, functionName: "balanceOf", args: [buyer.address, 1n] });
  check("the paying wallet keeps what the escrow minted, and nothing more", total === BigInt(earning(o1)), `${total} $SOTECHY`);
  const [{ walletAddress }] = [await import("../src/services/tokens")];
  const mine = await chain.readContract({ address: TOKENS, abi: tokens, functionName: "balanceOf", args: [walletAddress(customer.id), 1n] });
  const [{ sum }] = await db.select({ sum: sql<number>`coalesce(sum(case when ${schema.tokenEntries.kind} = 'mint' then ${schema.tokenEntries.amount} else -${schema.tokenEntries.amount} end), 0)::int` }).from(schema.tokenEntries).where(and(eq(schema.tokenEntries.tokenId, 1), sql`coalesce(${schema.tokenEntries.toUserId}, ${schema.tokenEntries.fromUserId}) = ${customer.id}`));
  check("the customer's Sotechy wallet on X Layer matches Sotechy's record", mine === BigInt(sum), `${mine} on chain, ${sum} in the record`);
  const STANDARD_RECEIPTS: Address = "0x04779caedcc9ecfd28a6a51cf85536be67db01db";
  const issued = await chain.readContract({ address: STANDARD_RECEIPTS, abi: parseAbi(["function totalIssued() view returns (uint256)"]), functionName: "totalIssued" });
  check("Sotechy's standard receipt is issued on X Layer", issued >= 1n, `${issued} issued`);

  console.log("\n4. Paying with SOL through NEAR Intents (X Layer is the main chain) → the USDT is held in the escrow");
  const { openIntent, intentsAssets, withIntent } = await import("../src/services/intents");
  const { payEscrowFromPayIn, payInAddress } = await import("../src/services/xlayer");
  const e = await placeOrder(customer.id, { items: [{ variantId: stock.variantId, quantity: 1 }], fulfilmentType: "pickup", branchId: stock.branchId, paymentMethod: "online", idempotencyKey: crypto.randomUUID() } as never);
  let [pe] = await db.select().from(payments).where(and(eq(payments.orderId, e.id), eq(payments.status, "pending")));
  const sol = (await intentsAssets()).find((x) => x.symbol === "SOL" && x.chain === "Solana")!;
  // A real 1Click quote; only the local copy of X Layer ever sees the USDT
  const intent = await openIntent(pe, sol.assetId, "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin");
  [pe] = await db.select().from(payments).where(eq(payments.id, pe.id));
  await db.update(payments).set({ provider: "xlayer", raw: withIntent(pe.raw, intent) }).where(eq(payments.id, pe.id));
  const se = savedXlayer(pe.raw)!;
  const payIn = payInAddress(se.orderId);
  console.log(`  ${e.orderNumber}: send ${intent.amountInFormatted} SOL → ${intent.amountOutUsdc} USDT to the order's pay-in address ${payIn}`);
  check("1Click quotes USDT on X Layer for exactly the escrow's amount", intent.settlesTo === "xlayer" && Math.round(Number(intent.amountOutUsdc) * 1e6) === Number(se.amount), `${intent.amountOutUsdc} vs ${se.amount}`);
  check("the escrow's terms give a slow coin time to arrive", se.payBy - Date.now() / 1000 > 2 * 3600);
  check("nothing is paid before the swap delivers", (await payEscrowFromPayIn(pe.id)) === false);
  // The swap delivers: the USDT lands on the pay-in address (set directly on the local copy)
  const slot = keccak256(encodeAbiParameters([{ type: "address" }, { type: "uint256" }], [payIn, 51n]));
  await fetch(process.env.XLAYER_RPC_URL!, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "anvil_setStorageAt", params: [USDT0, slot, toHex(BigInt(se.amount), { size: 32 })] }) });
  check("the pay-in address has the USDT and no OKB", (await usdt(payIn)) === BigInt(se.amount) && (await chain.getBalance({ address: payIn })) === 0n);
  check("Sotechy moves it into the escrow", (await payEscrowFromPayIn(pe.id)) === true);
  const ce = await chainOrder(e.orderNumber);
  check("held in the escrow, the pay-in address as buyer", ce.stage === 2 && ce.buyer === payIn, `stage ${ce.stage}`);
  [pe] = await db.select().from(payments).where(eq(payments.id, pe.id));
  [o] = await db.select().from(orders).where(eq(orders.id, e.id));
  check("Sotechy's order is paid, noted as paid in SOL", o.status === "paid" && pe.status === "confirmed" && /SOL on Solana through NEAR Intents/.test(pe.verificationNote ?? ""), pe.verificationNote ?? "");
  const treasury1 = await usdt("0xB73B75db9Da49F37f6f8aB658355DBE7D1558e89");
  await cancelOrder(actor as never, e.id, "Out of stock");
  check("the circuits refunded it to the pay-in address, and it went straight on", (await chainOrder(e.orderNumber)).stage === 4 && (await usdt(payIn)) === 0n);
  const [rfe] = await db.select().from(refunds).where(eq(refunds.orderId, e.id));
  const toTreasury = (await usdt("0xB73B75db9Da49F37f6f8aB658355DBE7D1558e89")) - treasury1;
  check(
    "the refund goes back as SOL through NEAR Intents (or, if 1Click won't take it, to Sotechy's wallet for staff)",
    (rfe?.status === "processed" && rfe.network === "Solana" && toTreasury === 0n) || (rfe?.status === "approved" && toTreasury === BigInt(se.amount)),
    `${rfe?.status}: ${rfe?.note}`,
  );

  console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
