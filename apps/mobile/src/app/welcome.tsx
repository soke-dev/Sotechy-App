// First time after creating an account: pick an @username (needed for sending and receiving tokens),
// then optionally add numbers for calls and WhatsApp. Numbers can be added later in My profile.
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Illo } from "@/components/illustrations";
import { Burst } from "@/components/tab-icons";
import { useToast } from "@/components/toast";
import { Button, Input, Txt, ui } from "@/components/ui";
import { suggestUsername, useAccountExtras, usernameProblem } from "@/lib/account-extras";
import { useAuth } from "@/lib/auth";
import { colors, fonts, gutter, radius, space } from "@/lib/theme";

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { user, updateProfile } = useAuth();
  const { extras, save } = useAccountExtras();
  const toast = useToast();
  const [step, setStep] = useState<"username" | "numbers">(extras.username ? "numbers" : "username");
  const [username, setUsername] = useState(extras.username || suggestUsername(user?.fullName, user?.email));
  const [call, setCall] = useState(extras.callNumber || user?.phone || "");
  const [whatsapp, setWhatsapp] = useState(extras.whatsappNumber);
  const [same, setSame] = useState(extras.sameNumber);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  // The account and its saved details load after the screen opens: fill in a suggestion once they do
  useEffect(() => {
    if (touched) return;
    if (extras.username) {
      setUsername(extras.username);
      setStep("numbers");
    } else if (user) setUsername(suggestUsername(user.fullName, user.email));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, extras.username]);

  const clean = username.trim().toLowerCase().replace(/^@/, "");
  const problem = usernameProblem(clean);
  const finish = () => router.replace("/");

  async function saveNumbers(skip: boolean) {
    setBusy(true);
    try {
      if (!skip) {
        if (call.trim() && call.trim() !== (user?.phone ?? "")) await updateProfile({ phone: call.trim() });
        await save({ callNumber: call.trim(), whatsappNumber: same ? call.trim() : whatsapp.trim(), sameNumber: same, setupDone: true });
      } else {
        await save({ setupDone: true });
      }
      toast(`Welcome to Sotechy, @${clean || extras.username}`);
      finish();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save", { icon: "alert-circle" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={ui.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.lg, paddingHorizontal: gutter, paddingBottom: insets.bottom + space.xxl, gap: space.lg }} keyboardShouldPersistTaps="handled">
        {/* Steps */}
        <View style={{ flexDirection: "row", gap: 6, alignSelf: "center" }}>
          {["username", "numbers"].map((s) => (
            <View key={s} style={{ width: step === s ? 26 : 8, height: 8, borderRadius: 4, backgroundColor: step === s ? colors.ink : colors.line }} />
          ))}
        </View>

        <View style={{ height: 120, alignItems: "center", justifyContent: "center" }}>
          <View style={{ position: "absolute" }}>
            <Burst size={120} />
          </View>
          <View style={{ zIndex: 1 }}>
            <Illo name={step === "username" ? "user" : "phone"} size={72} />
          </View>
        </View>

        {step === "username" ? (
          <>
            <View style={{ gap: 6, alignItems: "center" }}>
              <Txt variant="display" style={{ fontSize: 28, textAlign: "center" }}>Pick your username</Txt>
              <Txt variant="small" style={{ textAlign: "center", maxWidth: 320 }}>
                It&apos;s how people send you store tokens, and how stores see you when you make an offer.
              </Txt>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", height: 58, borderRadius: radius.lg, borderWidth: 1.5, borderColor: problem && clean ? colors.danger : colors.line, backgroundColor: colors.surface, paddingHorizontal: space.lg }}>
              <Txt variant="title" color={colors.muted} style={{ fontSize: 22 }}>@</Txt>
              <TextInput
                autoFocus
                value={username}
                onChangeText={(t) => {
                  setTouched(true);
                  setUsername(t.replace(/\s/g, "").toLowerCase());
                }}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={21}
                placeholder="yourname"
                placeholderTextColor={colors.faint}
                style={{ flex: 1, marginLeft: 4, fontFamily: fonts.display, fontSize: 22, color: colors.ink }}
              />
              {!problem && <Ionicons name="checkmark-circle" size={22} color={colors.success} />}
            </View>
            <Txt variant="small" color={problem ? colors.danger : colors.success}>{problem ?? `@${clean} is available`}</Txt>
            <Button
              title="Continue"
              icon="arrow-forward"
              variant="dark"
              disabled={!!problem || busy}
              onPress={async () => {
                await save({ username: clean });
                setStep("numbers");
              }}
            />
          </>
        ) : (
          <>
            <View style={{ gap: 6, alignItems: "center" }}>
              <Txt variant="display" style={{ fontSize: 28, textAlign: "center" }}>How can stores reach you?</Txt>
              <Txt variant="small" style={{ textAlign: "center", maxWidth: 320 }}>
                For delivery calls and order updates on WhatsApp. Optional: you can add these later in My profile.
              </Txt>
            </View>

            <View style={[ui.card, { gap: space.md }]}>
              <Pressable onPress={() => setSame(!same)} style={[ui.between, { gap: space.md }]}>
                <View style={{ flex: 1 }}>
                  <Txt variant="label">One number for calls and WhatsApp</Txt>
                  <Txt variant="caption">Turn off to use different numbers</Txt>
                </View>
                <Switch value={same} onValueChange={setSame} trackColor={{ true: colors.brand, false: colors.line }} thumbColor={colors.white} {...({ activeThumbColor: colors.white } as object)} />
              </Pressable>
              <Input label={same ? "Phone number" : "Number for calls"} icon="call-outline" keyboardType="phone-pad" autoComplete="tel" value={call} onChangeText={setCall} placeholder="080…" />
              {!same && <Input label="WhatsApp number" icon="logo-whatsapp" keyboardType="phone-pad" value={whatsapp} onChangeText={setWhatsapp} placeholder="080…" />}
            </View>

            <Button title="Save and start shopping" icon="checkmark" variant="dark" loading={busy} disabled={!call.trim() && !whatsapp.trim()} onPress={() => saveNumbers(false)} />
            <Button title="Skip for now" variant="ghost" disabled={busy} onPress={() => saveNumbers(true)} />
            <Pressable onPress={() => setStep("username")} style={{ alignSelf: "center" }}>
              <Txt variant="small">Change @{clean}</Txt>
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
