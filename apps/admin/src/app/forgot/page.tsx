import Link from "next/link";
import { Illo } from "@/components/illustrations";
import { ForgotForm } from "./forgot-form";

export default function ForgotPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft">
          <Illo name="shield" size={36} />
        </span>
        <h2 className="text-3xl font-extrabold">Forgot your password?</h2>
        <p className="mb-8 mt-1 text-muted">We&apos;ll email a code to your staff account&apos;s address so you can choose a new one.</p>
        <ForgotForm />
        <p className="mt-8 text-center text-sm text-muted">
          Remembered it? <Link href="/login" className="font-semibold text-brand-strong hover:underline">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
