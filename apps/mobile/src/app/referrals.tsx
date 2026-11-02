// Invite friends: your referral code (your @username) and invite link, who joined with it and whether
// they've shopped, and who invited you (added here if it was skipped when the account was made).
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { Illo } from "@/components/illustrations";
import { Burst } from "@/components/tab-icons";
import { useToast } from "@/components/toast";
import { Button, Divider, ErrorView, Input, Loading, Pill, Txt, ui } from "@/components/ui";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth } from "@/lib/auth";
import { addReferrer, clearInviteCode, getReferrals, inviteLink, pendingInviteCode, type Person } from "@/lib/referrals";
import { shareLink } from "@/lib/share";
import { colors, fonts, gutter, radius, space } from "@/lib/theme";
import { useAsync } from "@/lib/use-async";

const joined = (iso: string) => new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
const nameOf = (p: Person) => (p.username ? `@${p.username}` : p.fullName ?? "Sotechy customer");

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={[ui.card, { flex: 1, alignItems: "center", gap: 2, paddingVertical: space.lg, paddingHorizontal: space.sm }]}>
      <Txt variant="display" style={{ fontSize: 26 }}>{value}</Txt>
      <Txt variant="caption" style={{ textAlign: "center" }}>{label}</Txt>
    </View>
  );
}

