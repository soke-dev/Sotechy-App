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
    <Card title="Store details" description="How customers and Sotechy reach your store.">
      <form action={action} className="flex flex-col gap-4">
        <Field label="Store name" hint="Change it in Storefront → Store details, with your about line and socials.">
          <div className="flex min-h-12 items-center rounded-2xl border border-line bg-surface-alt px-4 text-[15px] text-ink">{store.name}</div>
        </Field>
        <Field label="Store username" hint={`Your store's link is app.sotechy.shop/store/${store.slug}. Ask for a new username in Storefront → Store details.`}>
          <div className="flex min-h-12 items-center rounded-2xl border border-line bg-surface-alt px-4 text-[15px] text-muted">
            @<span className="text-ink">{store.slug}</span>
          </div>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <PhoneField name="contactPhone" label="Phone for orders" required defaultValue={store.contactPhone} />
          <PhoneField name="contactWhatsapp" label="WhatsApp for order alerts" hint="Leave empty to use the phone number." defaultValue={store.contactWhatsapp} />
        </div>
        <Field label="Support email" hint="Order alerts and messages from Sotechy go here.">
          <input name="contactEmail" type="email" required maxLength={200} defaultValue={store.contactEmail ?? ""} className={inputClass} />
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
        <Field label="Full name" hint="Taken from your ID check, so it always matches your ID.">
          <input value={user.fullName ?? ""} readOnly placeholder="Added after your ID check" className={`${inputClass} bg-surface-alt text-muted`} />
        </Field>
        <UsernameField defaultValue={user.username ?? ""} />
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
