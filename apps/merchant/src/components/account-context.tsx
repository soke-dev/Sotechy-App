"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { MerchantStore, User } from "@sotechy/shared";

export interface Account {
  user: User;
  store: MerchantStore;
}

const AccountContext = createContext<Account | null>(null);

/** The signed-in owner and their store, for client pages inside the dashboard */
export function AccountProvider({ value, children }: { value: Account; children: ReactNode }) {
  return <AccountContext value={value}>{children}</AccountContext>;
}

export function useAccount() {
  const account = useContext(AccountContext);
  if (!account) throw new Error("useAccount must be used inside the dashboard");
  return account;
}
