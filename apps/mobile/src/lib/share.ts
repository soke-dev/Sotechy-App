// Links people can share. They open the store in the Sotechy app when it's installed (App Links /
// Universal Links on app.sotechy.shop), and in the web app at the same address when it isn't.
import * as Clipboard from "expo-clipboard";
import { Platform, Share } from "react-native";

export const APP_SITE = "https://app.sotechy.shop";

export const storeLink = (slug: string) => `${APP_SITE}/store/${encodeURIComponent(slug)}`;

/** The share sheet with a link; where there's none (most computers), the link is copied. Returns "copied" then. */
export async function shareLink({ url, title, message }: { url: string; title: string; message: string }): Promise<"shared" | "copied" | "cancelled"> {
  const nav = Platform.OS === "web" ? (globalThis.navigator as Navigator | undefined) : undefined;
  if (Platform.OS === "web" && !nav?.share) {
    await Clipboard.setStringAsync(url);
    return "copied";
  }
  try {
    // iOS shares the url on its own; Android takes it inside the message
    const r = await Share.share(Platform.OS === "ios" ? { message: title, url } : { message: `${message} ${url}`, title });
    return r.action === Share.dismissedAction ? "cancelled" : "shared";
  } catch {
    await Clipboard.setStringAsync(url);
    return "copied";
  }
}

/** The share sheet with the store's link */
export const shareStore = (store: { slug: string; name: string }) => shareLink({ url: storeLink(store.slug), title: `${store.name} on Sotechy`, message: `${store.name} on Sotechy:` });
