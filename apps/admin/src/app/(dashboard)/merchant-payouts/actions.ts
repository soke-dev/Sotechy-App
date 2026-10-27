"use server";

// Store payouts: send, hold, release or settle one, the payout settings, and a store's own plan.
import { revalidatePath } from "next/cache";
import type { PayoutPlan, PayoutSettings } from "@sotechy/shared";
import { api, errorMessage } from "@/lib/api";

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

export async function payoutAction(id: string, action: "send" | "hold" | "release" | "settle"): Promise<Result> {
  return attempt(() => api.post(`/admin/payouts/${id}/${action}`, {}));
}

export async function savePayoutSettings(settings: PayoutSettings): Promise<Result> {
  return attempt(() => api.put("/admin/payout-settings", settings));
}

/** `plan: null` puts the store back on the standard plan */
export async function setStorePlan(storeId: string, plan: PayoutPlan | null): Promise<Result> {
  return attempt(() => api.put(`/admin/merchants/${storeId}/payout-plan`, { plan }));
}
