import { router } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, Text } from "react-native";
import { BUSINESS } from "@sotechy/shared";
import { Button, Card, Input, styles } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useAsync } from "@/lib/use-async";

export default function SupportScreen() {
  const { user } = useAuth();
  const config = useAsync(() => api.storeConfig());
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const support = config.data?.support;

  async function send() {
    setSending(true);
    try {
      await api.createSupportTicket({ subject, message });
      setSubject("");
      setMessage("");
      Alert.alert("Message sent", "Our team will get back to you.");
    } catch (err) {
      Alert.alert("Could not send", err instanceof Error ? err.message : "");
    } finally {
      setSending(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card>
        <Text style={{ fontWeight: "600" }}>Contact us</Text>
        <Text style={styles.muted}>Phone: {support?.phone ?? "to be added"}</Text>
        <Text style={styles.muted}>WhatsApp: {support?.whatsapp ?? "to be added"}</Text>
        <Text style={styles.muted}>Email: {support?.email ?? "to be added"}</Text>
        <Text style={styles.muted}>{BUSINESS.headOffice}</Text>
      </Card>
      <Card>
        <Text style={{ fontWeight: "600" }}>Policies</Text>
        <Text style={styles.muted}>Delivery, pickup, warranty and return policies will be published here.</Text>
      </Card>
      <Card>
        <Text style={{ fontWeight: "600" }}>Send us a message</Text>
        {user ? (
          <>
            <Input label="Subject" value={subject} onChangeText={setSubject} />
            <Input label="Message" value={message} onChangeText={setMessage} multiline numberOfLines={4} style={{ minHeight: 100, textAlignVertical: "top" }} />
            <Button title="Send" onPress={send} loading={sending} disabled={subject.length < 3 || message.length < 5} />
          </>
        ) : (
          <Button title="Sign in to message us" onPress={() => router.push("/sign-in")} />
        )}
      </Card>
    </ScrollView>
  );
}
