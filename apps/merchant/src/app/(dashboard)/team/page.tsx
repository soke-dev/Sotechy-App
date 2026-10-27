"use client";

// The people who run the store. For now that's the owner; adding staff with their own sign-in comes later.
import { useAccount } from "@/components/account-context";
import { Illo } from "@/components/illustrations";
import { Card, PageHeader, Pill } from "@/components/ui";

const ROLES: { name: string; can: string }[] = [
  { name: "Owner", can: "Everything, including payouts and the team" },
  { name: "Admin", can: "Everything except changing the owner" },
  { name: "Orders", can: "Accept, ship and deliver orders; walk-in sales" },
  { name: "Catalogue", can: "Products, stock and the storefront" },
  { name: "Finance", can: "Payouts, the token and reports" },
  { name: "Viewer", can: "See everything, change nothing" },
];

export default function TeamPage() {
  const { user } = useAccount();
  const name = user.fullName || user.email;

  return (
    <>
      <PageHeader illo="user" title="Team" description="The people who run your store, each signing in with their own email." />
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-6">
          <Card title="People" padded={false}>
            <ul className="flex flex-col divide-y divide-line">
              <li className="flex items-center gap-3 px-5 py-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand-strong">{name[0].toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{name}</p>
                  <p className="truncate text-sm text-muted">{user.email}</p>
                </div>
                <Pill tone="dark" dot={false}>
                  Owner
                </Pill>
              </li>
            </ul>
          </Card>
          <div className="flex items-start gap-4 rounded-2xl border border-dashed border-line p-5">
            <Illo name="user" size={40} />
            <div>
              <p className="font-semibold">Adding your team is coming soon</p>
              <p className="mt-1 text-sm text-muted">You&apos;ll be able to invite staff with their own sign-in and choose what each person can do. Until then, only the owner can sign in to your store.</p>
            </div>
          </div>
        </div>
        <Card title="What each role will be able to do">
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
    </>
  );
}
