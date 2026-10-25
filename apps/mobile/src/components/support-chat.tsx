// Floating support button with a dismissible "need help?" pop-up and a chat sheet.
// Messages are sent to the support inbox (Admin → Support) when signed in; instant replies go via WhatsApp.
// A real-time agent chat (agent replies inside the app) still needs a backend/inbox — see README.
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { router, type Href } from "expo-router";
import { useEffect, useRef, useState, type ComponentRef } from "react";
import {
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors, fonts, radius, space } from "@/lib/theme";
import { useAsync } from "@/lib/use-async";
import { openWhatsApp } from "@/lib/whatsapp";
import { SupportAgentArt } from "./tab-icons";
import { Chip, tap, Txt } from "./ui";

type Action = { label: string; kind: "whatsapp"; message: string } | { label: string; kind: "route"; href: Href };
interface Message {
  id: number;
  from: "agent" | "user";
  text: string;
  actions?: Action[];
}

const TOPICS: { label: string; reply: Omit<Message, "id" | "from"> }[] = [
  {
    label: "Track my order",
    reply: { text: "You can follow every order step by step under Orders, including payment status and pickup details.", actions: [{ label: "Open my orders", kind: "route", href: "/orders" }] },
  },
  {
    label: "Is an item in stock?",
    reply: {
      text: "Every product page shows live stock at each of our stores. Tell us the product and we'll double-check for you.",
      actions: [{ label: "Ask on WhatsApp", kind: "whatsapp", message: "Hello Sotechy, is this item in stock: " }],
    },
  },
  {
    label: "Payment help",
    reply: { text: "We accept bank transfer, online payment and $MOVE crypto. Your order is confirmed as soon as we verify the payment." },
  },
  {
    label: "Talk to a person",
    reply: { text: "Our team is ready to help on WhatsApp.", actions: [{ label: "Continue on WhatsApp", kind: "whatsapp", message: "Hello Sotechy, I need some help." }] },
  },
];

const useNative = Platform.OS !== "web";

/** Illustrated support agent with a soft pulse ring. */
function ChatLauncher({ onPress, bottom }: { onPress: () => void; bottom: number }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.out(Easing.ease), useNativeDriver: useNative }), Animated.delay(2200)]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Chat with support" style={{ position: "absolute", right: 16, bottom, width: 64, height: 64 }}>
      {({ pressed }) => (
        <>
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 32,
              borderWidth: 2,
              borderColor: colors.brand,
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }) }],
            }}
          />
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surface, padding: 3, transform: [{ scale: pressed ? 0.94 : 1 }], shadowColor: "#2B1D0E", shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 9 }}>
            <View style={{ flex: 1, borderRadius: 29, overflow: "hidden" }}>
              <SupportAgentArt size={58} />
            </View>
          </View>
        </>
      )}
    </Pressable>
  );
}

// Once closed, the pop-up never shows again on this device (remembered in storage).
const TEASER_KEY = "sotechy_chat_teaser_dismissed";
let teaserDismissed = false;

export function SupportChat({ teaser = false, bottomOffset = 0 }: { teaser?: boolean; bottomOffset?: number }) {
  const [open, setOpen] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!teaser || teaserDismissed) return;
    let cancelled = false;
    let t: ReturnType<typeof setTimeout> | undefined;
    AsyncStorage.getItem(TEASER_KEY)
      .catch(() => null)
      .then((stored) => {
        if (cancelled || stored) {
          teaserDismissed = !!stored;
          return;
        }
        t = setTimeout(() => {
          setShowTeaser(true);
          Animated.spring(fade, { toValue: 1, useNativeDriver: Platform.OS !== "web", speed: 14, bounciness: 6 }).start();
        }, 2500);
      });
    return () => {
      cancelled = true;
      if (t) clearTimeout(t);
    };
  }, [teaser, fade]);

  const dismissTeaser = () => {
    teaserDismissed = true;
    AsyncStorage.setItem(TEASER_KEY, "1").catch(() => {});
    Animated.timing(fade, { toValue: 0, duration: 150, useNativeDriver: Platform.OS !== "web" }).start(() => setShowTeaser(false));
  };

  const openChat = () => {
    tap();
    if (showTeaser) dismissTeaser();
    setOpen(true);
  };

  return (
    <>
      {showTeaser && (
        <Animated.View
          style={{
            position: "absolute",
            right: 16,
            bottom: bottomOffset + 92,
            maxWidth: 270,
            opacity: fade,
            transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
          }}
        >
          <Pressable onPress={openChat} style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderBottomRightRadius: 4, padding: space.md, paddingRight: 34, borderWidth: 1, borderColor: colors.line, gap: 2, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success }} />
              <Txt variant="caption" color={colors.success}>Sotechy Support · online</Txt>
            </View>
            <Txt variant="label">Need help choosing or ordering?</Txt>
            <Txt variant="small">Chat with us. We usually reply in minutes.</Txt>
          </Pressable>
          <Pressable onPress={dismissTeaser} hitSlop={10} accessibilityLabel="Dismiss" style={{ position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="close" size={14} color={colors.ink2} />
          </Pressable>
        </Animated.View>
      )}

      <ChatLauncher onPress={openChat} bottom={bottomOffset + 16} />

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <ChatSheet onClose={() => setOpen(false)} />
      </Modal>
    </>
  );
}

