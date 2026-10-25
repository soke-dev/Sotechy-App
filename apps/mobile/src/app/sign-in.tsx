import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { Button, Chip, Input, styles } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";

export default function SignInScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
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

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={{ fontSize: 22, fontWeight: "700" }}>{mode === "signin" ? "Welcome back" : "Create your account"}</Text>
      <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
        <Chip label="Sign in" active={mode === "signin"} onPress={() => setMode("signin")} />
        <Chip label="Create account" active={mode === "signup"} onPress={() => setMode("signup")} />
      </ScrollView>
      {mode === "signup" && (
        <>
          <Input label="Full name" value={fullName} onChangeText={setFullName} />
          <Input label="Phone" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
        </>
      )}
      <Input label="Email" autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} />
      <Input label="Password" secureTextEntry value={password} onChangeText={setPassword} />
      {error && <Text style={{ color: colors.danger }}>{error}</Text>}
      <Button title={mode === "signin" ? "Sign in" : "Create account"} onPress={submit} loading={loading} />
      <Text style={[styles.muted, { fontSize: 12 }]}>No crypto wallet needed to shop.</Text>
    </ScrollView>
  );
}
