// Messages from the stores you're subscribed to, and which stores you get updates from.
import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect } from "react";
import { Pressable, ScrollView, Switch, View } from "react-native";
import { openStore, StoreLogo } from "@/components/store-bits";
import { Divider, EmptyState, Txt, ui } from "@/components/ui";
import { ago, SOTECHY_STORE, storeBySlug, useStores } from "@/lib/marketplace";
import { useStoreNotifications } from "@/lib/store-notifications";
import { colors, gutter, radius, space } from "@/lib/theme";

export default function NotificationsScreen() {
  const { stores } = useStores();
  const { inbox, isSubscribed, toggle, markAllRead } = useStoreNotifications();

  // Opening the inbox counts as reading it
  useEffect(() => {
    markAllRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inbox.length]);

  return (
    <View style={ui.screen}>
      <ScrollView contentContainerStyle={{ padding: gutter, paddingBottom: space.xxl * 2, gap: space.lg }}>
        {inbox.length === 0 ? (
          <EmptyState illo="chat" title="No messages yet" message="Subscribe to a store below and its deals and news show up here." />
        ) : (
          <View style={{ gap: space.sm }}>
            {inbox.map((n) => {
              const store = storeBySlug(n.store);
              if (!store) return null;
              return (
                <Pressable key={n.id} onPress={() => openStore(store.slug)} style={({ pressed }) => [ui.card, { flexDirection: "row", gap: space.md, opacity: pressed ? 0.85 : 1 }]}>
                  <StoreLogo store={store} size={44} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt variant="caption">
                      {store.name} · {ago(n.minsAgo)}
                    </Txt>
                    <Txt variant="label" style={{ fontSize: 15 }}>{n.title}</Txt>
                    <Txt variant="small" color={colors.ink2}>{n.body}</Txt>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={{ gap: space.sm }}>
          <Txt variant="heading">Store updates</Txt>
          <Txt variant="small">Only stores you subscribe to can send you messages.</Txt>
          <View style={[ui.card, { paddingVertical: space.xs }]}>
            {[SOTECHY_STORE, ...(stores ?? [])].map((s, i) => (
              <View key={s.slug}>
                {i > 0 && <Divider />}
                <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md }}>
                  <StoreLogo store={s} size={38} />
                  <View style={{ flex: 1 }}>
                    <Txt variant="label">{s.name}</Txt>
                    <Txt variant="caption">{isSubscribed(s.slug) ? "You get their deals and news" : "Not subscribed"}</Txt>
                  </View>
                  <Switch
                    value={isSubscribed(s.slug)}
                    onValueChange={() => toggle(s.slug)}
                    trackColor={{ true: colors.brand, false: colors.line }}
                    thumbColor={colors.white}
                    // react-native-web colours the "on" knob separately
                    {...({ activeThumbColor: colors.white } as object)}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm, padding: space.md, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt }}>
          <Ionicons name="information-circle-outline" size={18} color={colors.muted} />
          <Txt variant="caption" style={{ flex: 1 }}>Order updates always reach you on WhatsApp and email, whatever you choose here.</Txt>
        </View>
      </ScrollView>
    </View>
  );
}
