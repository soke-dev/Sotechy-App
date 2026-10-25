import type { CryptoAsset, PaymentMethodConfig } from "@sotechy/shared";
import { ActionForm } from "@/components/action-form";
import { Card, ErrorNote, Field, inputClass, PageHeader } from "@/components/ui";
import { load } from "@/lib/api";
import { saveSetting, updateCryptoAsset, updatePaymentMethod } from "../actions";

interface SettingsResponse {
  paymentMethods: PaymentMethodConfig[];
  cryptoAssets: CryptoAsset[];
  settings: Record<string, Record<string, string | number | null>>;
}

export default async function SettingsPage() {
  const { data, error } = await load<SettingsResponse>("/admin/settings");
  if (!data) return <ErrorNote error={error} />;
  const s = data.settings;

  return (
    <>
      <PageHeader title="Settings" description="Payment methods, crypto, delivery and contact details (admins)" />
      <div className="flex flex-col gap-4">
        <Card title="Payment methods">
          <p className="mb-3 text-xs text-neutral-500">
            Enable "Pay online (Money Moves)" only after the Money Moves integration is finished and its keys are set on the API. Enable crypto only after a verifier is integrated (see README).
          </p>
          <div className="flex flex-col gap-3">
            {data.paymentMethods.map((m) => (
              <ActionForm key={m.code} action={updatePaymentMethod}>
                <input type="hidden" name="code" value={m.code} />
                <span className="w-40 text-sm font-medium">{m.label}</span>
                <label className="text-sm"><input type="checkbox" name="isEnabled" defaultChecked={m.isEnabled} /> Enabled</label>
                <label className="text-sm"><input type="checkbox" name="online" defaultChecked={m.online} /> Online</label>
                <label className="text-sm"><input type="checkbox" name="inStore" defaultChecked={m.inStore} /> In store</label>
                <input name="instructions" defaultValue={m.instructions ?? ""} placeholder="Customer instructions" className={`${inputClass} min-w-64 flex-1`} />
              </ActionForm>
            ))}
          </div>
        </Card>

        <Card title="Crypto assets">
          <p className="mb-3 text-xs text-neutral-500">Public receiving addresses only. Never enter private keys or seed phrases.</p>
          {data.cryptoAssets.map((a) => (
            <ActionForm key={a.id} action={updateCryptoAsset}>
              <input type="hidden" name="id" value={a.id} />
              <span className="w-40 text-sm font-medium">{a.symbol} · {a.network}</span>
              <input name="receivingAddress" defaultValue={a.receivingAddress ?? ""} placeholder="Receiving address" className={`${inputClass} min-w-80 flex-1`} />
              <label className="text-sm"><input type="checkbox" name="isEnabled" defaultChecked={a.isEnabled} /> Enabled</label>
            </ActionForm>
          ))}
        </Card>

        <Card title="Bank transfer details (shown to customers)">
          <ActionForm action={saveSetting}>
            <input type="hidden" name="key" value="bank_transfer" />
            <Field label="Bank"><input name="bankName" defaultValue={s.bank_transfer?.bankName ?? ""} className={inputClass} /></Field>
            <Field label="Account name"><input name="accountName" defaultValue={s.bank_transfer?.accountName ?? ""} className={inputClass} /></Field>
            <Field label="Account number"><input name="accountNumber" defaultValue={s.bank_transfer?.accountNumber ?? ""} className={inputClass} /></Field>
          </ActionForm>
        </Card>

        <Card title="Delivery">
          <ActionForm action={saveSetting}>
            <input type="hidden" name="key" value="delivery" />
            <input type="hidden" name="$num_flatFee" value="1" />
            <input type="hidden" name="$num_freeOver" value="1" />
            <Field label="Flat fee (₦)"><input name="flatFee" type="number" defaultValue={s.delivery?.flatFee ?? 0} className={inputClass} /></Field>
            <Field label="Free over (₦)"><input name="freeOver" type="number" defaultValue={s.delivery?.freeOver ?? ""} className={inputClass} /></Field>
            <Field label="Note"><input name="note" defaultValue={s.delivery?.note ?? ""} className={`${inputClass} min-w-80`} /></Field>
          </ActionForm>
        </Card>

        <Card title="Stock hold for unpaid orders">
          <ActionForm action={saveSetting}>
            <input type="hidden" name="key" value="reservation_hold" />
            <input type="hidden" name="$num_minutes" value="1" />
            <Field label="Minutes"><input name="minutes" type="number" min={5} defaultValue={s.reservation_hold?.minutes ?? 30} className={inputClass} /></Field>
          </ActionForm>
        </Card>

        <Card title="Customer support contacts">
          <ActionForm action={saveSetting}>
            <input type="hidden" name="key" value="support" />
            <Field label="Phone"><input name="phone" defaultValue={s.support?.phone ?? ""} className={inputClass} /></Field>
            <Field label="Email"><input name="email" defaultValue={s.support?.email ?? ""} className={inputClass} /></Field>
            <Field label="WhatsApp"><input name="whatsapp" defaultValue={s.support?.whatsapp ?? ""} className={inputClass} /></Field>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
