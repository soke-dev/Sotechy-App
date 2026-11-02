// Floating support button with a dismissible "need help?" pop-up and the live chat sheet.
// Signed in, messages go to the customer's conversation in Admin → Support, and staff replies show
// here (checked every few seconds while the chat is open). Quick topics answer straight away.
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
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
import { api, uploadPhoto } from "@/lib/api";
import type { SupportChatSummary } from "@sotechy/shared";
import { useAuth } from "@/lib/auth";
import { colors, fonts, radius, space } from "@/lib/theme";
import { SupportAgentArt } from "./tab-icons";
import { Chip, tap, Txt } from "./ui";

/** "human" sends the conversation to Sotechy's team, who answer right here */
type Action = { label: string; kind: "human" } | { label: string; kind: "route"; href: Href };
interface Message {
  id: string;
  from: "agent" | "user";
  text: string;
  actions?: Action[];
  /** When it was written, so quick answers and the saved conversation interleave */
  at: number;
  /** Sent but not saved yet */
  sending?: boolean;
  /** A photo with (or instead of) the words */
  imageUrl?: string | null;
}

const HUMAN: Action = { label: "Talk to a person", kind: "human" };

// Quick answers; anything else goes to the team with "Talk to a person"
const TOPICS: { label: string; reply: Omit<Message, "id" | "from" | "at"> }[] = [
  {
    label: "Track my order",
    reply: { text: "Every order shows each step under Orders: payment, the store accepting it, then on its way or ready at the pickup location.", actions: [{ label: "Open my orders", kind: "route", href: "/orders" }, HUMAN] },
  },
  {
    label: "Paying",
    reply: {
      text: "You pay with stablecoin (USDT or USDC) through Money Moves at checkout. Bank transfer is coming soon. You can also use your store tokens to pay part of an order.",
      actions: [HUMAN],
    },
  },
  {
    label: "Delivery & pickup",
    reply: {
      text: "Stores deliver to your home, or you collect from one of their pickup locations. You'll see the options, prices and times at checkout.",
      actions: [HUMAN],
    },
  },
  {
    label: "Tokens",
    reply: {
      text: "You earn 1 token per ₦1 from each store when your order arrives, plus 10% in $SOTECHY when you buy from other stores. Use them at checkout to pay part of an order.",
      actions: [{ label: "Open my wallet", kind: "route", href: "/wallet" }, HUMAN],
    },
  },
  {
    label: "A problem with an order",
    reply: { text: "Sorry about that. Tell us what happened, and add a photo if it helps. Someone from our team will reply right here.", actions: [HUMAN] },
  },
  { label: "Talk to a person", reply: { text: "", actions: [] } },
];

const useNative = Platform.OS !== "web";

/** Illustrated support agent with a soft pulse ring. */
/** Diameter of the floating support button. */
const LAUNCHER = 52;

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
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Chat with support" style={{ position: "absolute", right: 16, bottom, width: LAUNCHER, height: LAUNCHER }}>
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
              borderRadius: LAUNCHER / 2,
              borderWidth: 2,
              borderColor: colors.brand,
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }) }],
            }}
          />
          <View style={{ width: LAUNCHER, height: LAUNCHER, borderRadius: LAUNCHER / 2, backgroundColor: colors.surface, padding: 3, transform: [{ scale: pressed ? 0.94 : 1 }], shadowColor: "#2B1D0E", shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 9 }}>
            <View style={{ flex: 1, borderRadius: LAUNCHER / 2 - 3, overflow: "hidden" }}>
              <SupportAgentArt size={LAUNCHER - 6} />
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
            bottom: bottomOffset + LAUNCHER + 28,
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

      <SupportChatModal visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** The live chat in its own sheet, for "Need help" buttons anywhere in the app */
export function SupportChatModal({ visible, onClose, orderId, past }: { visible: boolean; onClose: () => void; orderId?: string; past?: SupportChatSummary | null }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <ChatSheet onClose={onClose} orderId={orderId} past={past} />
    </Modal>
  );
}

const POLL_MS = 3000;

