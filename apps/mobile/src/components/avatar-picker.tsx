// Bottom sheet for choosing an illustrated avatar: auto (generated) or one of six characters.
import Ionicons from "@expo/vector-icons/Ionicons";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, space } from "@/lib/theme";
import { tap, Txt } from "./ui";
import { AVATAR_PRESETS, UserAvatar } from "./user-avatar";

function Tile({ seed, preset, selected, onPress, label }: { seed: string; preset: string | null; selected: boolean; onPress: () => void; label?: string }) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{ alignItems: "center", gap: 6, flex: 1 }}
    >
      <View style={{ padding: 4, borderRadius: 50, borderWidth: 3, borderColor: selected ? colors.brand : "transparent" }}>
        <UserAvatar seed={seed} preset={preset} size={78} animated={selected} />
        {selected && (
          <View style={{ position: "absolute", right: 0, bottom: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.surface }}>
            <Ionicons name="checkmark" size={14} color={colors.white} />
          </View>
        )}
      </View>
      {label ? <Txt variant="caption">{label}</Txt> : null}
    </Pressable>
  );
}

export function AvatarPicker({ visible, seed, current, onSelect, onClose }: { visible: boolean; seed: string; current: string | null | undefined; onSelect: (preset: string | null) => void; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const group = (g: "men" | "women") => AVATAR_PRESETS.filter((p) => p.group === g);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.overlay }} onPress={onClose} accessibilityLabel="Close" />
        <View style={{ backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingBottom: insets.bottom + space.lg, maxHeight: "86%" }}>
          <View style={{ alignItems: "center", paddingTop: space.sm }}>
            <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line }} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.lg, paddingTop: space.md }}>
            <View>
              <Txt variant="heading">Choose your avatar</Txt>
              <Txt variant="small">Shown on your account and in the app</Txt>
            </View>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close" style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="close" size={18} color={colors.ink} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.lg, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: space.md }}>
              <Tile seed={seed} preset={null} selected={!current} onPress={() => onSelect(null)} />
              <View style={{ flex: 2, gap: 2 }}>
                <Txt variant="label">Auto</Txt>
                <Txt variant="small">A unique character made just for your account.</Txt>
              </View>
            </View>
            {(["men", "women"] as const).map((g) => (
              <View key={g} style={{ gap: space.sm }}>
                <Txt variant="overline" style={{ paddingHorizontal: 4 }}>{g === "men" ? "Men" : "Women"}</Txt>
                <View style={{ flexDirection: "row", backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, paddingVertical: space.md }}>
                  {group(g).map((p) => (
                    <Tile key={p.id} seed={seed} preset={p.id} selected={current === p.id} onPress={() => onSelect(p.id)} />
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
