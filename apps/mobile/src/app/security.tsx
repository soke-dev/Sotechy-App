// Security & notifications: change the password (or set one for a Google-only account), and choose which
// push notifications to get. Security alerts (new sign-ins, password changes) always come.
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Stack } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Switch, View } from "react-native";
import type { User } from "@sotechy/shared";
import { Illo } from "@/components/illustrations";
import { useDialog } from "@/components/dialog";
import { useToast } from "@/components/toast";
import { Button, Divider, Input, Txt, ui } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors, gutter, radius, space } from "@/lib/theme";

type Kind = keyof NonNullable<User["pushPrefs"]>;
const KINDS: { kind: Kind; title: string; body: string }[] = [
  { kind: "order", title: "Order updates", body: "Paid, on its way, ready for pickup, delivered" },
  { kind: "offer", title: "Offers", body: "When a store answers your price" },
  { kind: "store", title: "Stores you follow", body: "News and deals from stores you subscribed to" },
  { kind: "tokens", title: "Tokens", body: "Tokens you earn, receive or spend" },
  { kind: "support", title: "Support replies", body: "When Sotechy answers your message" },
];

function Card({ illo, title, children }: { illo: "shield" | "chat" | "user"; title: string; children: React.ReactNode }) {
  return (
    <View style={[ui.card, { gap: space.md }]}>
      <View style={[ui.row, { gap: space.md }]}>
        <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
          <Illo name={illo} size={26} />
        </View>
        <Txt variant="heading" style={{ fontSize: 17 }}>{title}</Txt>
      </View>
      {children}
    </View>
  );
}

export default function SecurityScreen() {
  const { user, updateProfile, signOut } = useAuth();
  const toast = useToast();
  const dialog = useDialog();
  const [deleting, setDeleting] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState(user?.pushPrefs ?? {});

  if (!user) {
    return (
      <View style={[ui.screen, { padding: gutter, justifyContent: "center", gap: space.md }]}>
        <Txt variant="small" style={{ textAlign: "center" }}>Sign in to manage your password and notifications.</Txt>
        <Button title="Sign in" onPress={() => router.push("/sign-in")} />
      </View>
    );
  }
  const hasPassword = user.hasPassword !== false;
  const mismatch = !!again && next !== again;

  /** Deletes the account for good (App Store and Play rules), after asking twice */
  async function deleteAccount() {
    const sure = await dialog.confirm({
      title: "Delete your account?",
      message:
        "This deletes your account, addresses, saved items, reviews, offers and token balance for good. Your past orders are kept without your name. You can't undo this.",
      confirmLabel: "Delete my account",
      tone: "danger",
    });
    if (!sure) return;
    setDeleting(true);
    try {
      await api.delete("/auth/me");
      await signOut();
      toast("Your account has been deleted");
      router.replace("/");
    } catch (err) {
      await dialog.alert({ title: "Can't delete it yet", message: err instanceof Error ? err.message : "Please try again" });
    } finally {
      setDeleting(false);
    }
  }

  async function savePassword() {
    setError(null);
    if (next.length < 8) return setError("Use at least 8 characters");
    if (next !== again) return setError("The new passwords don't match");
    setSaving(true);
    try {
      await api.changePassword({ current: hasPassword ? current : undefined, next });
      setCurrent("");
      setNext("");
      setAgain("");
      toast(hasPassword ? "Password changed" : "Password set", { icon: "checkmark-circle" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't change your password");
    } finally {
      setSaving(false);
    }
  }

  /** Saves straight away; puts the switch back if it doesn't save */
  async function toggle(kind: Kind, on: boolean) {
    const before = prefs;
    const changed = { ...prefs, [kind]: on };
    setPrefs(changed);
    try {
      await updateProfile({ pushPrefs: changed });
    } catch (err) {
      setPrefs(before);
      toast(err instanceof Error ? err.message : "Couldn't save that", { icon: "alert-circle" });
    }
  }

  return (
    <KeyboardAvoidingView style={ui.screen} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <Stack.Screen options={{ title: "Security & notifications" }} />
      <ScrollView contentContainerStyle={{ padding: gutter, gap: space.lg, paddingBottom: space.xxl * 2 }} keyboardShouldPersistTaps="handled">
        <Card illo="shield" title={hasPassword ? "Change password" : "Set a password"}>
          {!hasPassword && <Txt variant="small" color={colors.ink2}>You sign in with Google. Set a password to sign in with your email too.</Txt>}
          {hasPassword && <Input label="Current password" value={current} onChangeText={setCurrent} secureTextEntry autoCapitalize="none" autoComplete="current-password" textContentType="password" />}
          <Input label="New password" value={next} onChangeText={setNext} secureTextEntry autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" placeholder="At least 8 characters" />
          <Input label="New password again" value={again} onChangeText={setAgain} secureTextEntry autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" />
          {mismatch && <Txt variant="small" color={colors.danger}>The new passwords don&apos;t match</Txt>}
          {error && <Txt variant="small" color={colors.danger}>{error}</Txt>}
          <Button title={hasPassword ? "Change password" : "Set password"} variant="dark" loading={saving} disabled={(hasPassword && !current) || next.length < 8 || mismatch} onPress={() => void savePassword()} />
          <Txt variant="caption">You&apos;ll get a security alert whenever your password changes.</Txt>
        </Card>

        <Card illo="chat" title="Notifications">
          <Txt variant="small" color={colors.ink2}>Choose which push notifications you get. They still show in your Notifications list.</Txt>
          <View style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, paddingHorizontal: space.md }}>
            {KINDS.map((k, i) => (
              <View key={k.kind}>
                {i > 0 && <Divider />}
                <View style={[ui.row, { gap: space.md, paddingVertical: space.md }]}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt variant="label">{k.title}</Txt>
                    <Txt variant="caption">{k.body}</Txt>
                  </View>
                  <Switch value={prefs[k.kind] !== false} onValueChange={(v) => void toggle(k.kind, v)} trackColor={{ true: colors.brand, false: colors.line }} thumbColor={colors.white} />
                </View>
              </View>
            ))}
          </View>
          <View style={[ui.row, { gap: space.sm, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: space.md }]}>
            <Ionicons name="lock-closed" size={16} color={colors.ink2} />
            <Txt variant="caption" style={{ flex: 1 }}>Security alerts, like a new sign-in or a password change, always come through.</Txt>
          </View>
        </Card>

        <Card illo="user" title="Delete account">
          <Txt variant="small" color={colors.ink2}>
            Deletes your account and personal details for good, including your token balance. Past orders are kept without your name, as sales records.
          </Txt>
          <Button title="Delete my account" variant="danger" loading={deleting} onPress={() => void deleteAccount()} />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
