import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ApiError, createApiClient, type User } from "@sotechy/shared";

export const TOKEN_COOKIE = "sotechy_admin_token";

export const api = createApiClient({
  baseUrl: process.env.API_URL ?? "http://localhost:4000",
  getToken: async () => (await cookies()).get(TOKEN_COOKIE)?.value,
  fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
});

/** Loads an admin endpoint. Signed-out users go to /login; other errors are returned for display. */
export async function load<T>(path: string): Promise<{ data: T | null; error: string | null }> {
  let status = 0;
  try {
    return { data: await api.get<T>(path), error: null };
  } catch (err) {
    status = err instanceof ApiError ? err.status : 0;
    if (status !== 401) return { data: null, error: err instanceof Error ? err.message : "Failed to load" };
  }
  redirect("/login");
}

export async function getCurrentUser(): Promise<User> {
  try {
    return await api.me();
  } catch {
    redirect("/login");
  }
}

export function errorMessage(err: unknown) {
  if (err instanceof ApiError && err.details) {
    const issues = (err.details as { issues?: { message: string }[] })?.issues;
    if (issues?.length) return issues.map((i) => i.message).join(", ");
  }
  return err instanceof Error ? err.message : "Something went wrong";
}
