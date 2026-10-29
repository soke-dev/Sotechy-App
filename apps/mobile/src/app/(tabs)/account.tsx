import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Pressable, ScrollView, Switch, View } from "react-native";
import { BUSINESS } from "@sotechy/shared";
import { useDialog } from "@/components/dialog";
import { useTabBarInset } from "@/components/tab-bar";
import { Button, Divider, ListRow, ScreenHeader, tap, Txt, ui } from "@/components/ui";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth } from "@/lib/auth";
import { colors, fonts, gutter, radius, space } from "@/lib/theme";
import { useThemeMode } from "@/lib/theme-mode";

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <Txt variant="overline" style={{ paddingHorizontal: 4 }}>{title}</Txt>
      <View style={[ui.card, { padding: 0, overflow: "hidden" }]}>{children}</View>
    </View>
  );
}

/** Compact dark-mode switch (light is the default). */
function DarkModeRow() {
  const { resolved, setTheme } = useThemeMode();
  const dark = resolved === "dark";
  return (
    <View style={[ui.card, { padding: 0, overflow: "hidden" }]}>
      <ListRow
        icon={dark ? "moon" : "sunny-outline"}
        title="Dark mode"
        subtitle={dark ? "On" : "Off"}
        onPress={() => {
          tap();
          setTheme(dark ? "light" : "dark");
        }}
        right={
          <Switch
            value={dark}
            onValueChange={(v) => {
              tap();
              setTheme(v ? "dark" : "light");
            }}
            trackColor={{ true: colors.brand, false: colors.line }}
            thumbColor={colors.white}
          />
        }
      />
    </View>
  );
}

export default function AccountScreen() {
  const { user, signOut } = useAuth();
  const tabInset = useTabBarInset();
  const dialog = useDialog();

  async function confirmSignOut() {
    const ok = await dialog.confirm({
      title: "Sign out?",
      message: "Your cart stays on this device. Sign in again any time to see your orders.",
      illo: "logout",
      confirmLabel: "Sign out",
      tone: "danger",
    });
    if (ok) await signOut();
  }

  return (
    <View style={ui.screen}>
      <ScreenHeader title="Account" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: tabInset + space.lg, gap: space.xl }}>
        {user ? (
          <Pressable onPress={() => router.push("/profile")} style={({ pressed }) => [ui.card, ui.row, { gap: space.lg, opacity: pressed ? 0.9 : 1 }]}>
            <UserAvatar seed={user.id} preset={user.avatarStyle} size={60} />
            <View style={{ flex: 1 }}>
              <Txt variant="heading" numberOfLines={1}>{user.fullName ?? "Sotechy customer"}</Txt>
              <Txt variant="small" numberOfLines={1}>{user.email}</Txt>
              <Txt variant="caption" color={colors.brandPressed} style={{ marginTop: 2, fontFamily: fonts.semibold }}>View and edit profile</Txt>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.faint} />
          </Pressable>
        ) : (
          <View style={{ backgroundColor: colors.panel, borderRadius: radius.xl, padding: space.xl, gap: space.md }}>
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
            <Divider style={{ marginLeft: 66 }} />
            <ListRow illo="shield" title="Security & notifications" subtitle="Password, and which notifications you get" onPress={() => router.push("/security")} />
          </Group>
        )}

        <Group title="Shopping">
          <ListRow illo="receipt" title="My orders" onPress={() => router.push("/orders")} />
          <Divider style={{ marginLeft: 62 }} />
          <ListRow illo="heart" title="Saved items" onPress={() => router.push("/wishlist")} />
          <Divider style={{ marginLeft: 62 }} />
          <ListRow illo="cart" title="Cart" onPress={() => router.push("/cart")} />
        </Group>

        <Group title="Stores and tokens">
          <ListRow illo="coin" title="Wallet" subtitle="Your store tokens, send and receive" onPress={() => router.push("/wallet")} />
          <Divider style={{ marginLeft: 62 }} />
          <ListRow illo="tag" title="My offers" subtitle="Prices you're negotiating with stores" onPress={() => router.push("/offers")} />
          <Divider style={{ marginLeft: 62 }} />
          <ListRow illo="chat" title="Store notifications" subtitle="Choose which stores can message you" onPress={() => router.push("/notifications")} />
          <Divider style={{ marginLeft: 62 }} />
          <ListRow illo="store" title="Stores" onPress={() => router.push("/stores")} />
        </Group>

        <DarkModeRow />

        <Group title="Help">
          <ListRow illo="chat" title="Help & support" subtitle="Call, WhatsApp or send a message" onPress={() => router.push("/support")} />
          <Divider style={{ marginLeft: 62 }} />
          <ListRow illo="doc" title="Delivery, returns & warranty" onPress={() => router.push("/support")} />
        </Group>

        {user && (
          <View style={[ui.card, { padding: 0, overflow: "hidden" }]}>
            <ListRow illo="logout" title="Sign out" tone="danger" onPress={confirmSignOut} />
          </View>
        )}

        <View style={{ alignItems: "center", gap: 4 }}>
          <Txt variant="caption">{BUSINESS.name} · {BUSINESS.headOffice}</Txt>
        </View>
      </ScrollView>
    </View>
  );
}
