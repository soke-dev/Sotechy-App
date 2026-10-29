// Every token movement in the wallet (the wallet screen shows the last 10)
import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack } from "expo-router";
import { Linking, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { ActivityRows } from "@/components/wallet-activity";
import { ErrorView, Loading, Txt, ui } from "@/components/ui";
import { api } from "@/lib/api";
import { colors, gutter, space } from "@/lib/theme";
import { useAsync } from "@/lib/use-async";

export default function WalletActivityScreen() {
  const { data, error, loading, reload } = useAsync(() => api.wallet());
  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorView message={error} onRetry={reload} />;
  const wallet = data ?? { address: null, addressUrl: null, balances: [], activity: [] };
  return (
    <ScrollView style={ui.screen} contentContainerStyle={{ padding: gutter, gap: space.md, paddingBottom: space.xxl }} refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.brand} />}>
      <Stack.Screen options={{ title: "Activity" }} />
      <View style={[ui.card, { paddingVertical: space.xs }]}>
        <ActivityRows items={wallet.activity} />
      </View>
      {wallet.addressUrl ? (
        <Pressable onPress={() => Linking.openURL(wallet.addressUrl!)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: space.sm }}>
          <Ionicons name="open-outline" size={15} color={colors.brandPressed} />
          <Txt variant="label" color={colors.brandPressed}>See every transaction on Monad</Txt>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}
