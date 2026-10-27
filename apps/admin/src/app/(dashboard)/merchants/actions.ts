"use server";

// Store decisions: approve (go live), suspend or reopen review, and delivery area approval.
import { revalidatePath } from "next/cache";
import { api, errorMessage } from "@/lib/api";

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

export async function setStoreStatus(id: string, status: "pending" | "approved" | "suspended", note?: string): Promise<Result> {
  return attempt(() => api.patch(`/admin/merchants/${id}/status`, { status, note }), id);
}

export async function reviewZone(storeId: string, zoneId: string, review: "approved" | "declined", note?: string): Promise<Result> {
  return attempt(() => api.patch(`/admin/delivery-zones/${zoneId}`, { review, note: note ?? null }), storeId);
}
