import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, View } from "react-native";
import { BUSINESS } from "@sotechy/shared";
import { useToast } from "@/components/toast";
import { Button, Divider, Input, ListRow, Txt, ui, type IconName } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors, gutter, radius, space } from "@/lib/theme";
import { useAsync } from "@/lib/use-async";

function ContactTile({ icon, label, onPress, disabled }: { icon: IconName; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({ flex: 1, alignItems: "center", gap: 8, paddingVertical: space.lg, borderRadius: radius.lg, backgroundColor: pressed ? colors.surfaceAlt : colors.surface, borderWidth: 1, borderColor: colors.line, opacity: disabled ? 0.4 : 1 })}
    >
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={20} color={colors.brandPressed} />
      </View>
      <Txt variant="label">{label}</Txt>
    </Pressable>
  );
}

export default function SupportScreen() {
  const { user } = useAuth();
  const toast = useToast();
  const config = useAsync(() => api.storeConfig());
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const support = config.data?.support;
  const digits = (n: string) => n.replace(/[^\d+]/g, "");

  async function send() {
    setSending(true);
    try {
      await api.createSupportTicket({ subject, message });
      setSubject("");
      setMessage("");
      toast("Message sent. We'll get back to you soon");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not send", { icon: "alert-circle" });
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView style={ui.screen} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={{ padding: gutter, gap: space.xl, paddingBottom: space.xxl * 2 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 4 }}>
          <Txt variant="title">How can we help?</Txt>
          <Txt variant="small">Our team is in the store Monday to Saturday.</Txt>
        </View>

        <View style={[ui.row, { gap: space.md }]}>
          <ContactTile icon="call" label="Call" disabled={!support?.phone} onPress={() => Linking.openURL(`tel:${digits(support!.phone!)}`)} />
          <ContactTile icon="logo-whatsapp" label="WhatsApp" disabled={!support?.whatsapp} onPress={() => Linking.openURL(`https://wa.me/${digits(support!.whatsapp!).replace("+", "")}`)} />
          <ContactTile icon="mail" label="Email" disabled={!support?.email} onPress={() => Linking.openURL(`mailto:${support!.email}`)} />
        </View>

        <View style={[ui.card, { gap: space.md }]}>
          <Txt variant="heading">Send us a message</Txt>
          {user ? (
            <>
              <Input label="Subject" placeholder="e.g. Question about my order" value={subject} onChangeText={setSubject} />
              <Input label="Message" placeholder="Tell us what you need" value={message} onChangeText={setMessage} multiline style={{ minHeight: 110, textAlignVertical: "top" }} />
              <Button title="Send message" variant="dark" onPress={send} loading={sending} disabled={subject.length < 3 || message.length < 5} />
            </>
          ) : (
            <Button title="Sign in to send a message" variant="outline" onPress={() => router.push("/sign-in")} />
          )}
        </View>

        <View style={{ gap: space.sm }}>
          <Txt variant="overline" style={{ paddingHorizontal: 4 }}>Policies</Txt>
          <View style={[ui.card, { padding: 0, overflow: "hidden" }]}>
            <ListRow icon="bicycle-outline" title="Delivery & pickup" subtitle="To be published" />
            <Divider style={{ marginLeft: 62 }} />
            <ListRow icon="return-down-back-outline" title="Returns" subtitle="To be published" />
            <Divider style={{ marginLeft: 62 }} />
            <ListRow icon="shield-checkmark-outline" title="Warranty" subtitle="To be published" />
          </View>
        </View>

        <Txt variant="caption" style={{ textAlign: "center" }}>{BUSINESS.name} · {BUSINESS.headOffice}</Txt>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
