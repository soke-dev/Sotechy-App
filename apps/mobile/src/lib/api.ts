import { createApiClient, type ApiClient } from "@sotechy/shared";

// The live API unless EXPO_PUBLIC_API_URL points elsewhere (e.g. http://<your-computer-LAN-IP>:4000 for a local one)
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || "https://api.sotechy.shop").replace(/\/$/, "");

let token: string | null = null;
export const setApiToken = (value: string | null) => {
  token = value;
};

export const api: ApiClient = createApiClient({ baseUrl: API_URL, getToken: () => token });

/** Uploads a photo from the phone (e.g. for a review) and returns its public URL */
export async function uploadPhoto(photo: { uri: string; mimeType?: string | null; fileName?: string | null }) {
  const form = new FormData();
  const type = photo.mimeType ?? "image/jpeg";
  // React Native's FormData takes a { uri, name, type } file
  form.append("file", { uri: photo.uri, name: photo.fileName ?? `photo.${type.split("/")[1] ?? "jpg"}`, type } as unknown as Blob);
  const res = await fetch(`${API_URL}/me/media`, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form });
  const body = (await res.json().catch(() => null)) as { url: string }[] | { error?: string } | null;
  if (!res.ok || !Array.isArray(body)) throw new Error((body as { error?: string } | null)?.error ?? "Couldn't upload the photo");
  return body[0].url;
}
