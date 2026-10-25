"use client";

import { useActionState, type ReactNode } from "react";
import type { ActionResult } from "@/lib/action-result";
import { buttonClass } from "./ui";

/** Form bound to a server action; shows the action's error or success message. */
export function ActionForm({
  action,
  children,
  submitLabel = "Save",
  className = "flex flex-wrap items-end gap-3",
}: {
  action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  children?: ReactNode;
  submitLabel?: string;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className={className}>
      {children}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Saving…" : submitLabel}
      </button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      {state?.message && <p className="w-full text-sm text-green-700">{state.message}</p>}
    </form>
  );
}
