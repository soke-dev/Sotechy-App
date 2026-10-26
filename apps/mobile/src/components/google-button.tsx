// "Continue with Google". The OAuth flow lives in ./google-auth, which is only loaded when the
// native crypto module is present (older dev builds don't have it, and importing it would crash).
import { requireOptionalNativeModule } from "expo";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { ActivityIndicator, Platform, Pressable, Text } from "react-native";
import Svg, { Path } from "react-native-svg";
import { DEMO_MODE } from "@/lib/api";
import { colors, fonts, radius } from "@/lib/theme";

export interface GoogleButtonProps {
  onIdToken: (idToken: string) => void;
  onError: (message: string) => void;
  busy?: boolean;
  /** While testing in Expo Go, where real Google sign-in can't run: sign in with a test account instead */
  onTest?: () => void;
}

export const GOOGLE_CLIENT_IDS = {
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
};

// Expo Go can't do Google sign-in: Google only sends people back to the real app (its own link scheme)
const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const nativeReady = Platform.OS === "web" || !!requireOptionalNativeModule("ExpoCrypto");
const configured = !!Platform.select({ ios: GOOGLE_CLIENT_IDS.ios, android: GOOGLE_CLIENT_IDS.android, default: GOOGLE_CLIENT_IDS.web });

function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <Path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <Path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <Path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </Svg>
  );
}

export function GoogleButtonView({ onPress, busy, disabled }: { onPress: () => void; busy?: boolean; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy || disabled}
      accessibilityRole="button"
      style={({ pressed }) => ({
        height: 52,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        opacity: disabled ? 0.5 : 1,
      })}
    >
      {busy ? <ActivityIndicator color={colors.ink} /> : <GoogleLogo />}
      <Text style={{ fontFamily: fonts.semibold, fontSize: 15.5, color: colors.ink }}>Continue with Google</Text>
    </Pressable>
  );
}

export function GoogleButton({ onIdToken, onError, busy, onTest }: GoogleButtonProps) {
  if (DEMO_MODE) return <GoogleButtonView busy={busy} onPress={() => onIdToken("demo-google-id-token")} />;
  if (inExpoGo) return <GoogleButtonView busy={busy} onPress={() => (onTest ? onTest() : onError("Google sign-in doesn't work in Expo Go. Use your email and password here."))} />;
  if (!nativeReady) return <GoogleButtonView onPress={() => onError("Google sign-in needs the latest app build. Please update the app.")} />;
  if (!configured) return <GoogleButtonView onPress={() => onError("Google sign-in isn't set up yet.")} />;
  // Loaded lazily so the module (and expo-crypto) is only evaluated when it can work.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { GoogleAuthButton } = require("./google-auth") as typeof import("./google-auth");
  return <GoogleAuthButton onIdToken={onIdToken} onError={onError} busy={busy} />;
}
