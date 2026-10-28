"use server";

// The store's own business, saved through the Sotechy API: products, photos, delivery areas, orders,
// storefront and setup. Each returns { error } instead of throwing, so forms can show what went wrong.
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { MerchantAttention, AddressSuggestion, Bank, DeliveryZone, DeliveryZoneInput, MerchantApplicationInput, MerchantNotice, MerchantOrder, MerchantProduct, MerchantProductInput, OfferView, PayoutAccount, StorefrontSettings } from "@sotechy/shared";
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

/** The bell's contents, checked again while the dashboard is open */
export async function loadAttention(): Promise<MerchantAttention | null> {
  return api.get<MerchantAttention>("/merchant/summary/attention").catch(() => null);
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

export async function orderAction(id: string, action: "accept" | "ship" | "deliver" | "decline" | "pickup-change", note?: string): Promise<Result<MerchantOrder>> {
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

/** Answers a customer's price offer: accept, decline or counter with an amount */
export async function answerOffer(id: string, input: { action: "accept" | "decline" | "counter"; amount?: number; text?: string | null }): Promise<Result<OfferView>> {
  return attempt(() => api.post<OfferView>(`/merchant/offers/${id}/answer`, input), ["/offers"]);
}

/** Replies publicly to a review of one of the store's products */
export async function replyToReview(id: string, text: string): Promise<Result<{ ok: true }>> {
  return attempt(() => api.post<{ ok: true }>(`/merchant/reviews/${id}/reply`, { text }), ["/reviews"]);
}

/** Starts paying for featuring; returns the Money Moves checkout page */
export async function buyFeaturing(months: number): Promise<Result<{ checkoutUrl: string }>> {
  return attempt(() => api.post<{ checkoutUrl: string }>("/merchant/featuring", { months }));
}

/** Sends a message to everyone following the store */
export async function sendNotice(input: { title: string; body: string; productId?: string | null }): Promise<Result<MerchantNotice>> {
  return attempt(() => api.post<MerchantNotice>("/merchant/notices", input), ["/notifications"]);
}

/** A Sotechy customer for a walk-in sale, by @username or phone */
export async function findWalkInCustomer(q: string): Promise<Result<{ id: string; name: string | null; username: string | null } | null>> {
  return attempt(() => api.get<{ id: string; name: string | null; username: string | null } | null>(`/merchant/walk-in/customer?q=${encodeURIComponent(q)}`));
}

/** Records a walk-in sale and opens the payment for Sotechy's fee; tokens follow once it's paid */
export async function startWalkIn(input: { customer: string; amount: number; note?: string }): Promise<Result<{ id: string; fee: number; checkoutUrl: string }>> {
  return attempt(() => api.post<{ id: string; fee: number; checkoutUrl: string }>("/merchant/walk-in", input));
}

export interface StorePayoutAccount {
  id: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  match: "business" | "owner" | null;
  isDefault: boolean;
  verifiedAt: string;
}

/** The store's payout accounts (up to 3); payouts go to the default */
export async function listPayoutAccounts(): Promise<Result<StorePayoutAccount[]>> {
  return attempt(() => api.get<StorePayoutAccount[]>("/merchant/payout-accounts"));
}

export async function addPayoutAccount(input: { bankCode: string; accountNumber: string; makeDefault?: boolean }): Promise<Result<StorePayoutAccount>> {
  return attempt(() => api.post<StorePayoutAccount>("/merchant/payout-accounts", input), ["/settings", "/payouts"]);
}

export async function makeDefaultPayoutAccount(id: string): Promise<Result<StorePayoutAccount[]>> {
  return attempt(() => api.post<StorePayoutAccount[]>(`/merchant/payout-accounts/${id}/default`, {}), ["/settings", "/payouts", "/"]);
}

export async function removePayoutAccount(id: string): Promise<Result<StorePayoutAccount[]>> {
  return attempt(() => api.delete<StorePayoutAccount[]>(`/merchant/payout-accounts/${id}`), ["/settings"]);
}

export interface TeamMember {
  id: string;
  email: string;
  role: Exclude<import("@sotechy/shared").StoreRole, "owner">;
  status: "active" | "invited";
  name: string | null;
  username: string | null;
  createdAt: string;
}

export async function inviteTeamMember(input: { email: string; role: TeamMember["role"] }): Promise<Result<TeamMember[]>> {
  return attempt(() => api.post<TeamMember[]>("/merchant/team", input), ["/team"]);
}

export async function changeTeamRole(id: string, role: TeamMember["role"]): Promise<Result<TeamMember[]>> {
  return attempt(() => api.patch<TeamMember[]>(`/merchant/team/${id}`, { role }), ["/team"]);
}

export async function removeTeamMember(id: string): Promise<Result<TeamMember[]>> {
  return attempt(() => api.delete<TeamMember[]>(`/merchant/team/${id}`), ["/team"]);
}
