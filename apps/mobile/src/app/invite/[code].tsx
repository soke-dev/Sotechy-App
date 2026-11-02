// An invite link (app.sotechy.shop/invite/<username>): keeps the code on this phone, then opens sign-up
// with it filled in, or Invite friends for someone already signed in (where they can add it if they haven't).
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { keepInviteCode } from "@/lib/referrals";
import { colors } from "@/lib/theme";

export default function InviteLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { user, loading } = useAuth();
  useEffect(() => {
    if (loading) return;
    const c = (code ?? "").trim().replace(/^@/, "").toLowerCase();
    (async () => {
      if (c) await keepInviteCode(c);
      if (user) router.replace(c && c !== user.username ? `/referrals?code=${encodeURIComponent(c)}` : "/referrals");
      else router.replace(c ? `/sign-in?ref=${encodeURIComponent(c)}&mode=signup` : "/sign-in");
    })();
  }, [code, user, loading]);
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.brand} />
    </View>
  );
}
