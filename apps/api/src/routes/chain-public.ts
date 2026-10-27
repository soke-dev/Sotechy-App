// What explorers and wallets read about Sotechy's tokens and receipts (the contracts point here).
// Receipts show only what's on chain anyway: the store, the order number and the date. No amounts, no people.
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { db, schema } from "../db/client";
import { notFound } from "../lib/errors";
import { publicApiUrl } from "../env";
import { SOTECHY_TOKEN } from "../services/tokens";

const LOGO = () => `${publicApiUrl}/email-assets/logo.png`;

async function storeOfToken(tokenId: number) {
  if (tokenId === SOTECHY_TOKEN.id) return { name: SOTECHY_TOKEN.name, ticker: SOTECHY_TOKEN.ticker, slug: null, logoUrl: null };
  const [store] = await db.select({ name: schema.merchants.name, ticker: schema.merchants.ticker, slug: schema.merchants.slug, logoUrl: schema.merchants.logoUrl }).from(schema.merchants).where(eq(schema.merchants.tokenId, tokenId));
  return store ?? null;
}

export const chainPublicRoutes = new Hono()
  /** ERC-1155 metadata; the id comes as 64 hex characters ({id} in the contract's URI) or a plain number */
  .get("/tokens/:file", async (c) => {
    const raw = c.req.param("file").replace(/\.json$/, "");
    const id = /^[0-9a-f]{64}$/i.test(raw) ? parseInt(raw, 16) : Number(raw);
    const store = Number.isSafeInteger(id) ? await storeOfToken(id) : null;
    if (!store) throw notFound("No such token");
    return c.json({
      name: `$${store.ticker}`,
      description: `${store.name}'s reward token on Sotechy. Customers earn it when they shop with ${store.name} and spend it there as store credit. It can't be traded.`,
      image: store.logoUrl ?? LOGO(),
      decimals: 0,
      properties: { store: store.name, ticker: store.ticker, ...(store.slug && { url: `https://sotechy.shop/store/${store.slug}` }) },
    });
  })
  /** ERC-721 metadata for a receipt */
  .get("/receipts/:id", async (c) => {
    const id = Number(c.req.param("id").replace(/\.json$/, ""));
    if (!Number.isSafeInteger(id)) throw notFound("No such receipt");
    const [r] = await db
      .select({ id: schema.receipts.id, tokenId: schema.receipts.tokenId, fingerprint: schema.receipts.fingerprint, createdAt: schema.receipts.createdAt, order: schema.orders.orderNumber })
      .from(schema.receipts)
      .innerJoin(schema.orders, eq(schema.orders.id, schema.receipts.orderId))
      .where(eq(schema.receipts.id, id));
    if (!r) throw notFound("No such receipt");
    const store = await storeOfToken(r.tokenId);
    return c.json({
      name: `Sotechy receipt #${r.id}`,
      description: `Receipt for order ${r.order} at ${store?.name ?? "a Sotechy store"}. The full receipt is kept by Sotechy; its fingerprint is recorded here so it can be checked.`,
      image: store?.logoUrl ?? LOGO(),
      attributes: [
        { trait_type: "Store", value: store?.name ?? "" },
        { trait_type: "Order", value: r.order },
        { trait_type: "Date", value: r.createdAt.toISOString().slice(0, 10) },
      ],
      fingerprint: r.fingerprint,
    });
  });
