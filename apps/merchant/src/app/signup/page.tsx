import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { AuthFrame, Sticker } from "@/components/auth-frame";
import { getSession, TOKEN_COOKIE } from "@/lib/api";
import { AccountStep, StoreStep } from "./steps";

function Progress({ step }: { step: 0 | 1 }) {
  return (
    <div className="mb-7 flex gap-2">
      {[0, 1].map((i) => (
        <span key={i} className={`h-1.5 flex-1 rounded-full ${step >= i ? "bg-brand" : "bg-line"}`} />
      ))}
    </div>
  );
}

const stepLabel = (n: 1 | 2, what: string) => (
  <span className="mono text-xs">
    Step {n} of 2<span className="hidden sm:inline"> · {what}</span>
  </span>
);

const STORE_STICKERS = (
  <>
    <Sticker className="left-0 top-[4%]" style={{ "--r": "-6deg" } as CSSProperties}>
      <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-brand">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
      </span>
      Official store
    </Sticker>
    <Sticker tone="sun" className="right-0 top-[22%]" style={{ "--r": "5deg", animationDelay: "1.4s" } as CSSProperties}>
      @yourstore <span className="text-good">✓</span>
    </Sticker>
  </>
);

/** Opening a store: an account (or an existing Sotechy app account), then the store itself */
export default async function SignupPage({ searchParams }: { searchParams: Promise<{ step?: string; ref?: string }> }) {
  const { step, ref } = await searchParams;
  const signedIn = (await cookies()).has(TOKEN_COOKIE);
  if (!signedIn && step === "store") redirect(ref ? `/signup?ref=${encodeURIComponent(ref)}` : "/signup");

  if (signedIn) {
    const { user, store } = await getSession();
    if (store) redirect("/");
    return (
      <AuthFrame
        whySell={false}
        title={["Almost", "there."]}
        points={["Name your store and pick its @username", "Tell us how you sell, for the right badge", "Next, verify your ID from your dashboard"]}
        stickers={STORE_STICKERS}
        top={stepLabel(2, "Your store")}
      >
        <Progress step={1} />
        <StoreStep firstName={user.fullName?.split(" ")[0] ?? null} askReferral={!user.referredById} phone={user.phone} referral={ref} />
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      title={["Sell to all", "of Nigeria."]}
      points={["Free to open, with no monthly fee", "Explore your dashboard straight away", "Start selling once Sotechy verifies your store"]}
      top={stepLabel(1, "Your account")}
    >
      <Progress step={0} />
      <AccountStep referral={ref} />
    </AuthFrame>
  );
}
