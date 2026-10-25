import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "sotechy_token";

/** Auth token: Keychain/Keystore on native, localStorage on web. */
export const tokenStore = {
  async get(): Promise<string | null> {
    if (Platform.OS === "web") return globalThis.localStorage?.getItem(TOKEN_KEY) ?? null;
    return SecureStore.getItemAsync(TOKEN_KEY);
  },
  async set(value: string) {
    if (Platform.OS === "web") globalThis.localStorage?.setItem(TOKEN_KEY, value);
    else await SecureStore.setItemAsync(TOKEN_KEY, value);
  },
  async clear() {
    if (Platform.OS === "web") globalThis.localStorage?.removeItem(TOKEN_KEY);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};
