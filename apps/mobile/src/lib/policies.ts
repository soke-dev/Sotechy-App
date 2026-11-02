// Sotechy's terms and policies live on sotechy.shop; the app opens them in an in-app browser
import * as WebBrowser from "expo-web-browser";
import { colors } from "./theme";

export type PolicySlug = "terms" | "payments" | "delivery" | "returns" | "warranty" | "rewards" | "privacy";

const SITE = "https://sotechy.shop";

/** One policy, or all of them on one page when no slug is given */
export const policyUrl = (slug?: PolicySlug) => `${SITE}/${slug ?? "policies"}`;

export function openPolicy(slug?: PolicySlug) {
  return WebBrowser.openBrowserAsync(policyUrl(slug), { controlsColor: colors.brand, toolbarColor: colors.bg }).catch(() => null);
}
