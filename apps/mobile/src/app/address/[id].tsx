import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Switch, View } from "react-native";
import type { AddressInput } from "@sotechy/shared";
import { useToast } from "@/components/toast";
import { BottomBar, Button, Chip, Input, Loading, Txt, ui } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors, gutter, space } from "@/lib/theme";

const LABELS = ["Home", "Office", "Other"];

/** Add (`id` = "new") or edit a saved address. */
export default function AddressFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const { user } = useAuth();
  const toast = useToast();
  const [loaded, setLoaded] = useState(isNew);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AddressInput>({
    label: "Home",
    recipientName: user?.fullName ?? "",
    phone: user?.phone ?? "",
    line1: "",
    line2: "",
    city: "Benin City",
    state: "Edo",
    isDefault: false,
  });

  useEffect(() => {
    if (isNew) return;
    api.addresses().then((list) => {
      const a = list.find((x) => x.id === id);
      if (a) setForm({ label: a.label, recipientName: a.recipientName, phone: a.phone, line1: a.line1, line2: a.line2 ?? "", city: a.city, state: a.state, isDefault: a.isDefault });
      setLoaded(true);
    });
  }, [id, isNew]);

  if (!loaded) return <Loading />;

  const set = (patch: Partial<AddressInput>) => setForm((f) => ({ ...f, ...patch }));
  const valid = form.recipientName.trim() && form.phone.trim().length >= 5 && form.line1.trim() && form.city.trim() && form.state.trim();

  async function save() {
    setSaving(true);
    const input = { ...form, line2: form.line2?.trim() || null, label: form.label?.trim() || null };
    try {
      if (isNew) await api.addAddress(input);
      else await api.updateAddress(id, input);
      toast(isNew ? "Address saved" : "Address updated");
      router.back();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save", { icon: "alert-circle" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={ui.screen} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <Stack.Screen options={{ title: isNew ? "New address" : "Edit address" }} />
      <ScrollView contentContainerStyle={{ padding: gutter, gap: space.lg, paddingBottom: space.xxl }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: space.sm }}>
          <Txt variant="label">Save as</Txt>
          <View style={[ui.row, { flexWrap: "wrap" }]}>
            {LABELS.map((l) => (
              <Chip key={l} label={l} icon={l === "Home" ? "home-outline" : l === "Office" ? "briefcase-outline" : "location-outline"} active={form.label === l} onPress={() => set({ label: l })} />
            ))}
          </View>
        </View>
        <Input label="Full name" icon="person-outline" value={form.recipientName} onChangeText={(v) => set({ recipientName: v })} autoComplete="name" />
        <Input label="Phone number" icon="call-outline" value={form.phone} onChangeText={(v) => set({ phone: v })} keyboardType="phone-pad" autoComplete="tel" />
        <Input label="Street address" icon="home-outline" value={form.line1} onChangeText={(v) => set({ line1: v })} placeholder="House number and street" />
        <Input label="Landmark or apartment (optional)" value={form.line2 ?? ""} onChangeText={(v) => set({ line2: v })} placeholder="e.g. Opposite the filling station" />
        <View style={[ui.row, { gap: space.md }]}>
          <View style={{ flex: 1 }}>
            <Input label="City" value={form.city} onChangeText={(v) => set({ city: v })} />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="State" value={form.state} onChangeText={(v) => set({ state: v })} />
          </View>
        </View>
        <View style={[ui.card, ui.between]}>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="label">Use as default address</Txt>
            <Txt variant="small">Selected automatically at checkout</Txt>
          </View>
          <Switch value={!!form.isDefault} onValueChange={(v) => set({ isDefault: v })} trackColor={{ true: colors.brand, false: colors.line }} thumbColor={colors.white} />
        </View>
      </ScrollView>
      <BottomBar>
        <Button title={isNew ? "Save address" : "Save changes"} variant="dark" icon="checkmark" onPress={save} loading={saving} disabled={!valid} style={{ flex: 1 }} />
      </BottomBar>
    </KeyboardAvoidingView>
  );
}
