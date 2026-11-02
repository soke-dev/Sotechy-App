"use server";

// Store decisions: approve (go live), suspend or reopen review, and delivery area approval.
import { revalidatePath } from "next/cache";
import { api, errorMessage, withPassword } from "@/lib/api";

type Result = { ok: true } | { error: string };

async function attempt(fn: () => Promise<unknown>, id: string): Promise<Result> {
  try {
    await fn();
    revalidatePath("/merchants");
    revalidatePath(`/merchants/${id}`);
    revalidatePath("/delivery-areas");
    return { ok: true };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

export async function setStoreStatus(id: string, status: "pending" | "approved" | "suspended", password: string, note?: string): Promise<Result> {
  return attempt(() => withPassword("PATCH", `/admin/merchants/${id}/status`, { status, note }, password), id);
}

/** Makes the store Sotechy's own: no token of its own, it uses $SOTECHY */
export async function makeSotechyStore(id: string, password: string): Promise<Result> {
  return attempt(() => withPassword("POST", `/admin/merchants/${id}/sotechy-store`, {}, password), id);
}

/** Send a waiting store back for changes, or decline it, with a note the owner sees */
export async function reviewStore(id: string, outcome: "changes" | "declined", note: string): Promise<Result> {
  return attempt(() => api.post(`/admin/merchants/${id}/review`, { outcome, note }), id);
}

export async function reviewZone(storeId: string, zoneId: string, review: "approved" | "declined", note?: string): Promise<Result> {
  return attempt(() => api.patch(`/admin/delivery-zones/${zoneId}`, { review, note: note ?? null }), storeId);
}

/** Sotechy's own store, made in one step for the account (email) that will run it */
export async function setupSotechyStore(email: string, password: string): Promise<{ ok: true; newAccount: boolean } | { error: string }> {
  try {
    const r = await withPassword<{ newAccount: boolean }>("POST", "/admin/merchants/sotechy-store/setup", { email }, password);
    revalidatePath("/merchants");
    return { ok: true, newAccount: r.newAccount };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}
