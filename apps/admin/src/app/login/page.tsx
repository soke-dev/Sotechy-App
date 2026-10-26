import { ActionForm } from "@/components/action-form";
import { Illo, type IlloName } from "@/components/illustrations";
import { Field, inputClass } from "@/components/ui";
import { login } from "./actions";

const PERKS: { illo: IlloName; text: string }[] = [
  { illo: "store", text: "Approve merchants and their delivery areas" },
  { illo: "shield", text: "Step into late or disputed orders" },
  { illo: "coin", text: "Watch the token reserve and fees" },
  { illo: "phone", text: "Switch parts of the app on and off" },
];

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel (large screens) */}
      <div className="relative hidden overflow-hidden bg-panel p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand" />
        <div className="absolute -right-40 -top-40 h-[30rem] w-[30rem] rounded-full border border-white/10" />
        <div className="relative flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/light-logo-small.png" alt="SoTechy" className="h-11" />
          <span className="rounded-md bg-brand px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">Admin</span>
        </div>
        <div className="relative max-w-md">
          <p className="text-sm font-semibold uppercase tracking-widest text-sun">Sotechy control room</p>
          <h1 className="mt-3 text-5xl font-extrabold leading-[1.05]">Run the whole marketplace from one place.</h1>
          <ul className="mt-8 flex flex-col gap-3">
            {PERKS.map((p) => (
              <li key={p.text} className="flex items-center gap-3 text-white/80">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                  <Illo name={p.illo} size={26} />
                </span>
                {p.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/40">Staff access only. Every action is written to the audit log.</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/light-logo-small.png" alt="SoTechy" className="h-11" />
            <span className="rounded-md bg-ink px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Admin</span>
          </div>
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft">
            <Illo name="shield" size={36} />
          </span>
          <h2 className="text-3xl font-extrabold">Welcome back</h2>
          <p className="mb-8 mt-1 text-muted">Sign in with your staff account.</p>
          <ActionForm action={login} submitLabel="Sign in" className="flex flex-col gap-4 [&>button]:w-full">
            <Field label="Email">
              <input name="email" type="email" required autoComplete="email" placeholder="you@sotechy.shop" className={inputClass} />
            </Field>
            <Field label="Password">
              <input name="password" type="password" required autoComplete="current-password" className={inputClass} />
            </Field>
          </ActionForm>
        </div>
      </div>
    </main>
  );
}
