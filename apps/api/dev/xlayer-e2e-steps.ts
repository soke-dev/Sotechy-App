// The X Layer steps of `dev/xlayer-e2e.mjs`: a real order through the real escrow and circuits, on a local copy of
// X Layer. Places an order, opens the USDT payment, signs the buyer's permit (the buyer has no OKB), relays it, then
// ships, delivers and confirms it (release); a second order is cancelled after paying (refund).
import { and, eq, gt, isNull } from "drizzle-orm";
import { createPublicClient, http, parseAbi, type Address, type Hex } from "viem";
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

  console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
