"use server";

// The store's own business, saved through the Sotechy API: products, photos, delivery areas, orders,
// storefront and setup. Each returns { error } instead of throwing, so forms can show what went wrong.
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { Promotion, MerchantAttention, AddressSuggestion, Bank, DeliveryZone, DeliveryZoneInput, MerchantApplicationInput, MerchantNotice, MerchantOrder, MerchantProduct, MerchantProductInput, OfferView, PayoutAccount, StoreProfileChange, StorefrontSettings } from "@sotechy/shared";
import { api, errorMessage, getFeeRate, TOKEN_COOKIE } from "./api";

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

/** When anything of the store's last changed; the dashboard refreshes when it moves */
export async function loadPulse(): Promise<string | null> {
  return api
    .get<{ v: string }>("/merchant/summary/pulse")
    .then((r) => r.v)
    .catch(() => null);
}

/** The store's own promo codes */
export interface StorePromoInput {
  name: string;
  code: string;
  discountType: "percentage" | "fixed";
  value: number;
  maxDiscountAmount?: number | null;
  minOrderAmount?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  usageLimit?: number | null;
  isActive?: boolean;
}
export async function createPromo(input: StorePromoInput) {
  return attempt(() => api.post<Promotion>("/merchant/promotions", input), ["/promotions"]);
}
export async function updatePromo(id: string, patch: Partial<StorePromoInput>) {
  return attempt(() => api.patch<Promotion>(`/merchant/promotions/${id}`, patch), ["/promotions"]);
}
export async function deletePromo(id: string) {
  return attempt(() => api.delete<{ ok: true }>(`/merchant/promotions/${id}`), ["/promotions"]);
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

export async function duplicateProduct(id: string): Promise<Result<MerchantProduct>> {
  return attempt(() => api.duplicateProduct(id), ["/products", "/"]);
}

export async function productActions(ids: string[], action: "live" | "hidden" | "out_of_stock" | "delete"): Promise<Result<{ done: number; deleted: number; archived: number }>> {
  // The API takes up to 200 at a time, so a bigger selection goes in batches
  return attempt(async () => {
    const total = { done: 0, deleted: 0, archived: 0 };
    for (let i = 0; i < ids.length; i += 200) {
      const r = await api.productActions(ids.slice(i, i + 200), action);
      total.done += r.done;
      total.deleted += r.deleted;
      total.archived += r.archived;
    }
    return total;
  }, ["/products", "/"]);
}

export async function saveZone(id: string | null, input: DeliveryZoneInput): Promise<Result<DeliveryZone>> {
  return attempt(() => (id ? api.updateDeliveryZone(id, input) : api.createDeliveryZone(input)), ["/delivery"]);
}

export async function removeZone(id: string): Promise<Result<{ deleted: true }>> {
  return attempt(() => api.deleteDeliveryZone(id), ["/delivery"]);
}

/** Sotechy's current fee on each sale (for the "Why sell on Sotechy?" pop-up on any page) */
export async function currentFeeRate() {
  return getFeeRate();
}

export async function orderAction(
  id: string,
  action: "accept" | "ship" | "deliver" | "decline" | "pickup-change" | "payback-sent",
  note?: string,
  handover?: { tracking?: string; driverPhone?: string },
): Promise<Result<MerchantOrder>> {
  return attempt(() => api.merchantOrderAction(id, action, note, handover), ["/orders", `/orders/${id}`, "/"]);
}

/** Sends new store details (name, about, what it sells, socials) for Sotechy's approval */
export async function sendProfileChange(input: StoreProfileChange): Promise<Result<true>> {
  return attempt(async () => {
    await api.put("/merchant/profile-change", input);
    return true as const;
  }, ["/storefront", "/"]);
}

/** Takes back a waiting request, or clears a declined one */
export async function withdrawProfileChange(): Promise<Result<true>> {
  return attempt(async () => {
    await api.delete("/merchant/profile-change");
    return true as const;
  }, ["/storefront", "/"]);
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
/** Pays for months of featuring; `banner` is the store's Home banner for those months (one per payment) */
export async function buyFeaturing(
  months: number,
  banner?: { imageUrl: string; title?: string | null; ctaLabel?: string | null },
  tier: "standard" | "pro" = "standard",
  method: "stablecoin" | "bank" = "stablecoin",
): Promise<Result<{ checkoutUrl: string }>> {
  return attempt(() => api.post<{ checkoutUrl: string }>("/merchant/featuring", { months, banner, tier, method }));
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
export async function startWalkIn(input: { customer: string; amount: number; note?: string; method: "stablecoin" | "bank" }): Promise<Result<{ id: string; fee: number; checkoutUrl: string }>> {
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

export interface ImportItem {
  name: string;
  brand?: string | null;
  category: string;
  price: number;
  stock: number;
  highlights: string[];
  specifications: Record<string, string>;
  description?: string | null;
}

/** Adds products from a spreadsheet, as drafts (they need photos before going live) */
export async function importProducts(items: ImportItem[]): Promise<Result<{ added: number; skipped: string[] }>> {
  return attempt(() => api.post<{ added: number; skipped: string[] }>("/merchant/products/import", { items }), ["/products", "/"]);
}
