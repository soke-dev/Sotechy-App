// Invite friends: your referral code is your @username, and your invite link opens Sotechy with it filled in.
// A code from an invite link is kept on this phone until the new account is made (Google sign-ups too),
// so the "Who invited you?" step can fill it in.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "./api";
import { APP_SITE } from "./share";

export type Person = { id: string; username: string | null; fullName: string | null; avatarStyle: string | null };
export type Referrals = {
  code: string | null;
  invitedBy: Person | null;
  people: (Person & { joinedAt: string; hasShopped: boolean; hasStore: boolean })[];
  counts: { joined: number; shopped: number; stores: number };
};

export const inviteLink = (code: string) => `${APP_SITE}/invite/${encodeURIComponent(code)}`;

export const getReferrals = () => api.get<Referrals>("/me/referrals");
export const addReferrer = (code: string) => api.post<{ invitedBy: Person }>("/me/referrer", { code: code.trim().replace(/^@/, "") });

const KEY = "sotechy_invite_code";
export const keepInviteCode = (code: string) => AsyncStorage.setItem(KEY, code.trim().replace(/^@/, "").toLowerCase()).catch(() => {});
export const pendingInviteCode = () => AsyncStorage.getItem(KEY).catch(() => null);
export const clearInviteCode = () => AsyncStorage.removeItem(KEY).catch(() => {});
