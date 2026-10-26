import { cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import { ApiError, createApiClient, type MerchantSession } from "@sotechy/shared";

export const TOKEN_COOKIE = "sotechy_merchant_token";

export const api = createApiClient({
  baseUrl: process.env.API_URL ?? "http://localhost:4000",
  getToken: async () => (await cookies()).get(TOKEN_COOKIE)?.value,
  fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
});

/** The signed-in account and its store, once per request. Expired sessions are cleared and go to /login. */
export const getSession = cache(async (): Promise<MerchantSession> => {
  try {
    return await api.merchantMe();
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirect("/logout");
    throw err;
  }
});

/** Like getSession, but also sends accounts without a store to finish opening one */
export async function getStoreSession() {
  const session = await getSession();
  if (!session.store) redirect("/signup?step=store");
  return { user: session.user, store: session.store };
}

export function errorMessage(err: unknown) {
  if (err instanceof ApiError && err.details) {
    const issues = (err.details as { issues?: { message: string }[] })?.issues;
    if (issues?.length) return issues.map((i) => i.message).join(", ");
  }
  if (err instanceof TypeError) return "Can't reach Sotechy right now. Try again in a moment.";
  return err instanceof Error ? err.message : "Something went wrong";
}
