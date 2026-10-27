import { createApiClient, type ApiClient } from "@sotechy/shared";
import { mockApi } from "./mock-api";

// Android emulator: http://10.0.2.2:4000 · physical device: http://<your-computer-LAN-IP>:4000
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

/** Demo mode: dummy in-app data, no backend needed. On when no API URL is set or EXPO_PUBLIC_USE_MOCK=true. */
export const DEMO_MODE = process.env.EXPO_PUBLIC_USE_MOCK === "true" || !API_URL;

let token: string | null = null;
export const setApiToken = (value: string | null) => {
  token = value;
};

export const api: ApiClient = DEMO_MODE ? mockApi : createApiClient({ baseUrl: API_URL, getToken: () => token });

/** Uploads a photo from the phone (e.g. for a review) and returns its public URL */
export async function uploadPhoto(photo: { uri: string; mimeType?: string | null; fileName?: string | null }) {
  if (DEMO_MODE) return photo.uri;
  const form = new FormData();
  const type = photo.mimeType ?? "image/jpeg";
  // React Native's FormData takes a { uri, name, type } file
  form.append("file", { uri: photo.uri, name: photo.fileName ?? `photo.${type.split("/")[1] ?? "jpg"}`, type } as unknown as Blob);
  const res = await fetch(`${API_URL}/me/media`, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form });
  const body = (await res.json().catch(() => null)) as { url: string }[] | { error?: string } | null;
  if (!res.ok || !Array.isArray(body)) throw new Error((body as { error?: string } | null)?.error ?? "Couldn't upload the photo");
  return body[0].url;
}
