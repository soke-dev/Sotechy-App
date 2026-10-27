import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useId, useState, type ComponentProps, type ReactNode } from "react";
import {
  ActivityIndicator,
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ORDER_STATUS_LABELS, formatNaira, type OrderStatus } from "@sotechy/shared";
import { colors, fonts, gutter, radius, space } from "@/lib/theme";
import { Illo, type IlloName } from "./illustrations";
import { Burst } from "./tab-icons";

export type IconName = ComponentProps<typeof Ionicons>["name"];

/** Light haptic tap; no-op where unsupported. */
export function tap() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------
const type = StyleSheet.create({
  display: { fontFamily: fonts.displayHeavy, fontSize: 30, lineHeight: 34, letterSpacing: -0.6 },
  title: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28, letterSpacing: -0.4 },
  heading: { fontFamily: fonts.display, fontSize: 19, lineHeight: 23, letterSpacing: -0.2 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21 },
  medium: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21 },
  label: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19 },
  small: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  overline: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 0.9, textTransform: "uppercase" },
  price: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 20 },
});
const mutedVariants = new Set<keyof typeof type>(["small", "caption", "overline"]);

export function Txt({
  variant = "body",
  color,
  style,
  numberOfLines,
  selectable,
  children,
}: {
  variant?: keyof typeof type;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  selectable?: boolean;
  children: ReactNode;
}) {
  return (
    <Text numberOfLines={numberOfLines} selectable={selectable} style={[type[variant], { color: color ?? (mutedVariants.has(variant) ? colors.muted : colors.ink) }, style]}>
      {children}
    </Text>
  );
}

export function Price({ amount, compareAt, size = "md" }: { amount: number; compareAt?: number | null; size?: "md" | "lg" }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
      <Txt variant="price" style={size === "lg" ? { fontFamily: fonts.displayHeavy, fontSize: 28, lineHeight: 32, letterSpacing: -0.5 } : null}>
        {formatNaira(amount)}
      </Txt>
      {compareAt && compareAt > amount ? (
        <Txt variant="caption" style={{ textDecorationLine: "line-through", color: colors.faint }}>
          {formatNaira(compareAt)}
        </Txt>
      ) : null}
    </View>
  );
}

export const discountPercent = (price: number, compareAt: number | null) =>
  compareAt && compareAt > price ? Math.round(((compareAt - price) / compareAt) * 100) : 0;

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
/** Large-title screen header used by tab screens (they hide the native header). */
export function ScreenHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + space.md, paddingHorizontal: gutter, paddingBottom: space.md, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", backgroundColor: colors.bg }}>
      <View style={{ flex: 1 }}>
        <Txt variant="display">{title}</Txt>
        {subtitle ? <Txt variant="small" style={{ marginTop: 2 }}>{subtitle}</Txt> : null}
      </View>
      {right}
    </View>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space.md }}>
      <Txt variant="heading">{title}</Txt>
      {action ? (
        <Pressable onPress={onAction} hitSlop={10} style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          <Txt variant="label" color={colors.brandPressed}>{action}</Txt>
          <Ionicons name="chevron-forward" size={14} color={colors.brandPressed} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [ui.card, pressed && { opacity: 0.85 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[ui.card, style]}>{children}</View>;
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: colors.line }, style]} />;
}

/** Bottom action bar that sits above the home indicator, or floats above the tab bar (`aboveTabBar` = inset). */
export function BottomBar({ children, aboveTabBar }: { children: ReactNode; aboveTabBar?: number }) {
  const insets = useSafeAreaInsets();
  if (aboveTabBar) {
    return (
      <View
        style={{
          position: "absolute",
          left: gutter,
          right: gutter,
          bottom: aboveTabBar - 6,
          padding: space.md,
          borderRadius: radius.xl,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.line,
          flexDirection: "row",
          alignItems: "center",
          gap: space.md,
          shadowColor: "#2B1D0E",
          shadowOpacity: 0.12,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
        }}
      >
        {children}
      </View>
    );
  }
  return (
    <View
      style={{
        paddingHorizontal: gutter,
        paddingTop: space.md,
        paddingBottom: Math.max(insets.bottom, space.md),
        backgroundColor: colors.surface,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.line,
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
      }}
    >
      {children}
    </View>
  );
}

