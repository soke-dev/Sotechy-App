"use client";

import { useActionState } from "react";
import { FormError } from "@/components/account-fields";
import { btn } from "@/components/ui";
import { acceptInvite } from "@/lib/session-actions";

export function JoinButton({ token, store }: { token: string; store: string }) {
  const [state, action, pending] = useActionState(acceptInvite.bind(null, token), null);
  return (
    <form action={action} className="mt-8 flex flex-col gap-3">
      <FormError message={state?.error} />
      <button disabled={pending} className={btn.dark}>
        {pending ? "Joining…" : `Join ${store}`}
      </button>
    </form>
  );
}
