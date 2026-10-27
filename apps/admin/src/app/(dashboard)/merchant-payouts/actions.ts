"use server";

// Store payouts: send, hold, release or settle one, the payout settings, and a store's own plan.
import { revalidatePath } from "next/cache";
import type { PayoutPlan, PayoutSettings } from "@sotechy/shared";
import { errorMessage, withPassword } from "@/lib/api";

type Result = { ok: true } | { error: string };

async function attempt(fn: () => Promise<unknown>): Promise<Result> {
  try {
    await fn();
    revalidatePath("/merchant-payouts");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

/** Holding needs no password; sending, releasing and settling do */
export async function payoutAction(id: string, action: "send" | "hold" | "release" | "settle", password = ""): Promise<Result> {
  return attempt(() => withPassword("POST", `/admin/payouts/${id}/${action}`, {}, password));
}

export async function savePayoutSettings(settings: PayoutSettings, password: string): Promise<Result> {
  return attempt(() => withPassword("PUT", "/admin/payout-settings", settings, password));
}

/** `plan: null` puts the store back on the standard plan */
export async function setStorePlan(storeId: string, plan: PayoutPlan | null, password: string): Promise<Result> {
  return attempt(() => withPassword("PUT", `/admin/merchants/${storeId}/payout-plan`, { plan }, password));
}
