import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { formatDate } from "@sotechy/shared";
import { Burst } from "@/components/tab-icons";
import { UserAvatar } from "@/components/user-avatar";
import { useToast } from "@/components/toast";
import { BottomBar, Button, EmptyState, Input, ListRow, Txt, ui } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors, fonts, gutter, radius, space } from "@/lib/theme";
import { useAsync } from "@/lib/use-async";

export default function ProfileScreen() {
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const addresses = useAsync(async () => (user ? api.addresses() : []), [user?.id]);

  useFocusEffect(
    useCallback(() => {
      addresses.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  if (!user) {
    return <EmptyState illo="user" title="Your profile" message="Sign in to see and edit your details." action={<Button title="Sign in" onPress={() => router.push("/sign-in")} />} />;
  }

  const changed = fullName.trim() !== (user.fullName ?? "") || phone.trim() !== (user.phone ?? "");
  const saved = addresses.data?.length ?? 0;
  const defaultAddress = addresses.data?.find((a) => a.isDefault);

  async function save() {
    setSaving(true);
    try {
      await updateProfile({ fullName: fullName.trim(), phone: phone.trim() });
      toast("Profile updated");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save", { icon: "alert-circle" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={ui.screen} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={{ padding: gutter, gap: space.xl, paddingBottom: space.xxl }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: "center", gap: space.sm }}>
          <View style={{ width: 128, height: 128, alignItems: "center", justifyContent: "center" }}>
            <View style={{ position: "absolute" }}>
              <Burst size={128} />
            </View>
            <View style={{ borderRadius: 48, borderWidth: 3, borderColor: colors.surface }}>
              <UserAvatar seed={user.id} size={90} />
            </View>
          </View>
          <Txt variant="title">{user.fullName || "Your name"}</Txt>
          <Txt variant="small">Member since {formatDate(user.createdAt).split(",")[0]}</Txt>
        </View>

        <View style={{ gap: space.sm }}>
          <Txt variant="overline" style={{ paddingHorizontal: 4 }}>Personal details</Txt>
          <View style={[ui.card, { gap: space.md }]}>
            <Input label="Full name" icon="person-outline" value={fullName} onChangeText={setFullName} autoComplete="name" placeholder="Your full name" />
            <Input label="Phone number" icon="call-outline" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" placeholder="080…" />
            <View style={{ gap: 6 }}>
              <Txt variant="label" color={colors.ink2}>Email</Txt>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 50, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, paddingHorizontal: 14 }}>
                <Ionicons name="mail-outline" size={18} color={colors.muted} />
                <Txt variant="body" color={colors.ink2} style={{ flex: 1 }} numberOfLines={1}>{user.email}</Txt>
                <Ionicons name="lock-closed" size={14} color={colors.faint} />
              </View>
            </View>
          </View>
        </View>

        <View style={{ gap: space.sm }}>
          <Txt variant="overline" style={{ paddingHorizontal: 4 }}>Delivery</Txt>
          <View style={[ui.card, { padding: 0, overflow: "hidden" }]}>
            <ListRow
              illo="pin"
              title="Saved addresses"
              subtitle={saved ? `${saved} saved${defaultAddress ? ` · Default: ${defaultAddress.label ?? defaultAddress.line1}` : ""}` : "Add an address for faster checkout"}
              onPress={() => router.push("/addresses")}
            />
          </View>
        </View>

        <Txt variant="caption" style={{ textAlign: "center", fontFamily: fonts.medium }}>
          Your details are only used for your orders and deliveries.
        </Txt>
      </ScrollView>
      <BottomBar>
        <Button title={changed ? "Save changes" : "Saved"} variant="dark" icon={changed ? "checkmark" : undefined} onPress={save} loading={saving} disabled={!changed} style={{ flex: 1 }} />
      </BottomBar>
    </KeyboardAvoidingView>
  );
}
