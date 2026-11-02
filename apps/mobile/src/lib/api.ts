import { File, UploadType } from "expo-file-system";
import { Platform } from "react-native";
import { createApiClient, type ApiClient } from "@sotechy/shared";

// The live API unless EXPO_PUBLIC_API_URL points elsewhere (e.g. http://<your-computer-LAN-IP>:4000 for a local one)
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || "https://api.sotechy.shop").replace(/\/$/, "");

let token: string | null = null;
export const setApiToken = (value: string | null) => {
  token = value;
};

export const api: ApiClient = createApiClient({ baseUrl: API_URL, getToken: () => token });

/** Uploads a photo from the phone (e.g. for a review) and returns its public URL.
 *  Sent by expo-file-system: Expo's fetch doesn't take React Native's { uri, name, type } form parts. */
export async function uploadPhoto(photo: { uri: string; mimeType?: string | null; fileName?: string | null }) {
  const type = photo.mimeType ?? "image/jpeg";
  if (Platform.OS === "web") return uploadFromBrowser(photo.uri, type, photo.fileName ?? "photo.jpg");
  const res = await new File(photo.uri).upload(`${API_URL}/me/media`, {
    uploadType: UploadType.MULTIPART,
    fieldName: "file",
    mimeType: type,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  let body: { url: string }[] | { error?: string } | null = null;
  try {
    body = JSON.parse(res.body);
  } catch {
    // Not JSON: reported below
  }
  if (res.status >= 300 || !Array.isArray(body)) throw new Error((body as { error?: string } | null)?.error ?? "Couldn't upload the photo");
  return body[0].url;
}

/** In a browser the picked photo is a blob: or data: address, sent as an ordinary form upload */
async function uploadFromBrowser(uri: string, type: string, name: string) {
  const blob = await (await fetch(uri)).blob();
  const form = new FormData();
  form.append("file", new globalThis.File([blob], name, { type: blob.type || type }));
  const res = await fetch(`${API_URL}/me/media`, { method: "POST", body: form, headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const body = (await res.json().catch(() => null)) as { url: string }[] | { error?: string } | null;
  if (!res.ok || !Array.isArray(body)) throw new Error((body as { error?: string } | null)?.error ?? "Couldn't upload the photo");
  return body[0].url;
}
