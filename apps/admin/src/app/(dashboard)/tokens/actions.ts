"use server";

// The chain buttons on the Tokens page: send a batch to Base, and retry changes Monad refused.
import { revalidatePath } from "next/cache";
import { api, errorMessage, withPassword } from "@/lib/api";

export async function sendBaseBatch(password: string): Promise<{ sent: number; left: number } | { error: string }> {
  try {
    const result = await withPassword<{ sent: number; left: number }>("POST", "/admin/chain/base-batch", {}, password);
    revalidatePath("/tokens");
    return result;
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

export async function retryStuck(): Promise<{ retried: number } | { error: string }> {
  try {
    const result = await api.post<{ retried: number }>("/admin/chain/retry", {});
    revalidatePath("/tokens");
    return result;
  } catch (err) {
    return { error: errorMessage(err) };
  }
}
