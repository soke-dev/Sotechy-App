import { router } from "expo-router";
import { ScrollView, View } from "react-native";
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
          <View style={[ui.card, ui.row, { gap: space.lg }]}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
              <Txt variant="heading" color={colors.brandPressed} style={{ fontFamily: fonts.displayHeavy }}>{initials}</Txt>
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="heading" numberOfLines={1}>{user.fullName ?? "Sotechy customer"}</Txt>
              <Txt variant="small" numberOfLines={1}>{user.email}</Txt>
            </View>
          </View>
        ) : (
          <View style={{ backgroundColor: colors.ink, borderRadius: radius.xl, padding: space.xl, gap: space.md }}>
            <Txt variant="title" color={colors.white}>Sign in for faster checkout</Txt>
            <Txt variant="small" color="#BDB3A8">Track orders, save items and check out in seconds. You can keep browsing as a guest.</Txt>
            <Button title="Sign in or create account" onPress={() => router.push("/sign-in")} style={{ marginTop: space.sm }} />
          </View>
        )}

        <Group title="Shopping">
          <ListRow icon="receipt-outline" title="My orders" onPress={() => router.push("/orders")} />
          <Divider style={{ marginLeft: 62 }} />
          <ListRow icon="heart-outline" title="Saved items" onPress={() => router.push("/wishlist")} />
          <Divider style={{ marginLeft: 62 }} />
          <ListRow icon="bag-handle-outline" title="Cart" onPress={() => router.push("/cart")} />
        </Group>

        <Group title="Help">
          <ListRow icon="chatbubble-ellipses-outline" title="Help & support" subtitle="Call, WhatsApp or send a message" onPress={() => router.push("/support")} />
          <Divider style={{ marginLeft: 62 }} />
          <ListRow icon="document-text-outline" title="Delivery, returns & warranty" onPress={() => router.push("/support")} />
        </Group>

        {user && (
          <View style={[ui.card, { padding: 0, overflow: "hidden" }]}>
            <ListRow icon="log-out-outline" title="Sign out" tone="danger" onPress={signOut} />
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
