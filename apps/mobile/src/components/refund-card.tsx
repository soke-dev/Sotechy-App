// A refund on the customer's order: where it stands, the details Sotechy asked for (answered right here),
// and once sent, how: the bank reference, or the coin, network and transaction hash with a link to look it up.
import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Linking, Pressable, View } from "react-native";
import { formatNaira, type OrderDetail, type OrderRefund, type RefundDetails } from "@sotechy/shared";
import { api } from "@/lib/api";
import { colors, radius, space } from "@/lib/theme";
import { Illo } from "./illustrations";
import { useToast } from "./toast";
import { Button, Input, Pill, Txt, ui } from "./ui";

/** Where to look a transaction up, by its network's name */
function explorer(network: string | null, hash: string) {
  const n = (network ?? "").toLowerCase();
  const tx = encodeURIComponent(hash);
  if (n.includes("tron") || n.includes("trc")) return `https://tronscan.org/#/transaction/${tx}`;
  if (n.includes("bsc") || n.includes("bnb") || n.includes("bep")) return `https://bscscan.com/tx/${tx}`;
  if (n.includes("polygon") || n.includes("matic")) return `https://polygonscan.com/tx/${tx}`;
  if (n.includes("base")) return `https://basescan.org/tx/${tx}`;
  if (n.includes("arbitrum")) return `https://arbiscan.io/tx/${tx}`;
  if (n.includes("solana") || n === "sol") return `https://solscan.io/tx/${tx}`;
  if (n.includes("eth") || n.includes("erc")) return `https://etherscan.io/tx/${tx}`;
  return null;
}

const short = (v: string) => (v.length > 22 ? `${v.slice(0, 10)}…${v.slice(-8)}` : v);

