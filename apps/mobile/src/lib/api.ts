import { createApiClient } from "@sotechy/shared";

// Android emulator: http://10.0.2.2:4000 · physical device: http://<your-computer-LAN-IP>:4000
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

let token: string | null = null;
export const setApiToken = (value: string | null) => {
  token = value;
};

export const api = createApiClient({ baseUrl: API_URL, getToken: () => token });
