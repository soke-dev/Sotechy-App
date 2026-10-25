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
