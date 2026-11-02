// Google OAuth via expo-auth-session. Only imported from google-button.tsx when the native
// crypto module exists. Returns Google's ID token; the API verifies it before signing the user in.
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";
import { Platform } from "react-native";
import { GOOGLE_CLIENT_IDS, GoogleButtonView, type GoogleButtonProps } from "./google-button";

WebBrowser.maybeCompleteAuthSession();

export function GoogleAuthButton({ onIdToken, onError, busy }: GoogleButtonProps) {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: GOOGLE_CLIENT_IDS.ios,
    androidClientId: GOOGLE_CLIENT_IDS.android,
    webClientId: GOOGLE_CLIENT_IDS.web,
    ...(Platform.OS === "web" && typeof window !== "undefined" ? { redirectUri: `${window.location.origin}/sign-in` } : null),
    selectAccount: true,
  });

  useEffect(() => {
    if (response?.type === "success") {
      const idToken = response.params.id_token;
      if (idToken) onIdToken(idToken);
      else onError("Google didn't return a sign-in token. Please try again.");
    } else if (response?.type === "error") {
      onError(response.error?.message ?? "Google sign-in failed. Please try again.");
    }
  }, [response, onIdToken, onError]);

  return <GoogleButtonView busy={busy} disabled={!request} onPress={() => promptAsync()} />;
}
