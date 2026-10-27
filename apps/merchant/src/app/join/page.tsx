// Where a team invite link lands: says which store and role, then joins (signing in first if needed).
import { cookies } from "next/headers";
import Link from "next/link";
import { AuthFrame } from "@/components/auth-frame";
import { btn } from "@/components/ui";
import { api, TOKEN_COOKIE } from "@/lib/api";
import { ROLE_CAN, ROLE_LABEL } from "@/lib/roles";
import { rememberInvite } from "@/lib/session-actions";
import { JoinButton } from "./join-button";

type Invite = { email: string; role: keyof typeof ROLE_CAN; store: string };

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  const { invite: token } = await searchParams;
  const invite = token ? await api.get<Invite>(`/merchant/team/invites/${encodeURIComponent(token)}`).catch(() => null) : null;
  const signedIn = (await cookies()).has(TOKEN_COOKIE);

  if (!token || !invite) {
    return (
      <AuthFrame>
        <h2 className="text-3xl font-extrabold">This invite can&apos;t be used</h2>
        <p className="mt-2 text-muted">It was already accepted or the store withdrew it. Ask the store owner to send you a new one.</p>
        <Link href="/login" className={`${btn.outline} mt-8`}>
          Go to sign in
        </Link>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame>
      <p className="text-sm font-semibold uppercase tracking-widest text-brand-strong">Team invite</p>
      <h2 className="mt-1 text-3xl font-extrabold">Join {invite.store}</h2>
      <p className="mt-2 text-muted">
        You&apos;re invited as <b className="text-ink">{ROLE_LABEL[invite.role]}</b>: {ROLE_CAN[invite.role].toLowerCase()}.
      </p>
      <p className="mt-4 rounded-2xl bg-surface-alt px-4 py-3 text-sm text-ink-2">
        The invite is for <b>{invite.email}</b>. Use that email to {signedIn ? "accept" : "sign in or create your account"}.
      </p>
      {signedIn ? (
        <JoinButton token={token} store={invite.store} />
      ) : (
        <div className="mt-8 flex flex-col gap-3">
          <form action={rememberInvite.bind(null, token, "/signup")}>
            <button className={`${btn.dark} w-full`}>Create my account</button>
          </form>
          <form action={rememberInvite.bind(null, token, "/login")}>
            <button className={`${btn.outline} w-full`}>I already have an account</button>
          </form>
        </div>
      )}
    </AuthFrame>
  );
}
