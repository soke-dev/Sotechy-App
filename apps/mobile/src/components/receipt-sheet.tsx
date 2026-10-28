import Ionicons from "@expo/vector-icons/Ionicons";
import * as Clipboard from "expo-clipboard";
import { Linking, Pressable, Text, View } from "react-native";
import { formatNaira, type OrderDetail, type OrderReceipt } from "@sotechy/shared";
import { Illo } from "@/components/illustrations";
import { Sheet } from "@/components/shop-filters";
import { useToast } from "@/components/toast";
import { Button, tap, Txt } from "@/components/ui";
import { formatTokens } from "@/lib/marketplace";
import { colors, fonts, radius, space } from "@/lib/theme";

type Line = { name: string; option?: string | null; qty: number; unitPrice: number; lineTotal: number };
type Content = {
  order?: string;
  store?: string;
  date?: string;
  items?: Line[];
  subtotal?: number;
  discount?: number;
  deliveryFee?: number;
  paidWithTokens?: number;
  tokens?: { ticker: string; amount: number }[];
  total?: number;
};

function Row({ label, value, tone, strong }: { label: string; value: string; tone?: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: space.md }}>
      <Txt variant={strong ? "label" : "small"} color={strong ? colors.ink : colors.ink2}>{label}</Txt>
      <Txt variant={strong ? "label" : "small"} color={tone ?? (strong ? colors.ink : colors.ink2)}>{value}</Txt>
    </View>
  );
}

/** A torn-paper style dashed rule between receipt parts */
const Dashes = () => <View style={{ borderTopWidth: 1.5, borderStyle: "dashed", borderColor: colors.line, marginVertical: space.xs }} />;

/** The full receipt for a delivered order, with its Monad record at the bottom */
export function ReceiptSheet({ visible, onClose, receipt, order }: { visible: boolean; onClose: () => void; receipt: OrderReceipt; order: OrderDetail }) {
  const toast = useToast();
  const c = receipt.content as Content;
  // The receipt's own copy first; the order fills in anything older receipts didn't keep
  const items: Line[] = c.items ?? order.items.map((i) => ({ name: i.productName, option: i.variantName, qty: i.quantity, unitPrice: i.unitPrice, lineTotal: i.lineTotal }));
  const subtotal = c.subtotal ?? order.subtotal;
  const discount = c.discount ?? order.discountTotal;
  const delivery = c.deliveryFee ?? order.deliveryFee;
  const byTokens = c.paidWithTokens ?? order.tokensValue;
  const tokens = c.tokens ?? order.tokensUsed ?? [];
  const total = c.total ?? order.total;
  const date = new Date(c.date ?? order.createdAt);
  const link = receipt.nftUrl ?? receipt.txUrl;
  const fp = receipt.fingerprint;

  const copyFingerprint = async () => {
    tap();
    await Clipboard.setStringAsync(fp);
    toast("Fingerprint copied", { icon: "copy-outline" });
  };

  return (
    <Sheet visible={visible} title="Receipt" onClose={onClose}>
      <View style={{ backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: space.lg, gap: space.md }}>
        {/* Header */}
        <View style={{ alignItems: "center", gap: 4 }}>
          <Illo name="receipt" size={48} />
          <Text style={{ fontFamily: fonts.displayHeavy, fontSize: 22, color: colors.ink }}>{c.store || "Sotechy"}</Text>
          <Txt variant="caption">
            Receipt #{receipt.id} · {c.order ?? order.orderNumber}
          </Txt>
          <Txt variant="caption">
            {date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · {date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </Txt>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.successSoft }}>
            <Ionicons name="checkmark-circle" size={13} color={colors.success} />
            <Txt variant="caption" color={colors.success}>Paid · Delivered</Txt>
          </View>
        </View>

        <Dashes />

        {/* Items */}
        <View style={{ gap: space.sm }}>
          {items.map((i, n) => (
            <View key={n} style={{ flexDirection: "row", gap: space.md }}>
              <View style={{ flex: 1, gap: 1 }}>
                <Txt variant="label" numberOfLines={2}>{i.name}</Txt>
                <Txt variant="caption">
                  {i.option && i.option !== "Standard" ? `${i.option} · ` : ""}
                  {i.qty} × {formatNaira(i.unitPrice)}
                </Txt>
              </View>
              <Txt variant="label">{formatNaira(i.lineTotal)}</Txt>
            </View>
          ))}
        </View>

        <Dashes />

        {/* Totals */}
        <View style={{ gap: 6 }}>
          <Row label="Subtotal" value={formatNaira(subtotal)} />
          {discount > 0 && <Row label="Discount" value={`-${formatNaira(discount)}`} tone={colors.success} />}
          <Row label="Delivery" value={delivery ? formatNaira(delivery) : "Free"} />
          {byTokens > 0 && <Row label="Paid with tokens" value={`-${formatNaira(byTokens)}`} tone={colors.success} />}
          {tokens.map((t) => (
            <Row key={t.ticker} label={`   ${formatTokens(t.amount)} $${t.ticker}`} value="" />
          ))}
        </View>
        <Dashes />
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
          <Txt variant="label">{byTokens > 0 ? "Paid in money" : "Total paid"}</Txt>
          <Text style={{ fontFamily: fonts.displayHeavy, fontSize: 24, color: colors.ink }}>{formatNaira(total)}</Text>
        </View>
      </View>

      {/* Its onchain record */}
      <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius.xl, padding: space.lg, gap: space.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
          <Ionicons name={link ? "shield-checkmark" : "time-outline"} size={20} color={link ? colors.success : colors.muted} />
          <Txt variant="label">{link ? "Recorded onchain" : "Being recorded onchain…"}</Txt>
        </View>
        <Txt variant="small" color={colors.ink2}>
          A fingerprint of this receipt is saved onchain, so anyone can check it hasn&apos;t been changed. Only the fingerprint is public, never your details or what you paid.
        </Txt>
        {fp ? (
          <Pressable onPress={copyFingerprint} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: space.sm, padding: space.md, borderRadius: radius.lg, backgroundColor: pressed ? colors.line : colors.surface })}>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="caption">Fingerprint</Txt>
              <Txt variant="small" color={colors.ink} numberOfLines={1} style={{ fontFamily: fonts.medium }}>
                {fp.length > 24 ? `${fp.slice(0, 12)}…${fp.slice(-10)}` : fp}
              </Txt>
            </View>
            <Ionicons name="copy-outline" size={16} color={colors.muted} />
          </Pressable>
        ) : null}
        {link && <Button title="View on Monad" icon="open-outline" variant="outline" size="sm" onPress={() => Linking.openURL(link)} />}
      </View>
    </Sheet>
  );
}