export function SummaryRow({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
      <Txt variant={strong ? "label" : "small"} color={strong ? colors.ink : colors.muted}>{label}</Txt>
      <Txt variant={strong ? "price" : "medium"} color={tone}>{value}</Txt>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------
type ButtonVariant = "primary" | "dark" | "outline" | "ghost" | "danger";

const buttonColors = (v: ButtonVariant): { bg: string; fg: string; border?: string; pressed: string } =>
  ({
    primary: { bg: colors.brand, fg: colors.white, pressed: colors.brandPressed },
    dark: { bg: colors.inverse, fg: colors.onInverse, pressed: colors.inversePressed },
    outline: { bg: colors.surface, fg: colors.ink, border: colors.line, pressed: colors.surfaceAlt },
    ghost: { bg: "transparent", fg: colors.ink, pressed: colors.surfaceAlt },
    danger: { bg: colors.surface, fg: colors.danger, border: colors.line, pressed: colors.dangerSoft },
  })[v];

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "lg",
  icon,
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: "lg" | "sm";
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = buttonColors(variant);
  const height = size === "lg" ? 52 : 38;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          height,
          borderRadius: radius.pill,
          paddingHorizontal: size === "lg" ? space.xl : space.lg,
          backgroundColor: pressed ? c.pressed : c.bg,
          borderWidth: c.border ? 1 : 0,
          borderColor: c.border,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={c.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={size === "lg" ? 19 : 16} color={c.fg} /> : null}
          <Text style={{ fontFamily: fonts.semibold, fontSize: size === "lg" ? 16 : 14, color: c.fg }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  badge,
  tone = "surface",
  size = 40,
  color,
}: {
  icon: IconName;
  onPress?: () => void;
  badge?: number;
  tone?: "surface" | "glass" | "plain";
  size?: number;
  color?: string;
}) {
  const bg = tone === "surface" ? colors.surface : tone === "glass" ? `${colors.surface}EB` : "transparent";
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: pressed ? colors.surfaceAlt : bg,
        borderWidth: tone === "surface" ? StyleSheet.hairlineWidth : 0,
        borderColor: colors.line,
        alignItems: "center",
        justifyContent: "center",
      })}
    >
      <Ionicons name={icon} size={size * 0.5} color={color ?? colors.ink} />
      {badge ? (
        <View style={ui.badgeDot}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 10, color: colors.white }}>{badge > 99 ? "99+" : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/** Round button holding an illustrated (SVG) icon or avatar instead of a line icon. */
export function ArtButton({ children, label, onPress, badge, size = 44 }: { children: ReactNode; label: string; onPress?: () => void; badge?: number; size?: number }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.line,
        alignItems: "center",
        justifyContent: "center",
      })}
    >
      {children}
      {badge ? (
        <View style={ui.badgeDot}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 10, color: colors.white }}>{badge > 99 ? "99+" : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function Chip({ label, active, onPress, icon, trailingIcon }: { label: string; active?: boolean; onPress?: () => void; icon?: IconName; trailingIcon?: IconName }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        height: 36,
        paddingHorizontal: 14,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: active ? colors.inverse : colors.line,
        backgroundColor: active ? colors.inverse : colors.surface,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
      }}
    >
      {icon ? <Ionicons name={icon} size={14} color={active ? colors.onInverse : colors.ink2} /> : null}
      <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: active ? colors.onInverse : colors.ink2 }}>{label}</Text>
      {trailingIcon ? <Ionicons name={trailingIcon} size={13} color={active ? colors.onInverse : colors.muted} /> : null}
    </Pressable>
  );
}

type PillTone = "brand" | "success" | "warning" | "danger" | "neutral" | "dark";
const pillTones = (t: PillTone): { bg: string; fg: string } =>
  ({
    brand: { bg: colors.brandSoft, fg: colors.brandPressed },
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    neutral: { bg: colors.surfaceAlt, fg: colors.ink2 },
    dark: { bg: colors.inverse, fg: colors.onInverse },
  })[t];

export function Pill({ label, tone = "neutral", icon }: { label: string; tone?: PillTone; icon?: IconName }) {
  const t = pillTones(tone);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", backgroundColor: t.bg, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3 }}>
      {icon ? <Ionicons name={icon} size={12} color={t.fg} /> : null}
      <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: t.fg }}>{label}</Text>
    </View>
  );
}

const statusTone: Record<OrderStatus, PillTone> = {
  pending_payment: "warning",
  paid: "brand",
  processing: "brand",
  ready_for_pickup: "success",
  dispatched: "brand",
  delivered: "success",
  cancelled: "neutral",
  payment_failed: "danger",
  refunded: "neutral",
};

export function StatusPill({ status }: { status: OrderStatus }) {
  return <Pill label={ORDER_STATUS_LABELS[status]} tone={statusTone[status]} />;
}

