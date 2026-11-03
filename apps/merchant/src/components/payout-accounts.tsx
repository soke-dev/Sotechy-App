"use client";

// Settings → Payout accounts: up to 3 bank accounts, one of them the default that every payout goes to.
import { AlertTriangle, Check, Plus, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { addPayoutAccount, listPayoutAccounts, makeDefaultPayoutAccount, removePayoutAccount, type StorePayoutAccount } from "@/lib/market-actions";
import { Illo } from "./illustrations";
import { PayoutAccountForm } from "./payout-account-form";
import { btn, Card, Pill } from "./ui";
import { Sheet } from "./zone-form";

const MAX = 3;
const MATCH = { business: "Your business name", owner: "Your own name" } as const;

export function PayoutAccounts() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<StorePayoutAccount[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState<{ kind: "default" | "remove"; account: StorePayoutAccount } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();

  const load = () => listPayoutAccounts().then((r) => ("ok" in r ? setAccounts(r.ok) : setError(r.error)));
  useEffect(() => {
    void load();
  }, []);

  const act = () =>
    start(async () => {
      if (!confirm) return;
      setError(null);
      const r = confirm.kind === "default" ? await makeDefaultPayoutAccount(confirm.account.id) : await removePayoutAccount(confirm.account.id);
      if ("error" in r) return setError(r.error);
      setAccounts(r.ok);
      setConfirm(null);
      router.refresh();
    });

  const list = accounts ?? [];
  const full = list.length >= MAX;

  return (
    <Card
      title="Payout accounts"
      description="Every payout for your orders goes to your default account. Keep up to 3, in your business name or your own name."
      actions={
        <button type="button" disabled={full || accounts === null} onClick={() => setAdding(true)} className={btn.outline}>
          <Plus size={16} /> Add account
        </button>
      }
    >
      {error && <p className="mb-4 rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}
      {accounts === null ? (
        <div className="h-24 animate-pulse rounded-2xl bg-surface-alt" />
      ) : list.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-line p-5">
          <Illo name="bank" size={40} />
          <p className="font-semibold">No payout account yet</p>
          <p className="text-sm text-muted">Add the account your money should go to. We check the name with your bank.</p>
          <button type="button" onClick={() => setAdding(true)} className={btn.dark}>
            <Plus size={16} /> Add your first account
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((a) => (
            <li key={a.id} className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:gap-4 ${a.isDefault ? "border-ink bg-surface" : "border-line bg-surface-alt/40"}`}>
              {/* The account: full width on a phone, the buttons go under it */}
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft">
                  <Illo name="bank" size={28} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold">
                    <span className="min-w-0 break-words">{a.accountName}</span>
                    {a.isDefault && (
                      <Pill tone="dark" dot={false}>
                        Default
                      </Pill>
                    )}
                  </p>
                  <p className="text-sm text-muted">
                    {a.bankName} · ••••{a.accountNumber.slice(-4)}
                  </p>
                  {a.match ? (
                    <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-good">
                      <Check size={13} className="shrink-0" /> {MATCH[a.match]}
                    </p>
                  ) : (
                    <p className="mt-0.5 flex items-start gap-1 text-xs font-semibold text-warn">
                      <AlertTriangle size={13} className="mt-px shrink-0" /> Name doesn&apos;t match; Sotechy reviews payouts to it
                    </p>
                  )}
                </div>
              </div>
              {!a.isDefault && (
                <div className="flex gap-2 sm:shrink-0">
                  <button type="button" disabled={busy} onClick={() => setConfirm({ kind: "default", account: a })} className={`${btn.outline} flex-1 sm:flex-none`}>
                    <Star size={15} /> Make default
                  </button>
                  <button type="button" disabled={busy} onClick={() => setConfirm({ kind: "remove", account: a })} aria-label={`Remove ${a.bankName} account`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line text-muted hover:border-bad hover:text-bad">
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {list.length > 0 && (
        <p className="mt-4 text-xs text-muted">
          {full ? "You have 3 accounts, the most you can keep. Remove one to add another." : `You can add ${MAX - list.length} more.`} When you change your default, we email you so you know.
        </p>
      )}

      <Sheet open={adding} onClose={() => setAdding(false)} title="Add a payout account">
        <PayoutAccountForm
          saved={null}
          submitLabel={list.length ? "Check and add account" : "Check and save account"}
          save={async (input) => {
            const r = await addPayoutAccount(input);
            if ("error" in r) return r;
            return { ok: { bankCode: r.ok.bankCode, bankName: r.ok.bankName, accountNumber: r.ok.accountNumber, accountName: r.ok.accountName, match: r.ok.match, verifiedAt: r.ok.verifiedAt } };
          }}
          onSaved={() => {
            setAdding(false);
            void load();
          }}
        />
      </Sheet>

      <Sheet open={confirm !== null} onClose={() => setConfirm(null)} title={confirm?.kind === "default" ? "Make this your default?" : "Remove this account?"}>
        {confirm && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-2">
              {confirm.kind === "default" ? (
                <>
                  From now on every payout goes to <b>{confirm.account.accountName}</b>, {confirm.account.bankName} ••••{confirm.account.accountNumber.slice(-4)}. Payouts already on their way aren&apos;t changed. We&apos;ll email you to confirm.
                </>
              ) : (
                <>
                  <b>{confirm.account.bankName} ••••{confirm.account.accountNumber.slice(-4)}</b> will be removed. You can add it again later.
                </>
              )}
            </p>
            <button type="button" disabled={busy} onClick={act} className={confirm.kind === "default" ? btn.dark : btn.outline}>
              {busy ? "Saving…" : confirm.kind === "default" ? "Make default" : "Remove account"}
            </button>
          </div>
        )}
      </Sheet>
    </Card>
  );
}
