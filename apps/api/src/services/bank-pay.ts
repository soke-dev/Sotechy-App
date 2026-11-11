// Which ways to pay the app offers. Stablecoin is always Money Moves; bank transfer goes through the provider
// chosen in Admin → Settings (Money Moves direct checkouts, Nomba's checkout page, or Bachs). Each button also follows its row in
// Admin → Settings → Payment methods ("Money Moves" for stablecoin, "Bank transfer" for bank transfer).
import { eq } from "drizzle-orm";
import { db, schema } from "../db/client";
import { bachsReady } from "./bachs";
import { nombaReady } from "./nomba";
import { bankTransferConfigured, moneyMovesConfigured } from "./moneymoves";
import { getSetting } from "./settings";

export type BankProvider = "moneymoves" | "nomba" | "bachs";
export const BANK_PROVIDERS: BankProvider[] = ["moneymoves", "nomba", "bachs"];

export async function bankProvider(): Promise<BankProvider> {
  const s = await getSetting<{ provider?: string }>("bank_provider");
  return s?.provider === "bachs" || s?.provider === "nomba" ? s.provider : "moneymoves";
}

export const bankProviderReady = (p: BankProvider) => (p === "bachs" ? bachsReady() : p === "nomba" ? nombaReady() : bankTransferConfigured());

/** Switched on for the app in Payment methods: enabled and online */
async function methodOnline(code: "online" | "bank_transfer") {
  const [m] = await db.select({ isEnabled: schema.paymentMethods.isEnabled, online: schema.paymentMethods.online }).from(schema.paymentMethods).where(eq(schema.paymentMethods.code, code));
  return !!m?.isEnabled && !!m.online;
}

export async function stablecoinAvailable() {
  return moneyMovesConfigured() && (await methodOnline("online"));
}

export async function bankTransferAvailable() {
  return bankProviderReady(await bankProvider()) && (await methodOnline("bank_transfer"));
}
