import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GoogleButton } from "@/components/google-button";
import { Button, Input, Txt, ui } from "@/components/ui";
import { DEMO_MODE } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { demoMedia } from "@/lib/mock-api";
import { colors, fonts, gutter, radius, space } from "@/lib/theme";

type Mode = "signin" | "signup";

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState<"email" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const heroHeight = Math.min(220, width * 0.5);

  const done = () => (router.canGoBack() ? router.back() : router.replace("/"));

  async function submit() {
    setLoading("email");
    setError(null);
    try {
      if (mode === "signin") await signIn(email.trim(), password);
      else await signUp({ email: email.trim(), password, fullName: fullName || undefined, phone: phone || undefined });
      done();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  const onGoogleToken = useCallback(
    async (idToken: string) => {
      setLoading("google");
      setError(null);
      try {
        await signInWithGoogle(idToken);
        done();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Google sign-in failed");
      } finally {
        setLoading(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signInWithGoogle],
  );
  const onGoogleError = useCallback((message: string) => setError(message), []);

  const switchMode = () => {
    setMode(mode === "signin" ? "signup" : "signin");
    setError(null);
  };

  return (
    <KeyboardAvoidingView style={ui.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Hero: product art on a brand circle */}
        <View style={{ height: heroHeight + insets.top, paddingTop: insets.top, overflow: "hidden" }}>
          <View style={{ position: "absolute", right: -heroHeight * 0.35, top: insets.top - heroHeight * 0.25, width: heroHeight * 1.5, height: heroHeight * 1.5, borderRadius: heroHeight, backgroundColor: colors.brand }} />
          <View style={{ position: "absolute", right: -heroHeight * 0.55, top: insets.top - heroHeight * 0.45, width: heroHeight * 1.9, height: heroHeight * 1.9, borderRadius: heroHeight * 2, borderWidth: 1.5, borderColor: "rgba(23,18,14,0.06)" }} />
          <Image source={demoMedia.fridge} style={{ position: "absolute", right: heroHeight * 0.32, bottom: 6, width: heroHeight * 0.55, height: heroHeight * 0.9 }} contentFit="contain" />
          <Image source={demoMedia.microwave} style={{ position: "absolute", right: -heroHeight * 0.02, bottom: heroHeight * 0.1, width: heroHeight * 0.55, height: heroHeight * 0.4 }} contentFit="contain" />
          <Image source={demoMedia.ac} style={{ position: "absolute", right: heroHeight * 0.06, top: insets.top + heroHeight * 0.12, width: heroHeight * 0.55, height: heroHeight * 0.22 }} contentFit="contain" />
          <View style={[ui.between, { paddingHorizontal: gutter, paddingTop: space.md, width: width * 0.55 }]}>
            <Pressable onPress={done} hitSlop={10} accessibilityLabel="Close" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="close" size={20} color={colors.ink} />
            </Pressable>
          </View>
          <Image source={require("../../assets/brand/light-logo-small.png")} style={{ position: "absolute", left: gutter, bottom: space.lg, width: 120, height: 52 }} contentFit="contain" contentPosition="left" />
        </View>

        <View style={{ paddingHorizontal: gutter, gap: space.lg, marginTop: space.md }}>
          <View style={{ gap: 6 }}>
            <Txt variant="display" style={{ fontSize: 32, lineHeight: 35 }}>{mode === "signin" ? "Welcome back" : "Create your\naccount"}</Txt>
            <Txt variant="small" style={{ fontSize: 14 }}>
              {mode === "signin" ? "Sign in to check out faster and follow your orders." : "Save your details, track orders and get deals first."}
            </Txt>
          </View>

          <GoogleButton onIdToken={onGoogleToken} onError={onGoogleError} busy={loading === "google"} />

          <View style={[ui.row, { gap: space.md }]}>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
            <Txt variant="caption">or use email</Txt>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
          </View>

          {mode === "signup" && (
            <>
              <Input label="Full name" icon="person-outline" value={fullName} onChangeText={setFullName} autoComplete="name" placeholder="e.g. Ada Okafor" />
              <Input label="Phone number" icon="call-outline" keyboardType="phone-pad" value={phone} onChangeText={setPhone} autoComplete="tel" placeholder="080…" />
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

          <Pressable onPress={switchMode} style={{ alignSelf: "center", paddingVertical: space.sm }}>
            <Txt variant="small" style={{ fontSize: 14 }}>
              {mode === "signin" ? "New to Sotechy? " : "Already have an account? "}
              <Txt variant="label" color={colors.brandPressed} style={{ fontSize: 14 }}>{mode === "signin" ? "Create an account" : "Sign in"}</Txt>
            </Txt>
          </Pressable>

          <Txt variant="caption" style={{ textAlign: "center", fontFamily: fonts.medium }}>
            {DEMO_MODE ? "Demo mode: any email and password, or Google, signs you in." : "By continuing you agree to Sotechy's terms and privacy policy. No crypto wallet needed to shop."}
          </Txt>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