export function ChatSheet({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { user } = useAuth();
  const config = useAsync(() => api.storeConfig());
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, from: "agent", text: `Hi${user?.fullName ? ` ${user.fullName.split(" ")[0]}` : ""} 👋 Welcome to Sotechy.` },
    { id: 2, from: "agent", text: "How can we help you today? Pick a topic or type your question." },
  ]);
  const whatsapp = config.data?.support.whatsapp;
  const sheetHeight = Math.min(height * 0.78, 640);
  const close = () => {
    Keyboard.dismiss();
    onClose();
  };

  const push = (...m: Omit<Message, "id">[]) => {
    setMessages((prev) => [...prev, ...m.map((x, i) => ({ ...x, id: prev.length + i + 1 }))]);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
  };

  const pickTopic = (t: (typeof TOPICS)[number]) => {
    tap();
    push({ from: "user", text: t.label });
    setTimeout(() => push({ from: "agent", ...t.reply }), 450);
  };

  const runAction = async (a: Action) => {
    if (a.kind === "route") {
      close();
      router.push(a.href);
    } else if (!(await openWhatsApp(whatsapp, a.message))) {
      push({ from: "agent", text: "Our WhatsApp number isn't set up yet. Please try again later." });
    }
  };

  async function send() {
    const message = text.trim();
    if (!message) return;
    setText("");
    push({ from: "user", text: message });
    setSending(true);
    try {
      if (user) {
        await api.createSupportTicket({ subject: "In-app chat", message });
        push({
          from: "agent",
          text: "Thanks! Your message has reached our support team and we'll get back to you shortly. Need an instant answer? Continue on WhatsApp.",
          actions: [{ label: "Continue on WhatsApp", kind: "whatsapp", message }],
        });
      } else {
        push({
          from: "agent",
          text: "Thanks! For the fastest reply, send this to us on WhatsApp, or sign in so our team can follow up with you.",
          actions: [
            { label: "Send on WhatsApp", kind: "whatsapp", message },
            { label: "Sign in", kind: "route", href: "/sign-in" },
          ],
        });
      }
    } catch {
      push({ from: "agent", text: "Sorry, that didn't send. Please try WhatsApp instead.", actions: [{ label: "Open WhatsApp", kind: "whatsapp", message }] });
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, justifyContent: "flex-end" }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <Pressable style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(23,18,14,0.45)" }} onPress={close} accessibilityLabel="Close chat" />
      <View
        style={{
          flexBasis: sheetHeight,
          maxHeight: sheetHeight,
          flexShrink: 1,
          marginTop: insets.top + space.md,
          backgroundColor: colors.bg,
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
          overflow: "hidden",
        }}
      >
          {/* Header */}
          <View style={{ backgroundColor: colors.panel, paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.lg, flexDirection: "row", alignItems: "center", gap: space.md }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" }}>
              <Image source={require("../../assets/brand/sotechylogo.png")} style={{ width: 28, height: 28 }} contentFit="contain" />
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="label" color={colors.white}>Sotechy Support</Txt>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#4ADE80" }} />
                <Txt variant="caption" color="#C9C0B6">Online · usually replies in minutes</Txt>
              </View>
            </View>
            <Pressable onPress={close} hitSlop={12} accessibilityLabel="Close chat" style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="close" size={18} color={colors.white} />
            </Pressable>
          </View>

          {/* Conversation */}
          <ScrollView ref={scroll} contentContainerStyle={{ padding: space.lg, gap: space.sm }} keyboardShouldPersistTaps="handled">
            {messages.map((m) => (
              <View key={m.id} style={{ alignItems: m.from === "user" ? "flex-end" : "flex-start", gap: 6 }}>
                <View
                  style={{
                    maxWidth: "84%",
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 18,
                    borderBottomLeftRadius: m.from === "agent" ? 4 : 18,
                    borderBottomRightRadius: m.from === "user" ? 4 : 18,
                    backgroundColor: m.from === "user" ? colors.brand : colors.surface,
                    borderWidth: m.from === "agent" ? 1 : 0,
                    borderColor: colors.line,
                  }}
                >
                  <Txt variant="body" color={m.from === "user" ? colors.white : colors.ink} style={{ fontSize: 14.5 }}>{m.text}</Txt>
                </View>
                {m.actions?.map((a) => (
                  <Pressable
                    key={a.label}
                    onPress={() => runAction(a)}
                    style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.inverse }}
                  >
                    <Ionicons name={a.kind === "whatsapp" ? "logo-whatsapp" : "arrow-forward"} size={15} color={a.kind === "whatsapp" ? colors.brand : colors.onInverse} />
                    <Txt variant="label" color={colors.onInverse} style={{ fontSize: 13 }}>{a.label}</Txt>
                  </Pressable>
                ))}
              </View>
            ))}
            {messages.length <= 2 && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.sm }}>
                {TOPICS.map((t) => (
                  <Chip key={t.label} label={t.label} onPress={() => pickTopic(t)} />
                ))}
              </View>
            )}
          </ScrollView>

          {/* Composer */}
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: space.sm, paddingHorizontal: space.md, paddingTop: space.sm, paddingBottom: Math.max(insets.bottom, space.md), borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface }}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Type your message…"
              placeholderTextColor={colors.faint}
              multiline
              style={{ flex: 1, maxHeight: 110, minHeight: 44, borderRadius: 22, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontFamily: fonts.body, fontSize: 15, color: colors.ink }}
            />
            <Pressable
              onPress={send}
              disabled={!text.trim() || sending}
              accessibilityLabel="Send message"
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: text.trim() ? colors.brand : colors.line, alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="send" size={18} color={colors.white} />
            </Pressable>
          </View>
      </View>
    </KeyboardAvoidingView>
  );
}
