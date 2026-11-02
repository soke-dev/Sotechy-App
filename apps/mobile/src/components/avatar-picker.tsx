// Bottom sheet for choosing an avatar: your own photo, auto (generated), or one of twelve characters.
import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, View } from "react-native";
import { uploadPhoto } from "@/lib/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, space } from "@/lib/theme";
import { useSheetFrame } from "@/lib/layout";
import { tap, Txt } from "./ui";
import { AVATAR_PRESETS, isPhotoAvatar, UserAvatar } from "./user-avatar";

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
  // A centred dialog on desktop
  const frame = useSheetFrame();
  const group = (g: "men" | "women") => AVATAR_PRESETS.filter((p) => p.group === g);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const photo = isPhotoAvatar(current) ? current : null;

  /** A square photo from the library, uploaded and used straight away */
  async function pickPhoto() {
    setError(null);
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    if (picked.canceled || !picked.assets[0]) return;
    setUploading(true);
    try {
      onSelect(await uploadPhoto(picked.assets[0]));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't upload the photo");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType={frame ? "fade" : "slide"} onRequestClose={onClose}>
      <View style={[{ flex: 1, justifyContent: "flex-end" }, frame?.outer]}>
        <Pressable style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.overlay }} onPress={onClose} accessibilityLabel="Close" />
        <View style={[{ backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingBottom: insets.bottom + space.lg, maxHeight: "86%" }, frame?.panel]}>
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
            {/* Their own picture */}
            <Pressable
              onPress={() => {
                tap();
                void pickPhoto();
              }}
              disabled={uploading}
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: space.lg, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: photo ? 2 : 1, borderColor: photo ? colors.brand : colors.line, padding: space.md, opacity: pressed ? 0.85 : 1 })}
            >
              <View style={{ width: 86, alignItems: "center" }}>
                {photo ? (
                  <UserAvatar seed={seed} preset={photo} size={78} />
                ) : (
                  <View style={{ width: 78, height: 78, borderRadius: 39, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center", borderWidth: 2, borderStyle: "dashed", borderColor: colors.brand }}>
                    {uploading ? <ActivityIndicator color={colors.brandPressed} /> : <Ionicons name="camera" size={28} color={colors.brandPressed} />}
                  </View>
                )}
              </View>
              <View style={{ flex: 2, gap: 2 }}>
                <Txt variant="label">{photo ? "Your photo" : "Use your own photo"}</Txt>
                <Txt variant="small">{uploading ? "Uploading…" : photo ? "Tap to choose a different one." : "Pick one from your phone. It's cropped to a circle."}</Txt>
                {error ? <Txt variant="small" color={colors.danger}>{error}</Txt> : null}
              </View>
            </Pressable>
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
                <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, paddingVertical: space.md, gap: space.md }}>
                  {[0, 3].map((from) => (
                    <View key={from} style={{ flexDirection: "row" }}>
                      {group(g)
                        .slice(from, from + 3)
                        .map((p) => (
                          <Tile key={p.id} seed={seed} preset={p.id} selected={current === p.id} onPress={() => onSelect(p.id)} />
                        ))}
                    </View>
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
