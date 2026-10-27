import { getStoreSession } from "@/lib/api";
import OnboardingView, { type StepId } from "./onboarding-view";

const STEPS: StepId[] = ["setup", "business", "documents", "you", "people", "token", "payout", "review"];

/** ?step=you opens a step directly; Didit sends merchants back with ?verify=done after their ID check */
export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ step?: string; verify?: string }> }) {
  const [{ step, verify }, { user, store }] = await Promise.all([searchParams, getStoreSession()]);
  const initial = verify ? "you" : STEPS.find((s) => s === step);
  return (
    <OnboardingView
      initialStep={initial}
      start={{
        storeName: store.name,
        ticker: store.ticker,
        ownerName: user.fullName || user.email,
        kind: store.sellerKind,
        sells: store.sells ?? [],
        application: store.application ?? null,
        submitted: !!store.submittedAt,
      }}
    />
  );
}