export function QtyStepper({ value, onChange, min = 1, max = 99 }: { value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  const btn = (icon: IconName, next: number, disabled: boolean) => (
    <Pressable
      onPress={() => {
        tap();
        onChange(next);
      }}
      disabled={disabled}
      hitSlop={6}
      style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center", opacity: disabled ? 0.3 : 1 }}
    >
      <Ionicons name={icon} size={16} color={colors.ink} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, backgroundColor: colors.surface }}>
      {btn("remove", value - 1, value <= min)}
      <Text style={{ fontFamily: fonts.semibold, fontSize: 15, minWidth: 22, textAlign: "center", color: colors.ink }}>{value}</Text>
      {btn("add", value + 1, value >= max)}
    </View>
  );
}

/** Nigerian numbers: "0803 555 0142", "803..." or "+234803..." all become "+2348035550142" */
export function toE164NG(input: string) {
  const digits = input.replace(/\D/g, "");
  if (!digits) return "";
  const local = digits.startsWith("234") ? digits.slice(3) : digits.replace(/^0/, "");
  return `+234${local}`;
}

/** The part shown after the fixed +234 */
const localPart = (value: string) => {
  const d = value.replace(/\D/g, "");
  return d.startsWith("234") ? d.slice(3) : d.replace(/^0/, "");
};

/** Phone number with a fixed +234 country code (only Nigeria for now). The value is stored as +234… */
export function PhoneInput({ label, icon = "call-outline", value, onChange }: { label: string; icon?: IconName; value: string; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false);
  const [left, setLeft] = useState(false);
  const accessory = `phone-done-${useId()}`;
  const local = localPart(value);
  const wrong = left && !focused && local.length > 0 && !/^[789]\d{9}$/.test(local);
  const pretty = local.replace(/^(\d{3})(\d{0,3})(\d{0,4}).*/, (_, a, b, c) => [a, b, c].filter(Boolean).join(" "));
  return (
    <View style={{ gap: 6 }}>
      <Txt variant="label" color={colors.ink2}>{label}</Txt>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 50, borderRadius: radius.md, borderWidth: 1, borderColor: wrong ? colors.danger : focused ? colors.ink : colors.line, backgroundColor: colors.surface, paddingLeft: 10, paddingRight: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8, paddingVertical: 6, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt }}>
          <Ionicons name={icon} size={15} color={colors.muted} />
          <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.ink }}>+234</Text>
        </View>
        <TextInput
          value={local.length > 3 ? pretty : local}
          onChangeText={(t) => {
            // Digits only, at most the 10 after +234 (a leading 0 or 234 is dropped)
            let d = t.replace(/\D/g, "");
            if (d.startsWith("234") && d.length > 10) d = d.slice(3);
            d = d.replace(/^0/, "").slice(0, 10);
            onChange(d ? `+234${d}` : "");
          }}
          keyboardType="phone-pad"
          inputAccessoryViewID={Platform.OS === "ios" ? accessory : undefined}
          autoComplete="tel"
          placeholder="803 555 0142"
          placeholderTextColor={colors.faint}
          maxLength={13}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            setLeft(true);
          }}
          style={{ flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.ink, paddingVertical: 12 }}
        />
      </View>
      {Platform.OS === "ios" && (
        <InputAccessoryView nativeID={accessory}>
          <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: space.lg, paddingVertical: 8, backgroundColor: colors.surfaceAlt, borderTopWidth: 1, borderTopColor: colors.line }}>
            <Pressable onPress={() => Keyboard.dismiss()} hitSlop={10}>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.brandPressed }}>Done</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      )}
      {wrong && (
        <Txt variant="small" color={colors.danger}>
          {local.length < 10 ? `That's ${local.length} digits. Nigerian mobile numbers have 10 after +234.` : "Nigerian mobile numbers start with 7, 8 or 9 after +234."}
        </Txt>
      )}
    </View>
  );
}

export function Input({ label, icon, style, ...props }: TextInputProps & { label?: string; icon?: IconName }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      {label ? <Txt variant="label" color={colors.ink2}>{label}</Txt> : null}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          minHeight: 50,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: focused ? colors.ink : colors.line,
          backgroundColor: colors.surface,
          paddingHorizontal: 14,
        }}
      >
        {icon ? <Ionicons name={icon} size={18} color={colors.muted} /> : null}
        <TextInput
          placeholderTextColor={colors.faint}
          {...props}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          style={[{ flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.ink, paddingVertical: 12 }, style]}
        />
      </View>
    </View>
  );
}

