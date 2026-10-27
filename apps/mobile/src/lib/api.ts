import { File, UploadType } from "expo-file-system";
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
