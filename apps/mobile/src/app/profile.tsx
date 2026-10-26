import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, View } from "react-native";
import { formatDate } from "@sotechy/shared";
import { AvatarPicker } from "@/components/avatar-picker";
import { Burst } from "@/components/tab-icons";
import { UserAvatar } from "@/components/user-avatar";
import { useToast } from "@/components/toast";
import { BottomBar, Button, EmptyState, Input, ListRow, Txt, PhoneInput, ui } from "@/components/ui";
import { api } from "@/lib/api";
import { useAccountExtras, usernameProblem } from "@/lib/account-extras";
import { useAuth } from "@/lib/auth";
import { colors, fonts, gutter, radius, space } from "@/lib/theme";
import { useAsync } from "@/lib/use-async";

export default function ProfileScreen() {
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const { extras, save: saveExtras } = useAccountExtras();
  const [phone, setPhone] = useState(extras.callNumber || user?.phone || "");
  const [username, setUsername] = useState(extras.username);
  const [whatsapp, setWhatsapp] = useState(extras.whatsappNumber);
  const [same, setSame] = useState(extras.sameNumber);
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);
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

  const cleanUsername = username.trim().toLowerCase().replace(/^@/, "");
  const usernameError = cleanUsername !== extras.username ? usernameProblem(cleanUsername) : null;
  const changed =
    fullName.trim() !== (user.fullName ?? "") ||
    phone.trim() !== (extras.callNumber || user.phone || "") ||
    cleanUsername !== extras.username ||
    same !== extras.sameNumber ||
    (!same && whatsapp.trim() !== extras.whatsappNumber);
  const saved = addresses.data?.length ?? 0;
  const defaultAddress = addresses.data?.find((a) => a.isDefault);

  async function save() {
    setSaving(true);
    try {
      await updateProfile({ fullName: fullName.trim(), phone: phone.trim() });
      await saveExtras({ username: cleanUsername, callNumber: phone.trim(), whatsappNumber: same ? phone.trim() : whatsapp.trim(), sameNumber: same, setupDone: true });
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
            <Pressable onPress={() => setPicking(true)} accessibilityLabel="Change avatar" style={{ borderRadius: 48, borderWidth: 3, borderColor: colors.surface }}>
              <UserAvatar seed={user.id} preset={user.avatarStyle} size={90} animated />
              <View style={{ position: "absolute", right: -4, bottom: -2, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.inverse, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.surface }}>
                <Ionicons name="pencil" size={14} color={colors.onInverse} />
              </View>
            </Pressable>
          </View>
          <Txt variant="title">{user.fullName || "Your name"}</Txt>
          {extras.username ? <Txt variant="label" color={colors.brandPressed}>@{extras.username}</Txt> : null}
          <Txt variant="small">Member since {formatDate(user.createdAt).split(",")[0]}</Txt>
          <Button title="Change avatar" icon="happy-outline" variant="outline" size="sm" onPress={() => setPicking(true)} style={{ marginTop: space.xs }} />
        </View>

        <View style={{ gap: space.sm }}>
          <Txt variant="overline" style={{ paddingHorizontal: 4 }}>Personal details</Txt>
          <View style={[ui.card, { gap: space.md }]}>
            <Input label="Full name" icon="person-outline" value={fullName} onChangeText={setFullName} autoComplete="name" placeholder="Your full name" />
            <View style={{ gap: 4 }}>
              <Input label="Username" icon="at-outline" value={username} onChangeText={(t) => setUsername(t.replace(/\s/g, "").toLowerCase())} autoCapitalize="none" autoCorrect={false} placeholder="yourname" />
              {usernameError ? <Txt variant="caption" color={colors.danger}>{usernameError}</Txt> : <Txt variant="caption">How people send you tokens</Txt>}
            </View>
          </View>
        </View>

        <View style={{ gap: space.sm }}>
          <Txt variant="overline" style={{ paddingHorizontal: 4 }}>Contact numbers</Txt>
          <View style={[ui.card, { gap: space.md }]}>
            <Pressable onPress={() => setSame(!same)} style={[ui.between, { gap: space.md }]}>
              <Txt variant="label" style={{ flex: 1 }}>One number for calls and WhatsApp</Txt>
              <Switch value={same} onValueChange={setSame} trackColor={{ true: colors.brand, false: colors.line }} thumbColor={colors.white} {...({ activeThumbColor: colors.white } as object)} />
            </Pressable>
            <PhoneInput label={same ? "Phone number" : "Number for calls"} value={phone} onChange={setPhone} />
            {!same && <PhoneInput label="WhatsApp number" icon="logo-whatsapp" value={whatsapp} onChange={setWhatsapp} />}
            <Txt variant="caption">Optional. Stores use these for delivery calls and order updates.</Txt>
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
      <AvatarPicker
        visible={picking}
        seed={user.id}
        current={user.avatarStyle}
        onClose={() => setPicking(false)}
        onSelect={async (preset) => {
          setPicking(false);
          try {
            await updateProfile({ avatarStyle: preset });
            toast(preset ? "Avatar updated" : "Using your auto avatar");
          } catch (err) {
            toast(err instanceof Error ? err.message : "Could not update avatar", { icon: "alert-circle" });
          }
        }}
      />
      <BottomBar>
        <Button title={changed ? "Save changes" : "Saved"} variant="dark" icon={changed ? "checkmark" : undefined} onPress={save} loading={saving} disabled={!changed || !!usernameError} style={{ flex: 1 }} />
      </BottomBar>
    </KeyboardAvoidingView>
  );
}
