// A store paying Sotechy (featuring, the walk-in fee): by stablecoin on Money Moves' checkout, or by bank
// transfer through the provider chosen in Admin → Settings (a Money Moves direct checkout, or Bachs).
// The reference comes back with the payment, so it's settled whichever way it was paid.
import { badRequest } from "../lib/errors";
import { bachsCreateCheckout } from "./bachs";
import { bankProvider, bankProviderReady } from "./bank-pay";
import { createCheckout, createDirectCheckout, moneyMovesConfigured } from "./moneymoves";

export type FeeMethod = "stablecoin" | "bank";

/** The ways a store can pay Sotechy right now */
export async function feePayMethods() {
  return { stablecoin: moneyMovesConfigured(), bank: bankProviderReady(await bankProvider()) };
}

/** Opens the payment page; returns its id (kept to look it up) and address */
export async function openFeeCheckout(
  method: FeeMethod,
  input: { reference: string; amount: number; description: string; customer: { email: string; name: string | null }; returnUrl: string; expiresAt: Date; metadata: Record<string, string> },
) {
  const ways = await feePayMethods();
  if (!ways[method]) throw badRequest(method === "bank" ? "Bank transfer isn't available right now. Please pay with stablecoin." : "Stablecoin isn't available right now. Please pay by bank transfer.");
  if (method === "bank" && (await bankProvider()) === "bachs") {
    const s = await bachsCreateCheckout({ reference: input.reference, amount: input.amount, customer: input.customer, returnUrl: input.returnUrl, expiresAt: input.expiresAt, metadata: input.metadata });
    if (!s.checkout_url) throw badRequest("Bank transfer didn't open. Please try again.");
    return { id: s.checkout_id, url: s.checkout_url };
  }
  const checkout = await (method === "bank" ? createDirectCheckout : createCheckout)({
    reference: input.reference,
    idempotencyKey: input.reference,
    amount: input.amount,
    description: input.description,
    customer: input.customer,
    redirectUrl: input.returnUrl,
    expiresAt: input.expiresAt,
    metadata: input.metadata,
  });
  return { id: checkout.id, url: checkout.url };
}
