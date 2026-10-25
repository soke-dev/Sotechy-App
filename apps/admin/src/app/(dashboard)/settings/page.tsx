import type { CryptoAsset, PaymentMethodConfig } from "@sotechy/shared";
import { CircleAlert, CircleCheck, Settings as SettingsIcon } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { SwitchField } from "@/components/switch";
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
    <li className="flex items-start gap-2">
      {ok ? <CircleCheck size={16} className="mt-0.5 shrink-0 text-green-600" /> : <CircleAlert size={16} className="mt-0.5 shrink-0 text-amber-600" />}
      <span className="text-ink-2">{children}</span>
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
      <PageHeader title="Settings" description="Payments, exchange rate, delivery and contact details (admins)" icon={SettingsIcon} />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Money Moves (online payments)" className="xl:col-span-2">
          <ErrorNote error={mm.error} />
          {m && (
            <div className="flex flex-col gap-3 text-sm">
              <div
                className={`flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 ${m.account ? "bg-green-50 text-green-800" : m.configured ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-800"}`}
              >
                {m.account ? <CircleCheck size={20} /> : <CircleAlert size={20} />}
                <span className="font-semibold">{m.account ? `Connected to ${m.account.name}` : m.configured ? `Can't connect: ${m.error}` : "Not connected yet"}</span>
                {m.mode && (
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${m.mode === "live" ? "bg-green-600 text-white" : "bg-amber-500 text-white"}`}>{m.mode} mode</span>
                )}
                {m.account && !m.account.verified && m.mode === "live" && <span className="text-xs">Business not verified yet</span>}
              </div>
              <ul className="flex flex-col gap-1">
                <Check ok={m.configured}>API key set on the server (<code>MONEYMOVES_SECRET_KEY</code>: sk_test_… while testing, sk_live_… to take real money)</Check>
                <Check ok={m.webhookSecretSet}>Webhook secret set (<code>MONEYMOVES_WEBHOOK_SECRET</code>, starts with whsec_)</Check>
                <Check ok={m.publicUrlSet}>Public API address known, so customers return to the app after paying</Check>
              </ul>
              <div className="rounded-xl border border-line bg-canvas p-3">
                <p className="text-xs text-muted">In Money Moves → Developers → Webhooks, add this endpoint:</p>
                <code className="mt-1 block select-all break-all text-sm">{m.webhookUrl}</code>
              </div>
              <p className="text-xs text-muted">Customers choose bank transfer, crypto or the Money Moves app on the Money Moves page. Keep &quot;Money Moves&quot; below enabled and set to Online.</p>
            </div>
          )}
        </Card>

        <Card title="Dollar exchange rate">
          {m && (
            <p className="mb-3 text-sm">
              Now: <span className="font-medium">₦{m.rate.rate.toLocaleString("en-NG")} = $1</span>{" "}
              <span className="text-muted">({m.rate.source === "moneymoves" ? "live from Money Moves" : m.rate.source === "manual" ? "your manual rate" : "placeholder until Money Moves is connected"})</span>
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

        <Card className="xl:col-span-2" title="Payment methods" description="The app pays through Money Moves only. Cash, POS terminal and bank transfer are for walk-in sales at the POS.">
          <div className="flex flex-col divide-y divide-line">
            {data.paymentMethods.map((m) => (
              <ActionForm
                key={m.code}
                action={updatePaymentMethod}
                className="grid gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[170px_minmax(0,auto)_minmax(0,1fr)_auto] md:items-center"
              >
                <input type="hidden" name="code" value={m.code} />
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span className={`h-2 w-2 rounded-full ${m.isEnabled ? "bg-green-500" : "bg-neutral-300"}`} />
                  {m.label}
                </span>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  <SwitchField name="isEnabled" label="Enabled" defaultChecked={m.isEnabled} />
                  <SwitchField name="online" label="Online" defaultChecked={m.online} />
                  <SwitchField name="inStore" label="In store" defaultChecked={m.inStore} />
                </div>
                <input name="instructions" defaultValue={m.instructions ?? ""} placeholder="What customers see" className={`${inputClass} w-full`} />
              </ActionForm>
            ))}
          </div>
        </Card>

        <Card title="Crypto assets">
          <p className="mb-3 text-xs text-muted">Public receiving addresses only. Never enter private keys or seed phrases.</p>
          {data.cryptoAssets.map((a) => (
            <ActionForm key={a.id} action={updateCryptoAsset}>
              <input type="hidden" name="id" value={a.id} />
              <span className="w-40 text-sm font-medium">{a.symbol} · {a.network}</span>
              <input name="receivingAddress" defaultValue={a.receivingAddress ?? ""} placeholder="Receiving address" className={`${inputClass} min-w-80 flex-1`} />
              <SwitchField name="isEnabled" label="Enabled" defaultChecked={a.isEnabled} />
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
