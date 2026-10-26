import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GoogleButton } from "@/components/google-button";
import { useFeatures } from "@/lib/store-config";
import { Illo } from "@/components/illustrations";
import { Burst } from "@/components/tab-icons";
import { Button, Input, Txt, ui } from "@/components/ui";
import { API_URL, DEMO_MODE } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors, fonts, gutter, radius, space } from "@/lib/theme";

type Mode = "signin" | "signup";

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [chosenMode, setMode] = useState<Mode>("signin");
  const features = useFeatures();
  // With sign-ups switched off in admin, only signing in is offered.
  const mode: Mode = features.signups ? chosenMode : "signin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState<"email" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const done = () => (router.canGoBack() ? router.back() : router.replace("/"));
  // New accounts pick a username (and optionally numbers) first
  const welcome = () => router.replace("/welcome");

  /** Turns "Network request failed" into something a person can act on */
  const explain = (err: unknown, fallback: string) => {
    const msg = err instanceof Error ? err.message : fallback;
    if (/network request failed|failed to fetch|load failed|networkerror/i.test(msg))
      return `Can't reach Sotechy right now${API_URL ? ` (${API_URL})` : ""}. Check your internet, or that this phone is on the same Wi-Fi as the computer running the server.`;
    return msg;
  };

  async function submit() {
    setLoading("email");
    setError(null);
    try {
      if (mode === "signin") {
        await signIn(email.trim(), password);
        done();
      } else {
        await signUp({ email: email.trim(), password, fullName: fullName || undefined });
        welcome();
      }
    } catch (err) {
      setError(explain(err, "Something went wrong"));
    } finally {
      setLoading(null);
    }
  }

  const onGoogleToken = useCallback(
    async (idToken: string) => {
      setLoading("google");
      setError(null);
      try {
        const firstTime = await signInWithGoogle(idToken);
        if (firstTime) welcome();
        else done();
      } catch (err) {
        setError(explain(err, "Google sign-in failed"));
      } finally {
        setLoading(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signInWithGoogle],
  );
  const onGoogleError = useCallback((message: string) => setError(message), []);

  // Expo Go can't run real Google sign-in, so while testing it signs in a test Google account by email
  async function testGoogle() {
    setLoading("google");
    setError(null);
    const test = { email: "google.tester@example.com", password: "google-test-123", fullName: "Google Tester" };
    try {
      try {
        await signIn(test.email, test.password);
        done();
      } catch {
        await signUp(test);
        welcome();
      }
    } catch (err) {
      setError(explain(err, "Test Google sign-in failed"));
    } finally {
      setLoading(null);
    }
  }

  const switchMode = () => {
    setMode(mode === "signin" ? "signup" : "signin");
    setError(null);
  };

  return (
    <KeyboardAvoidingView style={ui.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Compact header: illustrated sticker cluster in the tab-bar style */}
        <View style={{ paddingTop: insets.top + space.sm, paddingHorizontal: gutter }}>
          <View style={ui.between}>
            <Pressable onPress={done} hitSlop={10} accessibilityLabel="Close" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="close" size={20} color={colors.ink} />
            </Pressable>
            <Image source={require("../../assets/brand/light-logo-small.png")} style={{ width: 96, height: 40 }} contentFit="contain" />
            <View style={{ width: 40 }} />
          </View>
          <View style={{ height: 116, marginTop: space.xs }}>
            {[
              { el: <Burst size={116} />, size: 116, x: 0, y: 0, r: "0deg" },
              { el: <Illo name="user" size={70} />, size: 70, x: 0, y: 2, r: "0deg" },
              { el: <Illo name="bag" size={42} />, size: 42, x: -96, y: -26, r: "-12deg" },
              { el: <Illo name="box" size={38} />, size: 38, x: 92, y: 28, r: "10deg" },
              { el: <Illo name="heart" size={28} />, size: 28, x: 74, y: -34, r: "14deg" },
              { el: <Illo name="sparkle" size={30} />, size: 30, x: -80, y: 34, r: "0deg" },
            ].map((s, i) => (
              <View key={i} style={{ position: "absolute", left: "50%", top: "50%", marginLeft: s.x - s.size / 2, marginTop: s.y - s.size / 2, transform: [{ rotate: s.r }] }}>
                {s.el}
              </View>
            ))}
          </View>
        </View>

        <View style={{ paddingHorizontal: gutter, gap: space.lg, marginTop: space.lg }}>
          <View style={{ gap: 6, alignItems: "center" }}>
            <Txt variant="display" style={{ fontSize: 30, lineHeight: 34, textAlign: "center" }}>{mode === "signin" ? "Welcome back" : "Create your account"}</Txt>
            <Txt variant="small" style={{ fontSize: 14, textAlign: "center", maxWidth: 300 }}>
              {mode === "signin" ? "Sign in to check out faster and follow your orders." : "Save your details, track orders and get deals first."}
            </Txt>
          </View>

          {features.googleSignIn && (
            <>
              <GoogleButton onIdToken={onGoogleToken} onError={onGoogleError} onTest={testGoogle} busy={loading === "google"} />
              <View style={[ui.row, { gap: space.md }]}>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
                <Txt variant="caption">or use email</Txt>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
              </View>
            </>
          )}

          {mode === "signup" && (
            <>
              <Input label="Full name" icon="person-outline" value={fullName} onChangeText={setFullName} autoComplete="name" placeholder="e.g. Ada Okafor" />
            </>
          )}
          <Input label="Email" icon="mail-outline" autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} placeholder="you@example.com" />
          <View>
            <Input
              label="Password"
              icon="lock-closed-outline"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={10} accessibilityLabel={showPassword ? "Hide password" : "Show password"} style={{ position: "absolute", right: 14, bottom: 15 }}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={19} color={colors.muted} />
            </Pressable>
          </View>

          {error && (
            <View style={{ flexDirection: "row", gap: space.sm, backgroundColor: colors.dangerSoft, borderRadius: radius.md, padding: space.md }}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Txt variant="small" color={colors.danger} style={{ flex: 1 }}>{error}</Txt>
            </View>
          )}

          <Button
            title={mode === "signin" ? "Sign in" : "Create account"}
            variant="dark"
            icon="arrow-forward"
            onPress={submit}
            loading={loading === "email"}
            disabled={!email || password.length < (mode === "signup" ? 8 : 1) || loading === "google"}
          />

          {features.signups && (
            <Pressable onPress={switchMode} style={{ alignSelf: "center", paddingVertical: space.sm }}>
              <Txt variant="small" style={{ fontSize: 14 }}>
                {mode === "signin" ? "New to Sotechy? " : "Already have an account? "}
                <Txt variant="label" color={colors.brandPressed} style={{ fontSize: 14 }}>{mode === "signin" ? "Create an account" : "Sign in"}</Txt>
              </Txt>
            </Pressable>
          )}

          <Txt variant="caption" style={{ textAlign: "center", fontFamily: fonts.medium }}>
            {DEMO_MODE ? "Demo mode: any email and password, or Google, signs you in." : "By continuing you agree to Sotechy's terms and privacy policy. No crypto wallet needed to shop."}
          </Txt>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