/** Who invited you: shown once added, otherwise a box to type their @username */
function InvitedBy({ invitedBy, onAdded, prefill }: { invitedBy: Person | null; onAdded: () => void; prefill?: string }) {
  const toast = useToast();
  const [code, setCode] = useState(prefill ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (prefill && !code) setCode(prefill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  if (invitedBy) {
    return (
      <View style={[ui.card, ui.row, { gap: space.md }]}>
        <UserAvatar seed={invitedBy.id} preset={invitedBy.avatarStyle} size={44} />
        <View style={{ flex: 1 }}>
          <Txt variant="caption">You were invited by</Txt>
          <Txt variant="label" numberOfLines={1}>{nameOf(invitedBy)}{invitedBy.username && invitedBy.fullName ? ` · ${invitedBy.fullName}` : ""}</Txt>
        </View>
        <Ionicons name="checkmark-circle" size={22} color={colors.success} />
      </View>
    );
  }
  async function add() {
    setBusy(true);
    setError(null);
    try {
      const r = await addReferrer(code);
      await clearInviteCode();
      toast(`Thanks! You were invited by ${nameOf(r.invitedBy)}`);
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add it");
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={[ui.card, { gap: space.md }]}>
      <View style={{ gap: 2 }}>
        <Txt variant="heading" style={{ fontSize: 17 }}>Who invited you?</Txt>
        <Txt variant="small">If a friend told you about Sotechy, add their @username. You can add it once.</Txt>
      </View>
      <Input
        icon="at"
        value={code}
        onChangeText={(t) => {
          setError(null);
          setCode(t.replace(/\s/g, "").replace(/^@/, "").toLowerCase());
        }}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={21}
        placeholder="Their username"
        returnKeyType="done"
        onSubmitEditing={() => code.length >= 3 && add()}
      />
      {error && <Txt variant="small" color={colors.danger}>{error}</Txt>}
      <Button title="Add" icon="person-add-outline" variant="dark" size="sm" loading={busy} disabled={code.length < 3} onPress={add} style={{ alignSelf: "flex-start" }} />
    </View>
  );
}

export default function ReferralsScreen() {
  const { user } = useAuth();
  const toast = useToast();
  const params = useLocalSearchParams<{ code?: string }>();
  const [prefill, setPrefill] = useState(params.code);
  const data = useAsync(() => (user ? getReferrals() : Promise.resolve(null)), [user?.id]);

  // A code from an invite link opened before signing in
  useEffect(() => {
    if (!params.code) pendingInviteCode().then((c) => c && setPrefill(c));
  }, [params.code]);

  if (!user) {
    return (
      <View style={[ui.screen, { padding: gutter, justifyContent: "center", gap: space.md }]}>
        <Txt variant="small" style={{ textAlign: "center" }}>Sign in to get your invite link and see who joined with it.</Txt>
        <Button title="Sign in" onPress={() => router.push("/sign-in")} />
      </View>
    );
  }
  if (data.loading && !data.data) return <Loading />;
  if (data.error && !data.data) return <ErrorView message={data.error} onRetry={data.reload} />;
  const r = data.data!;
  const code = r.code;

  async function copy(value: string, what: string) {
    await Clipboard.setStringAsync(value);
    toast(`${what} copied`);
  }
  async function share() {
    if (!code) return;
    const result = await shareLink({
      url: inviteLink(code),
      title: "Join me on Sotechy",
      message: `Shop gadgets and appliances from trusted stores on Sotechy. Sign up with my code @${code}:`,
    });
    if (result === "copied") toast("Invite link copied");
  }

  return (
    <KeyboardAvoidingView style={ui.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={{ padding: gutter, gap: space.lg, paddingBottom: space.xxl * 2 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={data.loading} onRefresh={data.reload} tintColor={colors.brand} />}
      >
        {/* Your code and link */}
        <View style={{ backgroundColor: colors.panel, borderRadius: radius.xl, padding: space.xl, gap: space.md, overflow: "hidden" }}>
          <View style={{ position: "absolute", right: -18, top: -14, opacity: 0.9 }}>
            <View style={{ position: "absolute" }}>
              <Burst size={130} />
            </View>
            <View style={{ width: 130, height: 130, alignItems: "center", justifyContent: "center" }}>
              <Illo name="gift" size={64} />
            </View>
          </View>
          <View style={{ gap: 4, marginRight: 96 }}>
            <Txt variant="title" color={colors.white}>Invite friends</Txt>
            <Txt variant="small" color="#BDB3A8">Share your code. Friends who sign up with it show here, and you can see who has started shopping.</Txt>
          </View>
          {code ? (
            <>
              <Pressable
                onPress={() => copy(`@${code}`, "Code")}
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: space.md, backgroundColor: pressed ? colors.panelPressed : "rgba(255,255,255,0.08)", borderRadius: radius.lg, paddingHorizontal: space.lg, paddingVertical: space.md, marginTop: space.sm })}
              >
                <View style={{ flex: 1 }}>
                  <Txt variant="caption" color="#BDB3A8">Your referral code</Txt>
                  <Txt numberOfLines={1} style={{ fontFamily: fonts.display, fontSize: 24, lineHeight: 31, marginTop: 2, color: colors.white }}>@{code}</Txt>
                </View>
                <Ionicons name="copy-outline" size={20} color={colors.white} />
              </Pressable>
              <View style={{ flexDirection: "row", gap: space.sm }}>
                <Button title="Share invite" icon="share-social-outline" onPress={share} style={{ flex: 1 }} />
                <Button title="Copy link" icon="link-outline" variant="outline" onPress={() => copy(inviteLink(code), "Invite link")} style={{ flex: 1, backgroundColor: colors.white }} />
              </View>
            </>
          ) : (
            <Button title="Pick your username" icon="at" onPress={() => router.push("/welcome")} style={{ marginTop: space.sm }} />
          )}
        </View>

        {/* How it's going */}
        <View style={{ flexDirection: "row", gap: space.sm }}>
          <Stat value={r.counts.joined} label="Joined" />
          <Stat value={r.counts.shopped} label="Shopped" />
          <Stat value={r.counts.stores} label="Opened a store" />
        </View>

        <InvitedBy invitedBy={r.invitedBy} onAdded={data.reload} prefill={prefill && prefill !== code ? prefill : undefined} />

        {/* Who joined */}
        <View style={{ gap: space.sm }}>
          <Txt variant="overline" style={{ paddingHorizontal: 4 }}>People you invited</Txt>
          {r.people.length === 0 ? (
            <View style={[ui.card, { alignItems: "center", gap: space.sm, paddingVertical: space.xl }]}>
              <Illo name="user" size={44} />
              <Txt variant="small" style={{ textAlign: "center", maxWidth: 280 }}>
                No one yet. When friends sign up with @{code ?? "yourname"}, or add it later, they show here.
              </Txt>
            </View>
          ) : (
            <View style={[ui.card, { padding: 0, overflow: "hidden" }]}>
              {r.people.map((p, i) => (
                <View key={p.id}>
                  {i > 0 && <Divider style={{ marginLeft: 70 }} />}
                  <View style={[ui.row, { gap: space.md, paddingVertical: space.md, paddingHorizontal: space.lg }]}>
                    <UserAvatar seed={p.id} preset={p.avatarStyle} size={42} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Txt variant="label" numberOfLines={1}>{nameOf(p)}</Txt>
                      <Txt variant="caption">Joined {joined(p.joinedAt)}</Txt>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      {p.hasShopped ? <Pill label="Shopped" tone="success" icon="bag-check-outline" /> : <Pill label="Not shopped yet" />}
                      {p.hasStore && <Pill label="Has a store" tone="brand" icon="storefront-outline" />}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
