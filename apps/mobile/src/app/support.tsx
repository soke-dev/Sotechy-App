import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useState, type ReactNode } from "react";
import { SupportChatModal } from "@/components/support-chat";
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, View } from "react-native";
import { BUSINESS, type SupportChatSummary } from "@sotechy/shared";
import { useToast } from "@/components/toast";
import { Button, Input, Txt, ui } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors, gutter, radius, space } from "@/lib/theme";
import { useAsync } from "@/lib/use-async";
import { Illo, type IlloName } from "@/components/illustrations";

const WHATSAPP_GREEN = "#25D366";

function ContactTile({ illo, icon, label, onPress, disabled }: { illo?: IlloName; icon?: ReactNode; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({ flex: 1, alignItems: "center", gap: 8, paddingVertical: space.lg, borderRadius: radius.lg, backgroundColor: pressed ? colors.surfaceAlt : colors.surface, borderWidth: 1, borderColor: colors.line, opacity: disabled ? 0.4 : 1 })}
    >
      {icon ?? (illo ? <Illo name={illo} size={40} /> : null)}
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
  // Their last few conversations; tapping one opens it in the chat
  const chats = useAsync(() => (user ? api.supportChats() : Promise.resolve([] as SupportChatSummary[])), [user?.id]);
  const [pastChat, setPastChat] = useState<SupportChatSummary | null>(null);
  const openChat = (c: SupportChatSummary | null) => {
    setPastChat(c);
    setChatOpen(true);
  };
  const support = config.data?.support;
  const digits = (n: string) => n.replace(/[^\d+]/g, "");

  async function send() {
    setSending(true);
    try {
      await api.createSupportTicket({ subject, message });
      setSubject("");
      setMessage("");
      toast("Message sent. We'll get back to you soon");
      chats.reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not send", { icon: "alert-circle" });
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView style={ui.screen} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <SupportChatModal
        visible={chatOpen}
        past={pastChat}
        onClose={() => {
          setChatOpen(false);
          chats.reload();
        }}
      />
      <ScrollView contentContainerStyle={{ padding: gutter, gap: space.xl, paddingBottom: space.xxl * 2 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 4 }}>
          <Txt variant="title">How can we help?</Txt>
          <Txt variant="small">Our team is in the store Monday to Saturday.</Txt>
        </View>

        <View style={[ui.row, { gap: space.md }]}>
          <ContactTile illo="chat" label="Live chat" onPress={() => (user ? openChat(null) : router.push("/sign-in"))} />
          <ContactTile
            icon={
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: WHATSAPP_GREEN, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="logo-whatsapp" size={24} color="#FFFFFF" />
              </View>
            }
            label="WhatsApp" disabled={!support?.whatsapp} onPress={() => Linking.openURL(`https://wa.me/${digits(support!.whatsapp!).replace("+", "")}`)} />
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

        {user && (chats.data?.length ?? 0) > 0 && (
          <View style={{ gap: space.sm }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4 }}>
              <Txt variant="overline">Recent chats</Txt>
              <Pressable onPress={() => openChat(null)} hitSlop={8}>
                <Txt variant="label" color={colors.brandPressed}>Open chat</Txt>
              </Pressable>
            </View>
            {chats.data!.slice(0, 4).map((c) => (
              <Pressable
                key={c.id}
                onPress={() => openChat(c)}
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md, borderRadius: radius.lg, borderWidth: 1, borderColor: c.open ? colors.brand : colors.line, backgroundColor: pressed ? colors.surfaceAlt : colors.surface })}
              >
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.open ? colors.brandSoft : colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={c.lastFromStaff ? "chatbubbles" : "chatbubble-ellipses-outline"} size={19} color={c.open ? colors.brandPressed : colors.ink2} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm }}>
                    <Txt variant="caption">{new Date(c.lastMessageAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</Txt>
                    <Txt variant="caption" color={c.open ? colors.success : colors.muted}>{c.open ? "Open" : "Closed"}</Txt>
                  </View>
                  <Txt variant="body" numberOfLines={1} style={{ fontSize: 14 }}>
                    {c.lastFromStaff ? "Sotechy: " : "You: "}
                    {c.lastMessage}
                  </Txt>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.faint} />
              </Pressable>
            ))}
          </View>
        )}

        <Txt variant="caption" style={{ textAlign: "center" }}>{BUSINESS.name} · {BUSINESS.headOffice}</Txt>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
