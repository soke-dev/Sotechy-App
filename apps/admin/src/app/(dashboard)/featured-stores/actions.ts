"use server";

// Featuring: price and spots, and featuring a store by hand. Both need the admin's password.
import { revalidatePath } from "next/cache";
import { errorMessage, withPassword } from "@/lib/api";

type Result = { ok: true } | { error: string };

async function attempt(fn: () => Promise<unknown>): Promise<Result> {
  try {
    await fn();
    revalidatePath("/featured-stores");
    return { ok: true };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

export async function saveFeaturingSettings(settings: { pricePerMonth: number; maxStores: number; maxPerStore: number; proPricePerMonth: number; maxPro: number }, password: string): Promise<Result> {
  return attempt(() => withPassword("PUT", "/admin/featuring-settings", settings, password));
}

/** Features a store (or gives it Pro) for some days without payment; 0 days ends it */
export async function featureStore(storeId: string, days: number, password: string, tier: "standard" | "pro" = "standard"): Promise<Result> {
  return attempt(() => withPassword("POST", `/admin/merchants/${storeId}/feature`, { days, tier }, password));
}
