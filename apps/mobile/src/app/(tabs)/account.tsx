import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { BUSINESS } from "@sotechy/shared";
import { Button, Divider, ListRow, Pill, ScreenHeader, Txt, ui } from "@/components/ui";
import { DEMO_MODE } from "@/lib/api";
import { useTabBarInset } from "@/components/tab-bar";
import { useAuth } from "@/lib/auth";
import { colors, fonts, gutter, radius, space } from "@/lib/theme";

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <Txt variant="overline" style={{ paddingHorizontal: 4 }}>{title}</Txt>
      <View style={[ui.card, { padding: 0, overflow: "hidden" }]}>{children}</View>
    </View>
  );
}

export default function AccountScreen() {
  const { user, signOut } = useAuth();
  const tabInset = useTabBarInset();
  const initials = (user?.fullName ?? user?.email ?? "?")
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <View style={ui.screen}>
      <ScreenHeader title="Account" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: tabInset + space.lg, gap: space.xl }}>
        {user ? (
          <Pressable onPress={() => router.push("/profile")} style={({ pressed }) => [ui.card, ui.row, { gap: space.lg, opacity: pressed ? 0.9 : 1 }]}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
              <Txt variant="heading" color={colors.brandPressed} style={{ fontFamily: fonts.displayHeavy }}>{initials}</Txt>
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="heading" numberOfLines={1}>{user.fullName ?? "Sotechy customer"}</Txt>
              <Txt variant="small" numberOfLines={1}>{user.email}</Txt>
              <Txt variant="caption" color={colors.brandPressed} style={{ marginTop: 2 }}>View and edit profile</Txt>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.faint} />
          </Pressable>
        ) : (
          <View style={{ backgroundColor: colors.ink, borderRadius: radius.xl, padding: space.xl, gap: space.md }}>
            <Txt variant="title" color={colors.white}>Sign in for faster checkout</Txt>
            <Txt variant="small" color="#BDB3A8">Track orders, save items and check out in seconds. You can keep browsing as a guest.</Txt>
            <Button title="Sign in or create account" onPress={() => router.push("/sign-in")} style={{ marginTop: space.sm }} />
          </View>
        )}

        {user && (
          <Group title="Your account">
            <ListRow illo="user" title="Profile & details" subtitle="Name, phone and email" onPress={() => router.push("/profile")} />
            <Divider style={{ marginLeft: 66 }} />
            <ListRow illo="pin" title="Saved addresses" subtitle="Used automatically at checkout" onPress={() => router.push("/addresses")} />
          </Group>
        )}

        <Group title="Shopping">
          <ListRow illo="receipt" title="My orders" onPress={() => router.push("/orders")} />
          <Divider style={{ marginLeft: 62 }} />
          <ListRow illo="heart" title="Saved items" onPress={() => router.push("/wishlist")} />
          <Divider style={{ marginLeft: 62 }} />
          <ListRow illo="cart" title="Cart" onPress={() => router.push("/cart")} />
        </Group>

        <Group title="Help">
          <ListRow illo="chat" title="Help & support" subtitle="Call, WhatsApp or send a message" onPress={() => router.push("/support")} />
          <Divider style={{ marginLeft: 62 }} />
          <ListRow illo="doc" title="Delivery, returns & warranty" onPress={() => router.push("/support")} />
        </Group>

        {user && (
          <View style={[ui.card, { padding: 0, overflow: "hidden" }]}>
            <ListRow illo="logout" title="Sign out" tone="danger" onPress={signOut} />
          </View>
        )}

        <View style={{ alignItems: "center", gap: 4 }}>
          {DEMO_MODE && <Pill label="Demo mode · dummy data" tone="warning" />}
          <Txt variant="caption">{BUSINESS.name} · {BUSINESS.headOffice}</Txt>
        </View>
      </ScrollView>
    </View>
  );
}
