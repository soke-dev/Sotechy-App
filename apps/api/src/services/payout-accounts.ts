// A store's payout accounts: up to 3, each checked with the bank. Payouts always go to the default one,
// which is copied onto the store (so the payout code only ever reads the store). Changing the default
// emails the owner, so a takeover of their dashboard can't quietly redirect their money.
import { and, asc, eq, ne } from "drizzle-orm";
import { db, schema } from "../db/client";
import { audit } from "../lib/audit";
import { badRequest, notFound } from "../lib/errors";
import { sendEmailLater } from "../lib/email";
import { accountNameMatch } from "../lib/identity";
import { payoutAccountChangedEmail } from "../emails/templates";
import { railBanks, railRecipient, railResolve } from "./payout-rail";

export const MAX_PAYOUT_ACCOUNTS = 3;
const accounts = schema.payoutAccounts;
type Store = typeof schema.merchants.$inferSelect;

const view = (a: typeof accounts.$inferSelect) => ({
  id: a.id,
  bankCode: a.bankCode,
  bankName: a.bankName,
  accountNumber: a.accountNumber,
  accountName: a.accountName,
  match: a.match as "business" | "owner" | null,
  isDefault: a.isDefault,
  verifiedAt: a.verifiedAt.toISOString(),
});

export const payoutAccountsOf = async (merchantId: string) =>
  (await db.select().from(accounts).where(eq(accounts.merchantId, merchantId)).orderBy(asc(accounts.createdAt))).map(view);

async function ownerOf(store: Store) {
  if (!store.ownerId) return null;
  const [owner] = await db.select({ fullName: schema.users.fullName, email: schema.users.email }).from(schema.users).where(eq(schema.users.id, store.ownerId));
  return owner ?? null;
}

/** Checks an account with the bank and adds it (or refreshes it if it's already there) */
export async function addPayoutAccount(store: Store, actorId: string, input: { bankCode: string; accountNumber: string; makeDefault?: boolean }) {
  const bank = (await railBanks()).find((b) => b.code === input.bankCode);
  if (!bank) throw badRequest("Choose your bank from the list");
  const existing = await db.select().from(accounts).where(eq(accounts.merchantId, store.id));
  const same = existing.find((a) => a.bankCode === bank.code && a.accountNumber === input.accountNumber);
  if (!same && existing.length >= MAX_PAYOUT_ACCOUNTS) throw badRequest(`You can keep up to ${MAX_PAYOUT_ACCOUNTS} payout accounts. Remove one first.`);
  const owner = await ownerOf(store);
  const accountName = await railResolve(bank.code, input.accountNumber, owner?.fullName ?? store.name);
  const match = accountNameMatch(accountName, [store.name, store.application?.registeredName], owner?.fullName ?? "");
  const values = { bankName: bank.name, accountName, match, verifiedAt: new Date() };
  const [row] = same
    ? await db.update(accounts).set(values).where(eq(accounts.id, same.id)).returning()
    : await db.insert(accounts).values({ ...values, merchantId: store.id, bankCode: bank.code, accountNumber: input.accountNumber }).returning();
  await audit(db, { actorId, action: "merchant.payout_account_added", entityType: "merchant", entityId: store.id, details: { bank: bank.name, last4: input.accountNumber.slice(-4), match } });
  if (input.makeDefault || existing.length === 0 || row.isDefault) await makeDefault(store, actorId, row.id);
  const [fresh] = await db.select().from(accounts).where(eq(accounts.id, row.id));
  return view(fresh);
}

/** Every payout from now on goes to this account */
export async function makeDefault(store: Store, actorId: string, accountId: string) {
  const [account] = await db.select().from(accounts).where(and(eq(accounts.id, accountId), eq(accounts.merchantId, store.id)));
  if (!account) throw notFound("Payout account not found");
  const owner = await ownerOf(store);
  // With Bachs, the store's account there is pointed at this bank account
  const recipientId = await railRecipient({
    existingId: store.payoutRecipientId,
    storeId: store.id,
    storeName: store.name,
    email: store.contactEmail ?? owner?.email ?? "",
    ownerName: owner?.fullName ?? store.name,
    bankCode: account.bankCode,
    accountNumber: account.accountNumber,
    accountName: account.accountName,
  });
  const wasDefault = account.isDefault && store.payoutAccountNumber === account.accountNumber;
  await db.transaction(async (tx) => {
    await tx.update(accounts).set({ isDefault: false }).where(and(eq(accounts.merchantId, store.id), ne(accounts.id, account.id)));
    await tx.update(accounts).set({ isDefault: true }).where(eq(accounts.id, account.id));
    await tx
      .update(schema.merchants)
      .set({
        payoutBankCode: account.bankCode,
        payoutBankName: account.bankName,
        payoutAccountNumber: account.accountNumber,
        payoutAccountName: account.accountName,
        payoutAccountMatch: account.match,
        payoutVerifiedAt: account.verifiedAt,
        payoutRecipientId: recipientId ?? store.payoutRecipientId,
        // Setup shows the same account
        application: { ...(store.application ?? {}), bank: { bankName: account.bankName, accountNumber: account.accountNumber } } as Store["application"],
      })
      .where(eq(schema.merchants.id, store.id));
  });
  await audit(db, { actorId, action: "merchant.payout_account_default", entityType: "merchant", entityId: store.id, details: { bank: account.bankName, last4: account.accountNumber.slice(-4) } });
  const to = store.contactEmail ?? owner?.email;
  if (!wasDefault && store.payoutAccountNumber && to) {
    sendEmailLater(payoutAccountChangedEmail(to, { name: owner?.fullName ?? null, store: store.name, bank: account.bankName, last4: account.accountNumber.slice(-4), accountName: account.accountName }));
  }
}

export async function removePayoutAccount(store: Store, actorId: string, accountId: string) {
  const [account] = await db.select().from(accounts).where(and(eq(accounts.id, accountId), eq(accounts.merchantId, store.id)));
  if (!account) throw notFound("Payout account not found");
  if (account.isDefault) throw badRequest("Payouts go to this account. Make another one the default first.");
  await db.delete(accounts).where(eq(accounts.id, account.id));
  await audit(db, { actorId, action: "merchant.payout_account_removed", entityType: "merchant", entityId: store.id, details: { bank: account.bankName, last4: account.accountNumber.slice(-4) } });
}
