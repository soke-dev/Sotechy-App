// Sotechy's own ID check, opened from the "Your ID" step of store setup. When it's sent, it goes back to
// the form (the step then shows "under verification") so the owner can finish the rest.
import { redirect } from "next/navigation";
import { api, getStoreSession } from "@/lib/api";
import { VerifyScreen } from "./verify-screen";

export default async function VerifyPage() {
  const { user } = await getStoreSession();
  const state = await api.idCheckStatus().catch(() => null);
  // Nothing to do here: Didit is on, or the ID is already sent, verified or declined
  if (!state || state.method !== "manual" || ["in_review", "approved", "declined"].includes(state.status)) redirect("/onboarding?step=you");
  return <VerifyScreen ownerName={user.fullName ?? null} previous={state.check} />;
}
