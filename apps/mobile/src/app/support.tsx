import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { SupportChatModal } from "@/components/support-chat";
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, View } from "react-native";
import { BUSINESS } from "@sotechy/shared";
import { useToast } from "@/components/toast";
import { Button, Divider, Input, ListRow, Txt, ui, type IconName } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors, gutter, radius, space } from "@/lib/theme";
import { useAsync } from "@/lib/use-async";
import { Illo, type IlloName } from "@/components/illustrations";

function ContactTile({ illo, label, onPress, disabled }: { illo: IlloName; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({ flex: 1, alignItems: "center", gap: 8, paddingVertical: space.lg, borderRadius: radius.lg, backgroundColor: pressed ? colors.surfaceAlt : colors.surface, borderWidth: 1, borderColor: colors.line, opacity: disabled ? 0.4 : 1 })}
    >
      <Illo name={illo} size={40} />
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
  // A "Sotechy Support replied" notification opens the chat straight away
  const { chat } = useLocalSearchParams<{ chat?: string }>();
  const [chatOpen, setChatOpen] = useState(chat === "1");
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
      <SupportChatModal visible={chatOpen} onClose={() => setChatOpen(false)} />
      <ScrollView contentContainerStyle={{ padding: gutter, gap: space.xl, paddingBottom: space.xxl * 2 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 4 }}>
          <Txt variant="title">How can we help?</Txt>
          <Txt variant="small">Our team is in the store Monday to Saturday.</Txt>
        </View>

        <View style={[ui.row, { gap: space.md }]}>
          <ContactTile illo="chat" label="Live chat" onPress={() => (user ? setChatOpen(true) : router.push("/sign-in"))} />
          <ContactTile illo="phone" label="WhatsApp" disabled={!support?.whatsapp} onPress={() => Linking.openURL(`https://wa.me/${digits(support!.whatsapp!).replace("+", "")}`)} />
          <ContactTile illo="mail" label="Email" disabled={!support?.email} onPress={() => Linking.openURL(`mailto:${support!.email}`)} />
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
            <ListRow illo="bike" title="Delivery & pickup" subtitle="To be published" />
            <Divider style={{ marginLeft: 62 }} />
            <ListRow illo="doc" title="Returns" subtitle="To be published" />
            <Divider style={{ marginLeft: 62 }} />
            <ListRow illo="shield" title="Warranty" subtitle="To be published" />
          </View>
        </View>

        <Txt variant="caption" style={{ textAlign: "center" }}>{BUSINESS.name} · {BUSINESS.headOffice}</Txt>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
