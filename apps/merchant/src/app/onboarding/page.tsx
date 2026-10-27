import OnboardingView, { type StepId } from "./onboarding-view";

const STEPS: StepId[] = ["setup", "business", "documents", "you", "people", "token", "payout", "review"];

/** ?step=you opens a step directly; Didit sends merchants back with ?verify=done after their ID check */
export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ step?: string; verify?: string }> }) {
  const { step, verify } = await searchParams;
  const initial = verify ? "you" : STEPS.find((s) => s === step);
  return <OnboardingView initialStep={initial} />;
}
