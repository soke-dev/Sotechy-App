"use client";

import { Mail, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { StoreRole } from "@sotechy/shared";
import { Illo } from "@/components/illustrations";
import { btn, Card, Field, inputClass, PageHeader, Pill } from "@/components/ui";
import { Sheet } from "@/components/zone-form";
import { changeTeamRole, inviteTeamMember, removeTeamMember, type TeamMember } from "@/lib/market-actions";
import { ROLE_CAN, ROLE_LABEL } from "@/lib/roles";

type Role = TeamMember["role"];
const ROLES: Role[] = ["admin", "orders", "catalogue", "finance", "viewer"];

export function TeamView({ owner, members, you }: { owner: { email: string; name: string | null; username: string | null } | null; members: TeamMember[]; you: StoreRole }) {
  const router = useRouter();
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("orders");
  const [changing, setChanging] = useState<TeamMember | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const manages = you === "owner" || you === "admin";
  // Admins can manage everyone but other admins; only the owner adds or changes admins
  const canChange = (m: TeamMember) => you === "owner" || (you === "admin" && m.role !== "admin");
  const roleChoices = you === "owner" ? ROLES : ROLES.filter((r) => r !== "admin");

  const run = (fn: () => Promise<{ ok: unknown } | { error: string }>, after?: () => void) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if ("error" in r) return setError(r.error);
      after?.();
      router.refresh();
    });

  return (
    <>
      <PageHeader
        illo="user"
        title="Team"
        description="The people who run your store, each with their own sign-in and a role that decides what they can do."
        actions={
          manages ? (
            <button type="button" onClick={() => setInviting(true)} className={btn.dark}>
              <Plus size={16} /> Add a person
            </button>
          ) : undefined
        }
      />
      {error && <p className="mb-4 rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card title="People" padded={false}>
          <ul className="flex flex-col divide-y divide-line">
            {owner && (
              <li className="flex items-center gap-3 px-5 py-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand-strong">{(owner.name ?? owner.email)[0].toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{owner.name ?? owner.email}</p>
                  <p className="truncate text-sm text-muted">{owner.email}</p>
                </div>
                <Pill tone="dark" dot={false}>
                  Owner
                </Pill>
              </li>
            )}
            {members.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-alt text-sm font-bold text-ink-2">{m.status === "invited" ? <Mail size={16} /> : (m.name ?? m.email)[0].toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{m.name ?? m.email}</p>
                  <p className="truncate text-sm text-muted">{m.status === "invited" ? `Invited · ${m.email}` : m.username ? `@${m.username} · ${m.email}` : m.email}</p>
                </div>
                {manages && canChange(m) ? (
                  <button type="button" disabled={busy} onClick={() => setChanging(m)} aria-label={`Change role for ${m.email}`} className="h-10 rounded-full border border-line bg-surface px-4 text-sm font-semibold hover:border-ink">
                    {ROLE_LABEL[m.role]}
                  </button>
                ) : (
                  <Pill tone="neutral" dot={false}>
                    {ROLE_LABEL[m.role]}
                  </Pill>
                )}
                {manages && canChange(m) && (
                  <button type="button" disabled={busy} onClick={() => run(() => removeTeamMember(m.id))} aria-label={`Remove ${m.email}`} className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-muted hover:border-bad hover:text-bad">
                    <Trash2 size={15} />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {members.length === 0 && (
            <div className="flex items-start gap-4 border-t border-line p-5">
              <Illo name="user" size={40} />
              <div>
                <p className="font-semibold">Just you for now</p>
                <p className="mt-1 text-sm text-muted">Add the people who help you: someone to pack orders, someone to manage products, or your accountant to see payouts.</p>
              </div>
            </div>
          )}
        </Card>

        <Card title="What each role can do">
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="font-semibold">Owner</dt>
              <dd className="text-muted">Everything, including payout accounts and the team</dd>
            </div>
            {ROLES.map((r) => (
              <div key={r}>
                <dt className="font-semibold">{ROLE_LABEL[r]}</dt>
                <dd className="text-muted">{ROLE_CAN[r]}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <Sheet open={changing !== null} onClose={() => setChanging(null)} title={changing ? `Role for ${changing.name ?? changing.email}` : ""}>
        {changing && (
          <div className="flex flex-col gap-2">
            {roleChoices.map((r) => (
              <button
                key={r}
                type="button"
                disabled={busy}
                aria-pressed={changing.role === r}
                onClick={() => run(() => changeTeamRole(changing.id, r), () => setChanging(null))}
                className={`rounded-2xl border px-4 py-3 text-left transition ${changing.role === r ? "border-ink ring-1 ring-ink" : "border-line hover:border-faint"}`}
              >
                <span className="block font-semibold">{ROLE_LABEL[r]}</span>
                <span className="block text-sm text-muted">{ROLE_CAN[r]}</span>
              </button>
            ))}
          </div>
        )}
      </Sheet>

      <Sheet open={inviting} onClose={() => setInviting(false)} title="Add a person">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () => inviteTeamMember({ email: email.trim(), role }),
              () => {
                setInviting(false);
                setEmail("");
              },
            );
          }}
          className="flex flex-col gap-4"
        >
          <Field label="Their email" required hint="We email them a link. They sign in or create an account with this email to join.">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="name@example.com" />
          </Field>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-ink-2">Role</p>
            {roleChoices.map((r) => (
              <button key={r} type="button" aria-pressed={role === r} onClick={() => setRole(r)} className={`rounded-2xl border px-4 py-3 text-left transition ${role === r ? "border-ink ring-1 ring-ink" : "border-line hover:border-faint"}`}>
                <span className="block font-semibold">{ROLE_LABEL[r]}</span>
                <span className="block text-sm text-muted">{ROLE_CAN[r]}</span>
              </button>
            ))}
          </div>
          {error && <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}
          <button type="submit" disabled={busy || !email.includes("@")} className={btn.dark}>
            {busy ? "Sending…" : "Send invite"}
          </button>
        </form>
      </Sheet>
    </>
  );
}
