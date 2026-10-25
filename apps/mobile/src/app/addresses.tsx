import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { ScrollView, View } from "react-native";
import { AddressCard } from "@/components/address-card";
import { useToast } from "@/components/toast";
import { BottomBar, Button, EmptyState, ErrorView, Loading, Txt, ui } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { confirm } from "@/lib/confirm";
import { colors, gutter, space } from "@/lib/theme";
import { useAsync } from "@/lib/use-async";

export default function AddressesScreen() {
  const { user } = useAuth();
  const toast = useToast();
  const list = useAsync(async () => (user ? api.addresses() : []), [user?.id]);

  useFocusEffect(
    useCallback(() => {
      list.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  if (!user) {
    return <EmptyState illo="pin" title="Saved addresses" message="Sign in to save addresses for faster checkout." action={<Button title="Sign in" onPress={() => router.push("/sign-in")} />} />;
  }
  if (list.loading && !list.data) return <Loading />;
  if (list.error) return <ErrorView message={list.error} onRetry={list.reload} />;

  const addresses = list.data ?? [];

  async function makeDefault(id: string) {
    await api.updateAddress(id, { isDefault: true });
    await list.reload();
    toast("Default address updated");
  }

  async function remove(id: string) {
    if (!(await confirm("Delete address?", "This address will be removed from your account."))) return;
    await api.deleteAddress(id);
    await list.reload();
    toast("Address deleted", { icon: "trash" });
  }

  return (
    <View style={ui.screen}>
      {addresses.length === 0 ? (
        <EmptyState
          illo="pin"
          title="No saved addresses"
          message="Save your home or office address once and pick it at checkout next time."
          action={<Button title="Add an address" icon="add" onPress={() => router.push({ pathname: "/address/[id]", params: { id: "new" } })} />}
        />
      ) : (
        <>
          <ScrollView contentContainerStyle={{ padding: gutter, gap: space.md, paddingBottom: space.xxl }}>
            <Txt variant="small">Your default address is selected automatically at checkout.</Txt>
            {addresses.map((a) => (
              <AddressCard
                key={a.id}
                address={a}
                footer={
                  <View style={[ui.row, { gap: space.sm, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: space.md }]}>
                    <Button title="Edit" icon="create-outline" variant="outline" size="sm" onPress={() => router.push({ pathname: "/address/[id]", params: { id: a.id } })} />
                    {!a.isDefault && <Button title="Make default" icon="star-outline" variant="outline" size="sm" onPress={() => makeDefault(a.id)} />}
                    <View style={{ flex: 1 }} />
                    <Button title="Delete" variant="danger" size="sm" onPress={() => remove(a.id)} />
                  </View>
                }
              />
            ))}
          </ScrollView>
          <BottomBar>
            <Button title="Add new address" icon="add" variant="dark" onPress={() => router.push({ pathname: "/address/[id]", params: { id: "new" } })} style={{ flex: 1 }} />
          </BottomBar>
        </>
      )}
    </View>
  );
}
