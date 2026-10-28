// Everything the customer was told: order steps, offers, support replies, tokens, account security and
// messages from stores they follow, with filters; and which stores they get updates from.
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Switch, View } from "react-native";
import { Illo } from "@/components/illustrations";
import { openStore, StoreLogo } from "@/components/store-bits";
import { Chip, Divider, EmptyState, Txt, ui, type IconName } from "@/components/ui";
import { ago, SOTECHY_STORE, storeBySlug, useStores } from "@/lib/marketplace";
import { useStoreNotifications } from "@/lib/store-notifications";
import { colors, gutter, radius, space } from "@/lib/theme";

type Filter = "all" | "order" | "offer" | "tokens" | "support" | "security" | "store";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "order", label: "Orders" },
  { key: "offer", label: "Offers" },
  { key: "tokens", label: "Tokens" },
  { key: "support", label: "Support" },
  { key: "security", label: "Security" },
  { key: "store", label: "Stores" },
];
const KIND_ICON: Record<string, IconName> = {
  order: "cube-outline",
  offer: "pricetag-outline",
  tokens: "wallet-outline",
  support: "chatbubbles-outline",
  security: "shield-checkmark-outline",
};

/** One row: a store's message or one of the customer's own notifications */
interface Row {
  id: string;
  kind: Filter;
  title: string;
  body: string;
  at: string;
  unread: boolean;
  open: () => void;
  store?: ReturnType<typeof storeBySlug>;
  storeName?: string;
}

export default function NotificationsScreen() {
  const { stores } = useStores();
  const { inbox, feed, isSubscribed, toggle, markAllRead } = useStoreNotifications();
  const [filter, setFilter] = useState<Filter>("all");
  // Opening the list counts as reading it; the new ones stay marked for a moment first
  const [seen] = useState(() => new Set(feed.filter((n) => n.readAt).map((n) => n.id)));
  useEffect(() => {
    const t = setTimeout(markAllRead, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inbox.length, feed.length]);

  const rows: Row[] = [
    ...feed.map((n) => ({
      id: n.id,
      kind: (FILTERS.some((f) => f.key === n.kind) ? n.kind : "all") as Filter,
      title: n.title,
      body: n.body,
      at: n.createdAt,
      unread: !seen.has(n.id) && !n.readAt,
      open: () => n.url && router.push(n.url as Href),
    })),
    ...inbox.map((n) => ({
      id: n.id,
      kind: "store" as Filter,
      title: n.title,
      body: n.body,
      at: n.createdAt,
      unread: false,
      store: storeBySlug(n.storeSlug),
      storeName: n.storeName,
      open: () => (n.productSlug ? router.push({ pathname: "/product/[id]", params: { id: n.productSlug } }) : openStore(n.storeSlug)),
    })),
  ]
    .filter((r) => filter === "all" || r.kind === filter)
    .sort((x, y) => y.at.localeCompare(x.at));

  return (
    <View style={ui.screen}>
      <ScrollView contentContainerStyle={{ padding: gutter, paddingBottom: space.xxl * 2, gap: space.lg }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {FILTERS.map((f) => (
            <Chip key={f.key} label={f.label} active={filter === f.key} onPress={() => setFilter(f.key)} />
          ))}
        </ScrollView>

        {rows.length === 0 ? (
          <EmptyState
            illo="chat"
            title="Nothing here yet"
            message={filter === "store" || filter === "all" ? "Order updates, offers, tokens and messages from stores you follow show up here." : "Notifications like this show up here."}
          />
        ) : (
          <View style={{ gap: space.sm }}>
            {rows.map((r) => (
              <Pressable
                key={r.id}
                onPress={r.open}
                style={({ pressed }) => [ui.card, { flexDirection: "row", gap: space.md, opacity: pressed ? 0.85 : 1, borderColor: r.unread ? colors.brand : colors.line }]}
              >
                {r.kind === "store" ? (
                  r.store ? <StoreLogo store={r.store} size={44} /> : <Illo name="store" size={44} />
                ) : (
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: r.kind === "security" ? colors.surfaceAlt : colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name={KIND_ICON[r.kind] ?? "notifications-outline"} size={21} color={r.kind === "security" ? colors.ink : colors.brandPressed} />
                  </View>
                )}
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    {r.unread && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand }} />}
                    <Txt variant="caption" style={{ flex: 1 }}>
                      {r.storeName ? `${r.storeName} · ` : ""}
                      {ago(Math.max(0, Math.round((Date.now() - new Date(r.at).getTime()) / 60_000)))}
                    </Txt>
                  </View>
                  <Txt variant="label" style={{ fontSize: 15 }}>{r.title}</Txt>
                  <Txt variant="small" color={colors.ink2}>{r.body}</Txt>
                </View>
              </Pressable>
            ))}
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
