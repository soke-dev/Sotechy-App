import type { CryptoAsset, PaymentMethodConfig } from "@sotechy/shared";
import { ActionForm } from "@/components/action-form";
import { Card, ErrorNote, Field, inputClass, PageHeader } from "@/components/ui";
import { load } from "@/lib/api";
import { saveFx, saveSetting, updateCryptoAsset, updatePaymentMethod } from "../actions";

interface MoneyMovesStatus {
  configured: boolean;
  mode: "test" | "live" | null;
  webhookSecretSet: boolean;
  webhookUrl: string;
  returnUrl: string;
  publicUrlSet: boolean;
  rate: { rate: number; source: string; updatedAt: string };
  account: { name: string; mode: string; verified: boolean } | null;
  error: string | null;
}

function Check({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className={ok ? "text-green-700" : "text-amber-600"}>{ok ? "✓" : "!"}</span>
      <span>{children}</span>
    </li>
  );
}

interface SettingsResponse {
  paymentMethods: PaymentMethodConfig[];
  cryptoAssets: CryptoAsset[];
  settings: Record<string, Record<string, string | number | null>>;
}

export default async function SettingsPage() {
  const [{ data, error }, mm] = await Promise.all([load<SettingsResponse>("/admin/settings"), load<MoneyMovesStatus>("/admin/integrations/moneymoves")]);
  if (!data) return <ErrorNote error={error} />;
  const s = data.settings;
  const m = mm.data;

  return (
    <>
      <PageHeader title="Settings" description="Payments, exchange rate, delivery and contact details (admins)" />
      <div className="flex flex-col gap-4">
        <Card title="Money Moves (online payments)">
          <ErrorNote error={mm.error} />
          {m && (
            <div className="flex flex-col gap-3 text-sm">
              <p>
                {m.account ? (
                  <span className="font-medium text-green-700">Connected to {m.account.name}</span>
                ) : m.configured ? (
                  <span className="font-medium text-red-700">Can&apos;t connect: {m.error}</span>
                ) : (
                  <span className="font-medium text-amber-700">Not connected yet</span>
                )}
                {m.mode && <span className="ml-2 rounded bg-neutral-100 px-2 py-0.5 text-xs uppercase">{m.mode} mode</span>}
                {m.account && !m.account.verified && m.mode === "live" && <span className="ml-2 text-xs text-amber-700">Business not verified yet</span>}
              </p>
              <ul className="flex flex-col gap-1">
                <Check ok={m.configured}>API key set on the server (<code>MONEYMOVES_SECRET_KEY</code>: sk_test_… while testing, sk_live_… to take real money)</Check>
                <Check ok={m.webhookSecretSet}>Webhook secret set (<code>MONEYMOVES_WEBHOOK_SECRET</code>, starts with whsec_)</Check>
                <Check ok={m.publicUrlSet}>Public API address known, so customers return to the app after paying</Check>
              </ul>
              <div className="rounded bg-neutral-50 p-3">
                <p className="text-xs text-neutral-500">In Money Moves → Developers → Webhooks, add this endpoint:</p>
                <code className="select-all break-all text-sm">{m.webhookUrl}</code>
              </div>
              <p className="text-xs text-neutral-500">Customers choose bank transfer, crypto or the Money Moves app on the Money Moves page. Keep &quot;Money Moves&quot; below enabled and set to Online.</p>
            </div>
          )}
        </Card>

        <Card title="Dollar exchange rate">
          {m && (
            <p className="mb-3 text-sm">
              Now: <span className="font-medium">₦{m.rate.rate.toLocaleString("en-NG")} = $1</span>{" "}
              <span className="text-neutral-500">({m.rate.source === "moneymoves" ? "live from Money Moves" : m.rate.source === "manual" ? "your manual rate" : "placeholder until Money Moves is connected"})</span>
            </p>
          )}
          <ActionForm action={saveFx}>
            <Field label="Use">
              <select name="source" defaultValue={(s.fx?.source as string) ?? "moneymoves"} className={inputClass}>
                <option value="moneymoves">Money Moves live rate</option>
                <option value="manual">My own rate</option>
              </select>
            </Field>
            <Field label="Own rate (₦ per $1)"><input name="manualRate" type="number" min={1} step="0.01" defaultValue={s.fx?.manualRate ?? ""} className={inputClass} /></Field>
          </ActionForm>
        </Card>

        <Card title="Payment methods">
          <p className="mb-3 text-xs text-neutral-500">
            The app pays through Money Moves only. Cash, POS terminal and bank transfer are used for walk-in sales at the POS.
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
