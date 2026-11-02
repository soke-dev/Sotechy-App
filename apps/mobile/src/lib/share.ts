// Links people can share. They open the store in the Sotechy app when it's installed (App Links /
// Universal Links on app.sotechy.shop), and in the web app at the same address when it isn't.
import * as Clipboard from "expo-clipboard";
import { Platform, Share } from "react-native";

export const APP_SITE = "https://app.sotechy.shop";

export const storeLink = (slug: string) => `${APP_SITE}/store/${encodeURIComponent(slug)}`;

/** The share sheet with the store's link; where there's none (most computers), the link is copied. Returns "copied" then. */
export async function shareStore(store: { slug: string; name: string }): Promise<"shared" | "copied" | "cancelled"> {
  const url = storeLink(store.slug);
  const message = `${store.name} on Sotechy: ${url}`;
  const nav = Platform.OS === "web" ? (globalThis.navigator as Navigator | undefined) : undefined;
  if (Platform.OS === "web" && !nav?.share) {
    await Clipboard.setStringAsync(url);
    return "copied";
  }
  try {
    // iOS shares the url on its own; Android takes it inside the message
    const r = await Share.share(Platform.OS === "ios" ? { message: `${store.name} on Sotechy`, url } : { message, title: store.name });
    return r.action === Share.dismissedAction ? "cancelled" : "shared";
  } catch {
    await Clipboard.setStringAsync(url);
    return "copied";
  }
}
