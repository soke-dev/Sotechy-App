"use client";

import { Check } from "lucide-react";
import { useActionState } from "react";
import { useAccount } from "@/components/account-context";
import { FormError, PhoneField, UsernameField } from "@/components/account-fields";
import { btn, Card, Field, inputClass } from "@/components/ui";
import { saveProfile, saveStoreDetails, type SaveState } from "@/lib/session-actions";

function Saved({ state }: { state: SaveState }) {
  if (state && "error" in state) return <FormError message={state.error} />;
  if (state && "saved" in state)
    return (
      <p className="flex items-center gap-1.5 text-sm font-semibold text-good">
        <Check size={15} /> Saved
      </p>
    );
  return null;
}

export function StoreDetailsForm() {
  const { store } = useAccount();
  const [state, action, pending] = useActionState(saveStoreDetails, null);
  return (
    <Card title="Store details" description="Changes to your store name are checked by Sotechy.">
      <form action={action} className="flex flex-col gap-4">
        <Field label="Store name" required>
          <input name="name" required minLength={2} maxLength={60} defaultValue={store.name} className={inputClass} />
        </Field>
        <Field label="Store link" hint="Customers can open your store at this address.">
          <div className="flex min-h-12 items-center rounded-2xl border border-line bg-surface-alt px-4 text-[15px] text-muted">
            sotechy.shop/<span className="text-ink">{store.slug}</span>
          </div>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <PhoneField name="contactPhone" label="Phone for orders" required defaultValue={store.contactPhone} />
          <PhoneField name="contactWhatsapp" label="WhatsApp for order alerts" hint="Leave empty to use the phone number." defaultValue={store.contactWhatsapp} />
        </div>
        <Field label="Support email" hint="The email you signed up with.">
          <input value={store.contactEmail ?? ""} readOnly className={`${inputClass} bg-surface-alt text-muted`} />
        </Field>
        <Saved state={state} />
        <button disabled={pending} className={btn.dark}>{pending ? "Saving…" : "Save store details"}</button>
      </form>
    </Card>
  );
}

export function ProfileForm() {
  const { user } = useAccount();
  const [state, action, pending] = useActionState(saveProfile, null);
  return (
    <Card title="Your profile" description="The same account you use in the Sotechy app, so changes show there too.">
      <form action={action} className="flex flex-col gap-4">
        <Field label="Full name" required>
          <input name="fullName" required defaultValue={user.fullName ?? ""} autoComplete="name" className={inputClass} />
        </Field>
        <UsernameField required defaultValue={user.username ?? ""} />
        <div className="grid gap-4 sm:grid-cols-2">
          <PhoneField name="phone" label="Phone for calls" defaultValue={user.phone} />
          <PhoneField name="whatsappPhone" label="WhatsApp" hint="Leave empty if it's the same number." defaultValue={user.whatsappPhone} />
        </div>
        <Saved state={state} />
        <button disabled={pending} className={btn.outline}>{pending ? "Saving…" : "Save profile"}</button>
      </form>
    </Card>
  );
}
