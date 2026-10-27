import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ApiError, createApiClient, type User } from "@sotechy/shared";

export const TOKEN_COOKIE = "sotechy_admin_session";

export const api = createApiClient({
  baseUrl: process.env.API_URL ?? "http://localhost:4000",
  getToken: async () => (await cookies()).get(TOKEN_COOKIE)?.value,
  fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
});

/** Sends to an endpoint that needs the admin's password again */
export const withPassword = <T>(method: "POST" | "PUT" | "PATCH", path: string, body: unknown, password: string) =>
  api.request<T>(path, { method, body: JSON.stringify(body), headers: { "x-confirm-password": password } });

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

/** Uploads images to the API (served at /media/:id) and returns their public URLs. Empty file inputs are skipped. */
export async function uploadImages(files: FormDataEntryValue[]): Promise<string[]> {
  const images = files.filter((f): f is File => f instanceof File && f.size > 0);
  if (images.length === 0) return [];
  const body = new FormData();
  for (const file of images) body.append("file", file, file.name);
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  const res = await fetch(`${(process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "")}/admin/media`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body,
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, json?.error ?? "Upload failed");
  return (json as { url: string }[]).map((m) => m.url);
}

export function errorMessage(err: unknown) {
  if (err instanceof ApiError && err.details) {
    const issues = (err.details as { issues?: { message: string }[] })?.issues;
    if (issues?.length) return issues.map((i) => i.message).join(", ");
  }
  return err instanceof Error ? err.message : "Something went wrong";
}
