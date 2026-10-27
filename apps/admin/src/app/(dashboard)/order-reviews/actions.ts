"use server";

// Settling order reviews: cancel and refund, mark delivered, or mark a payback repaid.
import { revalidatePath } from "next/cache";
import { api, errorMessage, withPassword } from "@/lib/api";

type Result = { ok: true } | { error: string };

async function attempt(fn: () => Promise<unknown>): Promise<Result> {
  try {
    await fn();
    revalidatePath("/order-reviews");
    revalidatePath("/orders");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

/** Cancels the order; a paid order gets a refund request to process under Payments */
export async function cancelOrder(orderId: string, note: string): Promise<Result> {
  return attempt(() => api.post(`/admin/orders/${orderId}/cancel`, { note }));
}

/** Marks a store order delivered (which sets up the store's final payment) */
export async function markDelivered(orderId: string): Promise<Result> {
  return attempt(() => api.post(`/admin/orders/${orderId}/status`, { status: "delivered", note: "Confirmed by Sotechy" }));
}

/** The customer has the order after all: the store's final payment can go */
export async function markReceived(orderId: string): Promise<Result> {
  return attempt(() => api.post(`/admin/orders/${orderId}/received`, {}));
}

export async function markRepaid(payoutId: string, password: string): Promise<Result> {
  return attempt(() => withPassword("POST", `/admin/payouts/${payoutId}/settle`, {}, password));
}
