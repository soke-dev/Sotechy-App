import { ActionForm } from "@/components/action-form";
import { Field, inputClass } from "@/components/ui";
import { login } from "./actions";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel (large screens) */}
      <div className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand" />
        <div className="absolute -right-40 -top-40 h-[30rem] w-[30rem] rounded-full border border-white/10" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/light-logo-small.png" alt="SoTechy" className="relative h-11 self-start" />
        <div className="relative max-w-md">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand">Sotechy Shop</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight">Run the whole shop from one place.</h1>
          <p className="mt-4 text-white/70">Orders, stock, payments, the app&apos;s banners and switches: everything your team needs, in one dashboard.</p>
        </div>
        <p className="relative text-xs text-white/40">Staff access only</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/light-logo-small.png" alt="SoTechy" className="mb-8 h-11 lg:hidden" />
          <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
          <p className="mb-8 mt-1 text-sm text-muted">Sign in with your staff account.</p>
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
