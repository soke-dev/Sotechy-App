"use client";

import { Send } from "lucide-react";
import { useState } from "react";
import { btn, Card, Field, inputClass, PageHeader, Pill } from "@/components/ui";
import { team as initial } from "@/lib/mock";

const ROLES: { name: string; can: string }[] = [
  { name: "Owner", can: "Everything, including payouts and the team" },
  { name: "Admin", can: "Everything except changing the owner" },
  { name: "Orders", can: "Accept, ship and deliver orders; walk-in sales" },
  { name: "Catalogue", can: "Products, stock and the storefront" },
  { name: "Finance", can: "Payouts, the token and reports" },
  { name: "Viewer", can: "See everything, change nothing" },
];

export default function TeamPage() {
  const [team, setTeam] = useState(initial);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Orders");

  return (
    <>
      <PageHeader illo="user" title="Team" description="Invite people to help run your store. Each person signs in with their own email." />
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card title="People" padded={false}>
          <ul className="flex flex-col divide-y divide-line">
            {team.map((m) => (
              <li key={m.email} className="flex items-center gap-3 px-5 py-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand-strong">{m.name[0].toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{m.status === "invited" ? m.email : m.name}</p>
                  <p className="truncate text-sm text-muted">{m.status === "invited" ? "Invite sent" : m.email}</p>
                </div>
                {m.status === "invited" ? <Pill tone="warn">Invited</Pill> : <Pill tone={m.role === "Owner" ? "dark" : "neutral"} dot={false}>{m.role}</Pill>}
              </li>
            ))}
          </ul>
        </Card>
        <div className="flex flex-col gap-6">
          <Card title="Invite someone">
            <div className="flex flex-col gap-4">
              <Field label="Email">
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className={inputClass} placeholder="name@yourstore.ng" />
              </Field>
              <Field label="Role">
                <select value={role} onChange={(e) => setRole(e.target.value)} className={inputClass}>
                  {ROLES.filter((r) => r.name !== "Owner").map((r) => <option key={r.name}>{r.name}</option>)}
                </select>
              </Field>
              <button
                disabled={!/\S+@\S+\.\S+/.test(email)}
                onClick={() => {
                  setTeam([...team, { name: email, email, role, status: "invited" }]);
                  setEmail("");
                }}
                className={btn.primary}
              >
                <Send size={16} /> Send invite
              </button>
            </div>
          </Card>
          <Card title="What each role can do">
            <dl className="flex flex-col gap-3 text-sm">
              {ROLES.map((r) => (
                <div key={r.name}>
                  <dt className="font-semibold">{r.name}</dt>
                  <dd className="text-muted">{r.can}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}