function Proof({ label, value, onCopy }: { label: string; value: string; onCopy: (v: string) => void }) {
  return (
    <Pressable onPress={() => onCopy(value)} style={[ui.between, { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 10 }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="caption">{label}</Txt>
        <Txt variant="label" selectable>{short(value)}</Txt>
      </View>
      <Ionicons name="copy-outline" size={18} color={colors.ink2} />
    </Pressable>
  );
}

/** The form for what Sotechy asked for */
function DetailsForm({ orderId, refund, onSent }: { orderId: string; refund: OrderRefund; onSent: (o: OrderDetail) => void }) {
  const toast = useToast();
  const [d, setD] = useState<RefundDetails>({});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof RefundDetails) => (v: string) => setD({ ...d, [k]: v });
  const need = refund.infoNeeded ?? "other";

  async function send() {
    setSending(true);
    setError(null);
    try {
      onSent(await api.sendRefundDetails(orderId, refund.id, d));
      toast("Sent. We'll take it from here", { icon: "checkmark-circle" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={{ gap: space.md }}>
      {need === "bank" && (
        <>
          <Input label="Bank" value={d.bankName ?? ""} onChangeText={set("bankName")} placeholder="e.g. GTBank" />
          <Input label="Account number" value={d.accountNumber ?? ""} onChangeText={(v) => set("accountNumber")(v.replace(/\D/g, "").slice(0, 10))} keyboardType="number-pad" placeholder="10 digits" />
          <Input label="Account name" value={d.accountName ?? ""} onChangeText={set("accountName")} placeholder="As your bank has it" />
        </>
      )}
      {need === "crypto" && (
        <>
          <Input label="Wallet address" value={d.walletAddress ?? ""} onChangeText={set("walletAddress")} autoCapitalize="none" autoCorrect={false} placeholder="Paste your address" />
          <Input label="Network" value={d.network ?? ""} onChangeText={set("network")} placeholder="e.g. Tron (TRC20), BSC, Solana" />
        </>
      )}
      <Input label={need === "other" ? "Your reply" : "Anything else? (optional)"} value={d.note ?? ""} onChangeText={set("note")} multiline style={{ minHeight: 70 }} />
      {error && <Txt variant="small" color={colors.danger}>{error}</Txt>}
      <Button title="Send to Sotechy" variant="dark" loading={sending} onPress={() => void send()} />
    </View>
  );
}

function RefundBox({ orderId, refund, onCopy, onSent }: { orderId: string; refund: OrderRefund; onCopy: (v: string) => void; onSent: (o: OrderDetail) => void }) {
  const r = refund;
  const amount = formatNaira(r.amount);
  if (r.status === "processed") {
    const link = r.txHash ? explorer(r.network, r.txHash) : null;
    return (
      <View style={{ gap: space.md }}>
        <View style={[ui.row, { gap: space.sm }]}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Txt variant="label" style={{ flex: 1 }}>{amount} refunded{r.processedAt ? ` on ${new Date(r.processedAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}` : ""}</Txt>
        </View>
        <Txt variant="small" color={colors.ink2}>
          {r.method === "crypto"
            ? `Sent to your wallet in ${r.cryptoAsset ?? "crypto"}${r.network ? ` on ${r.network}` : ""}.`
            : `Sent by bank transfer${r.customerDetails?.accountNumber ? ` to ${r.customerDetails.bankName ?? "your bank"} ••••${r.customerDetails.accountNumber.slice(-4)}` : ""}. It can take up to 24 hours to show in your account.`}
        </Txt>
        {r.reference && <Proof label="Bank reference" value={r.reference} onCopy={onCopy} />}
        {r.txHash && <Proof label="Transaction hash" value={r.txHash} onCopy={onCopy} />}
        {link && (
          <Pressable onPress={() => Linking.openURL(link)} hitSlop={6} style={[ui.row, { gap: 6 }]}>
            <Txt variant="label" color={colors.brandPressed}>View the transaction</Txt>
            <Ionicons name="open-outline" size={15} color={colors.brandPressed} />
          </Pressable>
        )}
        {r.note && <Txt variant="small" color={colors.ink2}>{r.note}</Txt>}
      </View>
    );
  }
  if (r.status === "rejected") {
    return (
      <View style={{ gap: space.sm }}>
        <Txt variant="label">This refund wasn't approved</Txt>
        <Txt variant="small" color={colors.ink2}>{r.note ?? "Please contact us if you have questions about it."}</Txt>
      </View>
    );
  }
  if (r.status === "needs_info") {
    const what = r.infoNeeded === "bank" ? "the bank account to send it to" : r.infoNeeded === "crypto" ? "the wallet to send it to" : "a little more information";
    return (
      <View style={{ gap: space.md }}>
        <View style={{ backgroundColor: colors.warningSoft, borderRadius: radius.md, padding: space.md, gap: 4 }}>
          <Txt variant="label">We need {what}</Txt>
          <Txt variant="small" color={colors.ink2}>{r.infoMessage ?? `So we can send your ${amount} refund.`}</Txt>
        </View>
        <DetailsForm orderId={orderId} refund={r} onSent={onSent} />
      </View>
    );
  }
  // requested / approved
  return (
    <View style={{ gap: space.sm }}>
      <Txt variant="label">{amount} refund in progress</Txt>
      <Txt variant="small" color={colors.ink2}>
        {r.customerRepliedAt ? "Thanks, we've got your details. " : ""}
        {r.status === "approved" ? "It's approved and being sent." : "We're reviewing it."} We'll let you know as soon as it's sent, with the reference.
      </Txt>
    </View>
  );
}

const PILL: Record<OrderRefund["status"], { label: string; tone: "success" | "warning" | "neutral" | "danger" }> = {
  requested: { label: "In progress", tone: "neutral" },
  approved: { label: "Approved", tone: "neutral" },
  needs_info: { label: "Action needed", tone: "warning" },
  processed: { label: "Refunded", tone: "success" },
  rejected: { label: "Not approved", tone: "danger" },
};

/** Every refund on the order, newest first */
export function RefundCard({ order, onCopy, onUpdated }: { order: OrderDetail; onCopy: (v: string) => void; onUpdated: (o: OrderDetail) => void }) {
  const refunds = order.refunds ?? [];
  if (!refunds.length) return null;
  return (
    <View style={[ui.card, { gap: space.md }, refunds[0].status === "needs_info" && { borderColor: colors.warning }]}>
      <View style={ui.between}>
        <View style={ui.row}>
          <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}>
            <Illo name="wallet" size={26} />
          </View>
          <Txt variant="heading" style={{ fontSize: 17 }}>Refund</Txt>
        </View>
        <Pill label={PILL[refunds[0].status].label} tone={PILL[refunds[0].status].tone} />
      </View>
      {refunds.map((r) => (
        <RefundBox key={r.id} orderId={order.id} refund={r} onCopy={onCopy} onSent={onUpdated} />
      ))}
    </View>
  );
}
