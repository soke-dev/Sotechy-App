"use server";

// The store's own business, saved through the Sotechy API: products, photos, delivery areas, orders,
// storefront and setup. Each returns { error } instead of throwing, so forms can show what went wrong.
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { AddressSuggestion, Bank, DeliveryZone, DeliveryZoneInput, MerchantApplicationInput, MerchantOrder, MerchantProduct, MerchantProductInput, PayoutAccount, StorefrontSettings } from "@sotechy/shared";
import { api, errorMessage, TOKEN_COOKIE } from "./api";

type Result<T> = { ok: T } | { error: string };

async function attempt<T>(fn: () => Promise<T>, revalidate?: string[]): Promise<Result<T>> {
  try {
    const ok = await fn();
    for (const path of revalidate ?? []) revalidatePath(path);
    return { ok };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

/** Uploads photos (public) or business documents (private). Returns their addresses. */
export async function uploadFiles(form: FormData): Promise<Result<{ id: string; url: string; filename: string }[]>> {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  try {
    const res = await fetch(`${(process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "")}/merchant/media`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
      cache: "no-store",
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { error: json?.error ?? "Upload failed" };
    return { ok: json };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

export async function saveProduct(id: string | null, input: MerchantProductInput): Promise<Result<MerchantProduct>> {
  return attempt(() => (id ? api.updateProduct(id, input) : api.createProduct(input)), ["/products", "/"]);
}

export async function saveZone(id: string | null, input: DeliveryZoneInput): Promise<Result<DeliveryZone>> {
  return attempt(() => (id ? api.updateDeliveryZone(id, input) : api.createDeliveryZone(input)), ["/delivery"]);
}

export async function removeZone(id: string): Promise<Result<{ deleted: true }>> {
  return attempt(() => api.deleteDeliveryZone(id), ["/delivery"]);
}

export async function orderAction(id: string, action: "accept" | "ship" | "deliver" | "decline", note?: string): Promise<Result<MerchantOrder>> {
  return attempt(() => api.merchantOrderAction(id, action, note), ["/orders", `/orders/${id}`, "/"]);
}

export async function saveStorefront(input: { tagline?: string | null; logoUrl?: string | null; coverUrl?: string | null; storefront?: StorefrontSettings }) {
  return attempt(async () => {
    await api.saveStorefront(input);
    return true;
  }, ["/storefront", "/"]);
}

export async function saveApplication(input: MerchantApplicationInput) {
  return attempt(async () => {
    await api.saveApplication(input);
    return true;
  }, ["/onboarding", "/settings", "/"]);
}

/** Address suggestions while typing; empty when lookups aren't set up or fail */
export async function suggestAddresses(q: string): Promise<AddressSuggestion[]> {
  try {
    return await api.addressSuggestions(q);
  } catch {
    return [];
  }
}

/** Banks a store can be paid into (from the payout service) */
export async function listBanks(): Promise<Result<Bank[]>> {
  return attempt(() => api.banks());
}

/** Checks the account with the bank and saves it as where payouts go */
export async function savePayoutAccount(input: { bankCode: string; accountNumber: string }): Promise<Result<PayoutAccount>> {
  return attempt(() => api.savePayoutAccount(input), ["/settings", "/payouts", "/onboarding"]);
}

/** Whether a ticker is free for this store's token */
export async function checkTicker(ticker: string): Promise<{ ticker: string; available: boolean; reason: string | null } | null> {
  try {
    return await api.get<{ ticker: string; available: boolean; reason: string | null }>(`/merchant/ticker/${encodeURIComponent(ticker)}`);
  } catch {
    return null;
  }
}