/** Tappable option row with a radio mark, used for stores and payment methods. */
export function OptionRow({
  title,
  subtitle,
  icon,
  illo,
  selected,
  onPress,
  right,
}: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  illo?: IlloName;
  selected: boolean;
  onPress: () => void;
  right?: ReactNode;
}) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        padding: space.md,
        borderRadius: radius.md,
        borderWidth: selected ? 1.5 : 1,
        borderColor: selected ? colors.ink : colors.line,
        backgroundColor: colors.surface,
      }}
    >
      {illo ? (
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: selected ? colors.brandSoft : colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
          <Illo name={illo} size={28} />
        </View>
      ) : icon ? (
        <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: selected ? colors.brandSoft : colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={icon} size={19} color={selected ? colors.brandPressed : colors.ink2} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Txt variant="label">{title}</Txt>
        {subtitle ? <Txt variant="small">{subtitle}</Txt> : null}
      </View>
      {right}
      <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: selected ? 6 : 1.5, borderColor: selected ? colors.ink : colors.faint }} />
    </Pressable>
  );
}

export function ListRow({
  icon,
  illo,
  title,
  subtitle,
  onPress,
  tone,
  right,
}: {
  icon?: IconName;
  illo?: IlloName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  tone?: "danger";
  right?: ReactNode;
}) {
  const color = tone === "danger" ? colors.danger : colors.ink;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: 14, paddingHorizontal: space.lg, backgroundColor: pressed ? colors.surfaceAlt : "transparent" })}>
      {illo ? (
        <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: tone === "danger" ? colors.dangerSoft : colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
          <Illo name={illo} size={26} />
        </View>
      ) : (
        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: tone === "danger" ? colors.dangerSoft : colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={icon ?? "ellipse-outline"} size={17} color={color} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Txt variant="medium" color={color}>{title}</Txt>
        {subtitle ? <Txt variant="small">{subtitle}</Txt> : null}
      </View>
      {right ?? (onPress && tone !== "danger" ? <Ionicons name="chevron-forward" size={18} color={colors.faint} /> : null)}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------
export function Loading() {
  return (
    <View style={ui.center}>
      <ActivityIndicator color={colors.brand} />
    </View>
  );
}

export function EmptyState({ icon, illo, title, message, action }: { icon?: IconName; illo?: IlloName; title: string; message?: string; action?: ReactNode }) {
  return (
    <View style={[ui.center, { gap: space.md }]}>
      {illo ? (
        <View style={{ width: 120, height: 120, alignItems: "center", justifyContent: "center" }}>
          <View style={{ position: "absolute" }}>
            <Burst size={120} />
          </View>
          <Illo name={illo} size={68} />
        </View>
      ) : (
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
          <Ionicons name={icon ?? "information-circle-outline"} size={32} color={colors.brandPressed} />
        </View>
      )}
      <Txt variant="heading" style={{ textAlign: "center" }}>{title}</Txt>
      {message ? <Txt variant="small" style={{ textAlign: "center", maxWidth: 280 }}>{message}</Txt> : null}
      {action ? <View style={{ marginTop: space.sm }}>{action}</View> : null}
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <EmptyState
      icon="cloud-offline-outline"
      title="Couldn't load this"
      message={message}
      action={onRetry ? <Button title="Try again" variant="outline" size="sm" onPress={onRetry} /> : undefined}
    />
  );
}

/** Picks a product-type icon from a product or category name, for products without photos yet. */
export function productIcon(text: string | null | undefined): IconName {
  const t = (text ?? "").toLowerCase();
  const rules: [RegExp, IconName][] = [
    [/phone|smartphone/, "phone-portrait-outline"],
    [/charger|power bank|battery/, "battery-charging-outline"],
    [/laptop|computer/, "laptop-outline"],
    [/mouse|keyboard/, "hardware-chip-outline"],
    [/tv|television/, "tv-outline"],
    [/speaker|sound|audio/, "volume-high-outline"],
    [/cooker|gas|oven|microwave/, "flame-outline"],
    [/kettle|dispenser|water/, "water-outline"],
    [/generator|kva/, "flash-outline"],
    [/fan|air|ac\b/, "snow-outline"],
  ];
  return rules.find(([re]) => re.test(t))?.[1] ?? "cube-outline";
}

export function ImagePlaceholder({ style, icon = "image-outline", size = 28 }: { style?: StyleProp<ViewStyle>; icon?: IconName; size?: number }) {
  return (
    <View style={[{ backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" }, style]}>
      <Ionicons name={icon} size={size} color={colors.faint} />
    </View>
  );
}

// Getters so colours always come from the current theme.
export const ui = {
  get screen(): ViewStyle {
    return { flex: 1, backgroundColor: colors.bg };
  },
  content: { padding: gutter, gap: space.xl, paddingBottom: space.xxl * 2 } as ViewStyle,
  get card(): ViewStyle {
    return { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, padding: space.lg };
  },
  get center(): ViewStyle {
    return { flex: 1, alignItems: "center", justifyContent: "center", padding: space.xxl, backgroundColor: colors.bg };
  },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm } as ViewStyle,
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" } as ViewStyle,
  get badgeDot(): ViewStyle {
    return {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.bg,
    };
  },
};
