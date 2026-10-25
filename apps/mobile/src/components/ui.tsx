// Rough UI primitives. Replace with the real design later.
import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from "react-native";
import { colors, spacing } from "@/lib/theme";

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  const bg = variant === "primary" ? colors.primary : variant === "danger" ? colors.danger : colors.card;
  const fg = variant === "secondary" ? colors.text : colors.primaryText;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.button, { backgroundColor: bg, opacity: disabled ? 0.5 : 1 }, variant === "secondary" && styles.buttonOutline, style]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {action}
    </View>
  );
}

export function Input(props: TextInputProps & { label?: string }) {
  return (
    <View style={{ gap: 4 }}>
      {props.label && <Text style={styles.label}>{props.label}</Text>}
      <TextInput placeholderTextColor={colors.muted} {...props} style={[styles.input, props.style]} />
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
      <Text style={{ color: active ? colors.primaryText : colors.text, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={[styles.center, { gap: spacing.md }]}>
      <Text style={{ color: colors.danger, textAlign: "center" }}>{message}</Text>
      {onRetry && <Button title="Try again" variant="secondary" onPress={onRetry} />}
    </View>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <View style={[styles.center, { gap: spacing.md }]}>
      <Text style={{ fontSize: 16, fontWeight: "600" }}>{title}</Text>
      {children}
    </View>
  );
}

/** Grey box shown until real product images are added. */
export function ImagePlaceholder({ height = 120 }: { height?: number }) {
  return (
    <View style={[styles.placeholder, { height }]}>
      <Text style={{ color: colors.muted, fontSize: 12 }}>No image yet</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  button: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  buttonOutline: { borderWidth: 1, borderColor: colors.border },
  buttonText: { fontWeight: "600", fontSize: 15 },
  card: { backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  label: { fontSize: 13, color: colors.muted },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.card, fontSize: 15 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.card },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  placeholder: { backgroundColor: "#EEF0F3", borderRadius: 8, alignItems: "center", justifyContent: "center" },
  muted: { color: colors.muted },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  price: { fontSize: 16, fontWeight: "700", color: colors.text },
  strike: { color: colors.muted, textDecorationLine: "line-through", fontSize: 13 },
});
