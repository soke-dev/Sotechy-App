import { ActionForm } from "@/components/action-form";
import { Field, inputClass } from "@/components/ui";
import { login } from "./actions";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/light-logo-small.png" alt="SoTechy" className="mb-2 h-12" />
        <p className="text-lg font-semibold">Admin</p>
        <p className="mb-6 text-sm text-neutral-500">Staff sign in</p>
        <ActionForm action={login} submitLabel="Sign in" className="flex flex-col gap-3">
          <Field label="Email">
            <input name="email" type="email" required autoComplete="email" className={inputClass} />
          </Field>
          <Field label="Password">
            <input name="password" type="password" required autoComplete="current-password" className={inputClass} />
          </Field>
        </ActionForm>
      </div>
    </main>
  );
}
