import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { BUSINESS } from "@sotechy/shared";
import { useDialog } from "@/components/dialog";
import { useTabBarInset } from "@/components/tab-bar";
import { Button, Divider, ListRow, Pill, ScreenHeader, tap, Txt, ui, type IconName } from "@/components/ui";
import { UserAvatar } from "@/components/user-avatar";
import { DEMO_MODE } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors, fonts, gutter, radius, space } from "@/lib/theme";
import { useThemeMode, type ThemePreference } from "@/lib/theme-mode";

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <Txt variant="overline" style={{ paddingHorizontal: 4 }}>{title}</Txt>
      <View style={[ui.card, { padding: 0, overflow: "hidden" }]}>{children}</View>
    </View>
  );
}

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: IconName }[] = [
  { value: "light", label: "Light", icon: "sunny" },
  { value: "dark", label: "Dark", icon: "moon" },
  { value: "system", label: "Device", icon: "phone-portrait-outline" },
];

function AppearancePicker() {
  const { preference, setPreference } = useThemeMode();
  return (
    <View style={{ gap: space.sm }}>
      <Txt variant="overline" style={{ paddingHorizontal: 4 }}>Appearance</Txt>
      <View style={[ui.card, { padding: 6, flexDirection: "row", gap: 6 }]}>
        {THEME_OPTIONS.map((o) => {
          const on = preference === o.value;
          return (
            <Pressable
              key={o.value}
              onPress={() => {
                if (on) return;
                tap();
                setPreference(o.value);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={{ flex: 1, alignItems: "center", gap: 6, paddingVertical: space.md, borderRadius: radius.md, backgroundColor: on ? colors.inverse : "transparent" }}
            >
              <Ionicons name={o.icon} size={20} color={on ? colors.onInverse : colors.ink2} />
              <Txt variant="label" color={on ? colors.onInverse : colors.ink2} style={{ fontSize: 13 }}>{o.label}</Txt>
            </Pressable>
          );
        })}
      </View>
      <Txt variant="caption" style={{ paddingHorizontal: 4 }}>
        {preference === "system" ? "Following your phone's light or dark setting." : `Always ${preference}. Choose Device to follow your phone.`}
      </Txt>
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
            <UserAvatar seed={user.id} size={60} />
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
          </Group>
        )}

        <Group title="Shopping">
          <ListRow illo="receipt" title="My orders" onPress={() => router.push("/orders")} />
          <Divider style={{ marginLeft: 62 }} />
          <ListRow illo="heart" title="Saved items" onPress={() => router.push("/wishlist")} />
          <Divider style={{ marginLeft: 62 }} />
          <ListRow illo="cart" title="Cart" onPress={() => router.push("/cart")} />
        </Group>

        <AppearancePicker />

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
          {DEMO_MODE && (
            <View style={{ alignSelf: "center" }}>
              <Pill label="Demo mode · dummy data" tone="warning" />
            </View>
          )}
          <Txt variant="caption">{BUSINESS.name} · {BUSINESS.headOffice}</Txt>
        </View>
      </ScrollView>
    </View>
  );
}
