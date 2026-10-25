import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { Button, Input, Txt, ui } from "@/components/ui";
import { DEMO_MODE } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors, fonts, gutter, radius, space } from "@/lib/theme";

export default function SignInScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      if (mode === "signin") await signIn(email.trim(), password);
      else await signUp({ email: email.trim(), password, fullName: fullName || undefined, phone: phone || undefined });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const tab = (value: "signin" | "signup", label: string) => (
    <Pressable
      onPress={() => setMode(value)}
      style={{ flex: 1, height: 40, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: mode === value ? colors.surface : "transparent" }}
    >
      <Txt variant="label" color={mode === value ? colors.ink : colors.muted}>{label}</Txt>
    </Pressable>
  );

  return (
    <KeyboardAvoidingView style={ui.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: gutter, gap: space.lg, paddingBottom: space.xxl }} keyboardShouldPersistTaps="handled">
        <Image source={require("../../assets/brand/sotechylogo.png")} style={{ width: 56, height: 52 }} contentFit="contain" />
        <View style={{ gap: 4 }}>
          <Txt variant="display">{mode === "signin" ? "Welcome back" : "Create your account"}</Txt>
          <Txt variant="small">{mode === "signin" ? "Sign in to check out and track your orders." : "It takes less than a minute. No crypto wallet needed."}</Txt>
        </View>

        <View style={{ flexDirection: "row", backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, padding: 4 }}>
          {tab("signin", "Sign in")}
          {tab("signup", "Create account")}
        </View>

        {mode === "signup" && (
          <>
            <Input label="Full name" icon="person-outline" value={fullName} onChangeText={setFullName} autoComplete="name" />
            <Input label="Phone number" icon="call-outline" keyboardType="phone-pad" value={phone} onChangeText={setPhone} autoComplete="tel" />
          </>
        )}
        <Input label="Email" icon="mail-outline" autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} />
        <View>
          <Input label="Password" icon="lock-closed-outline" secureTextEntry={!showPassword} value={password} onChangeText={setPassword} autoComplete={mode === "signin" ? "current-password" : "new-password"} />
          <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={10} style={{ position: "absolute", right: 14, bottom: 15 }}>
            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={19} color={colors.muted} />
          </Pressable>
        </View>

        {error && <Txt variant="small" color={colors.danger}>{error}</Txt>}
        <Button title={mode === "signin" ? "Sign in" : "Create account"} variant="dark" onPress={submit} loading={loading} disabled={!email || password.length < (mode === "signup" ? 8 : 1)} />

        <Txt variant="caption" style={{ textAlign: "center", fontFamily: fonts.medium }}>
          {DEMO_MODE ? "Demo mode: any email and password will sign you in." : "By continuing you agree to Sotechy's terms and privacy policy."}
        </Txt>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
