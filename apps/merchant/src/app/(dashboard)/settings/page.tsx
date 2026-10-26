"use client";

import { Check, Lock } from "lucide-react";
import { use, useState } from "react";
import { btn, Card, Field, inputClass, PageHeader, Tabs } from "@/components/ui";
import { useAccount } from "@/components/account-context";
import { bank, PAYOUT_MATCH_LABEL, payoutNameMatch } from "@/lib/mock";
import { ProfileForm, StoreDetailsForm } from "./account-forms";

const BANKS = ["Access Bank", "GTBank", "First Bank", "UBA", "Zenith Bank", "Opay", "Moniepoint", "Kuda", "PalmPay", "Wema Bank"];

/** `locked`: always on and can't be switched off */
function Toggle({ on, onChange, label, hint, locked }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string; locked?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <p className="flex items-center gap-1.5 font-semibold">
          {label}
          {locked && <Lock size={13} className="text-muted" />}
        </p>
        {hint && <p className="text-sm text-muted">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={locked}
        onClick={() => onChange(!on)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-60 ${on ? "bg-brand" : "bg-line"}`}
      >
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${on ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

const SECTIONS = [
  { id: "store", label: "Store details" },
  { id: "payout", label: "Payout account" },
  { id: "security", label: "Security" },
  { id: "notifications", label: "Notifications" },
] as const;
type Section = (typeof SECTIONS)[number]["id"];

export default function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  // /settings?tab=payout opens straight on that section
  const { tab: asked } = use(searchParams);
  const { user, store } = useAccount();
  const [tab, setTab] = useState<Section>(SECTIONS.find((x) => x.id === asked)?.id ?? "store");
  const [notify, setNotify] = useState({ newOrderSms: true, whatsapp: true, payouts: true, reviews: true, weekly: false });
  const [waNumber, setWaNumber] = useState(store.contactWhatsapp ?? store.contactPhone ?? "");
  const [waTest, setWaTest] = useState(false);
  const [accountNumber, setAccountNumber] = useState(bank.accountNumber);
  const resolved = accountNumber.length === 10;

  return (
    <>
      <PageHeader illo="shield" title="Settings" />
      <Tabs tabs={[...SECTIONS]} value={tab} onChange={setTab} className="mb-5" />
      <div className="max-w-2xl">
        {tab === "store" && (
          <div className="flex flex-col gap-4">
            <StoreDetailsForm />
            <ProfileForm />
          </div>
        )}

        {tab === "payout" && (
          <Card
            title="Payout account"
            description="Every payout for your orders lands here, in the stages of your payout plan. The account can be in your business name or your own name."
          >
            <div id="payout" className="flex flex-col gap-4">
              <Field label="Bank">
                <select defaultValue={bank.bankName} className={inputClass}>
                  {BANKS.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </Field>
              <Field label="Account number">
                <input
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  inputMode="numeric"
                  className={`${inputClass} font-mono tracking-wider`}
                />
              </Field>
              {resolved && (
                <div className="flex items-center gap-3 rounded-2xl bg-good-soft px-4 py-3 text-sm">
                  <Check size={18} className="text-good" />
                  <span>
                    <b>{bank.accountName}</b>
                    <br />
                    <span className="text-good">{PAYOUT_MATCH_LABEL[payoutNameMatch(bank.accountName) ?? "business"]}</span>
                  </span>
                </div>
              )}
              <button disabled={!resolved} className={btn.dark}>
                Save payout account
              </button>
            </div>
          </Card>
        )}

        {tab === "notifications" && (
          <Card title="Notifications">
            <div className="flex flex-col divide-y divide-line">
              <Toggle locked on onChange={() => {}} label="New orders by email" hint="Always on. You have 24 hours to accept each order, so we never stop these emails." />
              <Toggle on={notify.newOrderSms} onChange={(v) => setNotify({ ...notify, newOrderSms: v })} label="New orders by SMS" />
              <div>
                <Toggle on={notify.whatsapp} onChange={(v) => setNotify({ ...notify, whatsapp: v })} label="New orders on WhatsApp" hint="From Sotechy's official WhatsApp, with the order and a link to accept it." />
                {notify.whatsapp && (
                  <div className="mb-3 flex flex-col gap-3 rounded-2xl bg-surface-alt p-3">
                    <Field label="Your WhatsApp number">
                      <input
                        value={waNumber}
                        onChange={(e) => {
                          setWaNumber(e.target.value);
                          setWaTest(false);
                        }}
                        inputMode="tel"
                        className={inputClass}
                      />
                    </Field>
                    {waTest ? (
                      <p className="flex items-center gap-2 text-sm text-good">
                        <Check size={16} /> Test message sent. Check WhatsApp and save Sotechy Shop as a contact.
                      </p>
                    ) : (
                      <button type="button" onClick={() => setWaTest(true)} disabled={waNumber.replace(/\D/g, "").length < 10} className={`${btn.outline} self-start`}>
                        Send a test message
                      </button>
                    )}
                  </div>
                )}
              </div>
              <Toggle on={notify.payouts} onChange={(v) => setNotify({ ...notify, payouts: v })} label="Payouts sent" />
              <Toggle on={notify.reviews} onChange={(v) => setNotify({ ...notify, reviews: v })} label="New reviews" />
              <Toggle on={notify.weekly} onChange={(v) => setNotify({ ...notify, weekly: v })} label="Weekly summary" />
            </div>
          </Card>
        )}

        {tab === "security" && (
          <Card title="Sign-in and security">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">Authenticator app</p>
                  <p className="text-sm text-muted">Extra code when you sign in.</p>
                </div>
                <button className={btn.outline}>Set up</button>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">Password</p>
                  <p className="text-sm text-muted">Signed in as {user.email}</p>
                </div>
                <button className={btn.outline}>Change</button>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">Devices</p>
                  <p className="text-sm text-muted">Sign out everywhere else.</p>
                </div>
                <button className={btn.danger}>Sign out others</button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