/** `past` opens on that conversation: the live one if it's still open, or a closed one to read */
export function ChatSheet({ onClose, orderId, past: startOn }: { onClose: () => void; orderId?: string; past?: SupportChatSummary | null }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { user } = useAuth();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: "hello", from: "agent", text: `Hi${user?.fullName ? ` ${user.fullName.split(" ")[0]}` : ""} 👋 Welcome to Sotechy.`, at: 0 },
    { id: "ask", from: "agent", text: "How can we help you today? Pick a topic or type your question.", at: 1 },
  ]);
  // The saved conversation with the team, checked every few seconds while the chat is open
  const [thread, setThread] = useState<Message[]>([]);
  const fromServer = (chat: { messages: { id: string; fromStaff: boolean; body: string; imageUrl?: string | null; createdAt: string }[] }) =>
    chat.messages.map((m): Message => ({ id: m.id, from: m.fromStaff ? "agent" : "user", text: m.body, imageUrl: m.imageUrl, at: Date.parse(m.createdAt) }));
  // A photo: picked, uploaded, then sent like a message
  const [uploading, setUploading] = useState(false);
  async function sendPhoto() {
    if (!user) return router.push("/sign-in");
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (picked.canceled || !picked.assets[0]) return;
    setUploading(true);
    try {
      const url = await uploadPhoto(picked.assets[0]);
      const chat = await api.sendSupportChat("", orderId, url);
      setThread(fromServer(chat));
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    } catch (err) {
      push({ from: "agent", text: err instanceof Error ? `That photo didn't send: ${err.message}` : "That photo didn't send. Try again." });
    } finally {
      setUploading(false);
    }
  }
  useEffect(() => {
    if (!user) return;
    let live = true;
    const load = () =>
      api
        .supportChat()
        .then((chat) => {
          if (!live) return;
          setThread((prev) => {
            const next = fromServer(chat);
            if (next.length > prev.length) setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
            return next;
          });
        })
        .catch(() => {});
    void load();
    const t = setInterval(load, POLL_MS);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [user]);
  const shown = [...messages, ...thread].sort((a, b) => a.at - b.at);
  // Past conversations: the list, and one opened to read
  const [view, setView] = useState<"chat" | "history">("chat");
  const [past, setPast] = useState<SupportChatSummary[] | null>(null);
  const [reading, setReading] = useState<{ messages: Message[] } | null>(null);
  const greeting = (): Message[] => [
    { id: "hello", from: "agent", text: `Hi${user?.fullName ? ` ${user.fullName.split(" ")[0]}` : ""} 👋 Welcome to Sotechy.`, at: 0 },
    { id: "ask", from: "agent", text: "How can we help you today? Pick a topic or type your question.", at: 1 },
  ];
  const openHistory = () => {
    tap();
    setReading(null);
    setView("history");
    api.supportChats().then(setPast, () => setPast([]));
  };
  const openPast = (c: SupportChatSummary) => {
    tap();
    if (c.open) return setView("chat");
    api.supportChatById(c.id).then((chat) => setReading({ messages: fromServer(chat) }), () => {});
  };
  const newChat = async () => {
    tap();
    if (user) {
      await api.newSupportChat().catch(() => null);
      setThread([]);
    }
    setMessages(greeting());
    setReading(null);
    setView("chat");
  };
  useEffect(() => {
    if (!startOn || startOn.open) return;
    setView("history");
    api.supportChatById(startOn.id).then((chat) => setReading({ messages: fromServer(chat) }), () => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const sheetHeight = Math.min(height * 0.78, 640);
  const close = () => {
    Keyboard.dismiss();
    onClose();
  };

  const push = (...m: Omit<Message, "id" | "at">[]) => {
    const now = Date.now();
    setMessages((prev) => [...prev, ...m.map((x, i) => ({ ...x, id: `local-${now}-${i}`, at: now + i }))]);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
  };

  const pickTopic = (t: (typeof TOPICS)[number]) => {
    tap();
    if (t.label === "Talk to a person") return void talkToPerson();
    push({ from: "user", text: t.label });
    setTimeout(() => push({ from: "agent", ...t.reply }), 450);
  };

  const runAction = async (a: Action) => {
    if (a.kind === "route") {
      close();
      router.push(a.href);
    } else await talkToPerson();
  };

  /** Hands the chat to Sotechy's team: the request is saved like a message, and they reply here */
  async function talkToPerson() {
    if (!user) return push({ from: "agent", text: "Sign in so our team can reply to you here.", actions: [{ label: "Sign in", kind: "route", href: "/sign-in" }] });
    setSending(true);
    try {
      const chat = await api.sendSupportChat("I'd like to talk to a person.", orderId);
      setThread(fromServer(chat));
      push({ from: "agent", text: "Done. Someone from our team will reply right here, usually within minutes. Tell us more below while you wait." });
    } catch {
      push({ from: "agent", text: "That didn't go through. Check your connection and try again.", actions: [HUMAN] });
    } finally {
      setSending(false);
    }
  }

  async function send() {
    const message = text.trim();
    if (!message) return;
    setText("");
    setSending(true);
    try {
      if (user) {
        const first = thread.length === 0;
        // Shown straight away; replaced by the saved copy when it comes back
        const pending: Message = { id: `pending-${Date.now()}`, from: "user", text: message, at: Date.now(), sending: true };
        setThread((prev) => [...prev, pending]);
        setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
        const chat = await api.sendSupportChat(message, orderId);
        setThread(fromServer(chat));
        if (first) push({ from: "agent", text: "Thanks! Someone from our team will reply right here. You'll get a notification when they do, so you can close this for now." });
      } else {
        push({ from: "user", text: message });
        push({ from: "agent", text: "Sign in so our team can reply to you here.", actions: [{ label: "Sign in", kind: "route", href: "/sign-in" }] });
      }
    } catch {
      setThread((prev) => prev.filter((m) => !m.sending));
      push({ from: "agent", text: "Sorry, that didn't send. Check your connection and try again." });
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
            {user ? (
              <>
                <Pressable onPress={view === "history" ? () => (reading ? setReading(null) : setView("chat")) : openHistory} hitSlop={8} accessibilityLabel={view === "history" ? "Back" : "Past conversations"} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={view === "history" ? "arrow-back" : "time-outline"} size={18} color={colors.white} />
                </Pressable>
                <Pressable onPress={newChat} hitSlop={8} accessibilityLabel="New conversation" style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="create-outline" size={18} color={colors.white} />
                </Pressable>
              </>
            ) : null}
            <Pressable onPress={close} hitSlop={12} accessibilityLabel="Close chat" style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="close" size={18} color={colors.white} />
            </Pressable>
          </View>

          {/* Past conversations */}
          {view === "history" && !reading && (
            <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.sm }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Txt variant="label">Your conversations</Txt>
                <Pressable onPress={newChat} hitSlop={6}>
                  <Txt variant="label" color={colors.brandPressed}>+ New chat</Txt>
                </Pressable>
              </View>
              {past === null && <Txt variant="small">Loading…</Txt>}
              {past?.length === 0 && <Txt variant="small">No conversations yet.</Txt>}
              {past?.map((c) => (
                <Pressable key={c.id} onPress={() => openPast(c)} style={({ pressed }) => ({ padding: space.md, borderRadius: radius.lg, borderWidth: 1, borderColor: c.open ? colors.brand : colors.line, backgroundColor: pressed ? colors.surfaceAlt : colors.surface, gap: 3 })}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm }}>
                    <Txt variant="caption">{new Date(c.lastMessageAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</Txt>
                    <Txt variant="caption" color={c.open ? colors.success : colors.muted}>{c.open ? "Open" : "Closed"}</Txt>
                  </View>
                  <Txt variant="body" numberOfLines={2} style={{ fontSize: 14 }}>
                    {c.lastFromStaff ? "Sotechy: " : "You: "}
                    {c.lastMessage}
                  </Txt>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {/* Conversation (the current one, or a past one being read) */}
          {(view === "chat" || reading) && (
          <ScrollView ref={scroll} contentContainerStyle={{ padding: space.lg, gap: space.sm }} keyboardShouldPersistTaps="handled">
            {(reading ? reading.messages : shown).map((m) => (
              <View key={m.id} style={{ alignItems: m.from === "user" ? "flex-end" : "flex-start", gap: 6, opacity: m.sending ? 0.6 : 1 }}>
                {m.imageUrl ? (
                  <Image source={{ uri: m.imageUrl }} style={{ width: 200, height: 200, borderRadius: 16, backgroundColor: colors.surfaceAlt }} contentFit="cover" />
                ) : null}
                {m.text ? (
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
                ) : null}
                {m.actions?.map((a) => (
                  <Pressable
                    key={a.label}
                    onPress={() => runAction(a)}
                    style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.inverse }}
                  >
                    <Ionicons name={a.kind === "human" ? "person-outline" : "arrow-forward"} size={15} color={a.kind === "human" ? colors.brand : colors.onInverse} />
                    <Txt variant="label" color={colors.onInverse} style={{ fontSize: 13 }}>{a.label}</Txt>
                  </Pressable>
                ))}
              </View>
            ))}
            {!reading && messages.length <= 2 && thread.length === 0 && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.sm }}>
                {TOPICS.map((t) => (
                  <Chip key={t.label} label={t.label} onPress={() => pickTopic(t)} />
                ))}
              </View>
            )}
          </ScrollView>
          )}

          {/* Composer (not while reading a closed conversation) */}
          {view === "chat" && (
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: space.sm, paddingHorizontal: space.md, paddingTop: space.sm, paddingBottom: Math.max(insets.bottom, space.md), borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface }}>
            {user ? (
              <Pressable onPress={sendPhoto} disabled={uploading} accessibilityLabel="Send a photo" style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line }}>
                <Ionicons name={uploading ? "hourglass-outline" : "image-outline"} size={20} color={colors.ink2} />
              </Pressable>
            ) : null}
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
          )}
      </View>
    </KeyboardAvoidingView>
  );
}
