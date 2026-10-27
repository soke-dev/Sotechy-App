// Bottom sheet for writing a review: tap-to-rate stars, title, review text and photos.
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from "react-native";
import { TOKEN_RULES } from "@sotechy/shared";
import { uploadPhoto } from "@/lib/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, space } from "@/lib/theme";
import { Button, Input, tap, Txt } from "./ui";

const LABELS = ["Poor", "Fair", "Good", "Very good", "Excellent"];

export function ReviewSheet({
  visible,
  productName,
  initial,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  productName: string;
  /** The customer's existing review, when editing. */
  initial?: { rating: number; title: string | null; body: string; photos?: string[] };
  onClose: () => void;
  onSubmit: (input: { rating: number; title: string; body: string; photos: string[] }) => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setRating(initial?.rating ?? 0);
    setTitle(initial?.title ?? "");
    setBody(initial?.body ?? "");
    setPhotos(initial?.photos ?? []);
    setError(null);
  }, [visible, initial]);

  async function submit() {
    setSending(true);
    setError(null);
    try {
      await onSubmit({ rating, title: title.trim(), body: body.trim(), photos });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your review");
    } finally {
      setSending(false);
    }
  }

  async function addPhoto() {
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7, allowsEditing: true });
    if (picked.canceled || !picked.assets[0]) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadPhoto(picked.assets[0]);
      setPhotos((p) => [...p, url].slice(0, 4));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add the photo");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: "flex-end" }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.overlay }} onPress={onClose} accessibilityLabel="Close" />
        <View style={{ backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: "90%", paddingBottom: insets.bottom + space.md }}>
          <View style={{ alignItems: "center", paddingTop: space.sm }}>
            <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: colors.line }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: space.md }}>
              <View style={{ flex: 1 }}>
                <Txt variant="heading">{initial ? "Edit your review" : "Rate this product"}</Txt>
                <Txt variant="small" numberOfLines={1}>{productName}</Txt>
              </View>
              <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close" style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="close" size={18} color={colors.ink} />
              </Pressable>
            </View>

            <View style={{ alignItems: "center", gap: space.sm, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, paddingVertical: space.lg }}>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Pressable
                    key={i}
                    onPress={() => {
                      tap();
                      setRating(i);
                    }}
                    hitSlop={4}
                    accessibilityLabel={`${i} star${i > 1 ? "s" : ""}`}
                  >
                    <Ionicons name={i <= rating ? "star" : "star-outline"} size={38} color={i <= rating ? colors.brandYellow : colors.faint} />
                  </Pressable>
                ))}
              </View>
              <Txt variant="label" color={rating ? colors.brandPressed : colors.muted}>{rating ? LABELS[rating - 1] : "Tap a star to rate"}</Txt>
            </View>

            <Input label="Title (optional)" value={title} onChangeText={setTitle} placeholder="Sum it up in a few words" maxLength={120} />
            <Input
              label="Your review"
              value={body}
              onChangeText={setBody}
              placeholder="What did you like or dislike? How are you using it?"
              multiline
              maxLength={2000}
              style={{ minHeight: 110, textAlignVertical: "top" }}
            />
            <View style={{ gap: space.sm }}>
              <Txt variant="label">Photos</Txt>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
                {photos.map((p) => (
                  <View key={p}>
                    <Image source={{ uri: p }} style={{ width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.surfaceAlt }} contentFit="cover" />
                    <Pressable onPress={() => setPhotos(photos.filter((x) => x !== p))} hitSlop={6} accessibilityLabel="Remove photo" style={{ position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="close" size={13} color={colors.onInverse} />
                    </Pressable>
                  </View>
                ))}
                {photos.length < 4 && (
                  <Pressable onPress={addPhoto} disabled={uploading} accessibilityLabel="Add a photo" style={{ width: 72, height: 72, borderRadius: radius.md, borderWidth: 1, borderStyle: "dashed", borderColor: colors.faint, alignItems: "center", justifyContent: "center" }}>
                    {uploading ? <ActivityIndicator color={colors.ink} /> : <Ionicons name="camera-outline" size={22} color={colors.ink2} />}
                  </Pressable>
                )}
              </View>
              <Txt variant="caption">
                Bought it? Reviewing earns {TOKEN_RULES.reviewBonus * 100}% of its price in the store&apos;s token, or {TOKEN_RULES.photoReviewBonus * 100}% with a photo.
              </Txt>
            </View>
            {error && <Txt variant="small" color={colors.danger}>{error}</Txt>}
            <Button title={initial ? "Update review" : "Submit review"} variant="dark" icon="send" onPress={submit} loading={sending} disabled={!rating || body.trim().length < 3 || uploading} />
            <Txt variant="caption" style={{ textAlign: "center" }}>Reviews from customers who bought the item are marked “Verified purchase”.</Txt>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
