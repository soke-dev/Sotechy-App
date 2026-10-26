import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/auth-frame";
import { getSession, TOKEN_COOKIE } from "@/lib/api";
import { AccountStep, StoreStep } from "./steps";

function Progress({ step }: { step: 0 | 1 }) {
  return (
    <div className="mb-8 flex gap-1.5">
      {[0, 1].map((i) => (
        <span key={i} className={`h-1.5 flex-1 rounded-full ${step >= i ? "bg-brand" : "bg-line"}`} />
      ))}
    </div>
  );
}

/** Opening a store: an account (or an existing Sotechy app account), then the store itself */
export default async function SignupPage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const signedIn = (await cookies()).has(TOKEN_COOKIE);
  if (!signedIn && (await searchParams).step === "store") redirect("/signup");

  if (signedIn) {
    const { user, store } = await getSession();
    if (store) redirect("/");
    return (
      <AuthFrame>
        <Progress step={1} />
        <StoreStep firstName={user.fullName?.split(" ")[0] ?? null} needsUsername={!user.username} phone={user.phone} />
      </AuthFrame>
    );
  }

  return (
    <AuthFrame>
      <Progress step={0} />
      <AccountStep />
    </AuthFrame>
  );
}
