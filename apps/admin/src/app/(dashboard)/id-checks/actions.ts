"use server";

// ID check decisions: approve the person's identity, send it back with what to redo, or decline it.
import { revalidatePath } from "next/cache";
import { api, errorMessage } from "@/lib/api";

export async function decideIdCheck(id: string, outcome: "approve" | "redo" | "decline", items: string[], note: string): Promise<{ ok: true } | { error: string }> {
  try {
    await api.post(`/admin/id-checks/${id}/decision`, { outcome, items, note: note.trim() || undefined });
    revalidatePath("/id-checks");
    revalidatePath("/merchants");
    return { ok: true };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}
