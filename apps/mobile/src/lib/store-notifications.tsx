// Following stores: only stores you follow can send you messages. Messages arrive as push notifications
// and land in the Notifications inbox; which ones you've seen is remembered on this phone.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { StoreNoticeView } from "@sotechy/shared";
import { api } from "./api";
import { useAuth } from "./auth";

export type StoreNotice = StoreNoticeView;

const READ_KEY = "sotechy_store_read";

interface StoreNotificationsState {
  subscribed: string[];
  isSubscribed: (slug: string) => boolean;
  /** Follows or unfollows a store (signing in first if needed) */
  toggle: (slug: string) => void;
  /** Messages from stores you follow, newest first */
  inbox: StoreNotice[];
  unread: number;
  markAllRead: () => void;
  reload: () => void;
}

const Ctx = createContext<StoreNotificationsState>({ subscribed: [], isSubscribed: () => false, toggle: () => {}, inbox: [], unread: 0, markAllRead: () => {}, reload: () => {} });
export const useStoreNotifications = () => useContext(Ctx);

export function StoreNotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [subscribed, setSubscribed] = useState<string[]>([]);
  const [inbox, setInbox] = useState<StoreNotice[]>([]);
  const [read, setRead] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(READ_KEY)
      .then((r) => r && setRead(JSON.parse(r)))
      .catch(() => {});
  }, []);

  const reload = useCallback(() => {
    if (!user) {
      setSubscribed([]);
      setInbox([]);
      return;
    }
    api.follows().then(setSubscribed, () => {});
    api.storeNotices().then(setInbox, () => {});
  }, [user]);
  useEffect(() => reload(), [reload]);

  const toggle = useCallback(
    (slug: string) => {
      if (!user) return router.push("/sign-in");
      const on = !subscribed.includes(slug);
      setSubscribed((s) => (on ? [...s, slug] : s.filter((x) => x !== slug)));
      (on ? api.follow(slug) : api.unfollow(slug)).then(
        () => reload(),
        () => setSubscribed((s) => (on ? s.filter((x) => x !== slug) : [...s, slug])),
      );
    },
    [subscribed, user, reload],
  );

  const unread = inbox.filter((n) => !read.includes(n.id)).length;
  const markAllRead = useCallback(() => {
    const next = [...new Set([...read, ...inbox.map((n) => n.id)])].slice(-500);
    setRead(next);
    AsyncStorage.setItem(READ_KEY, JSON.stringify(next)).catch(() => {});
  }, [read, inbox]);

  const value = useMemo(
    () => ({ subscribed, isSubscribed: (s: string) => subscribed.includes(s), toggle, inbox, unread, markAllRead, reload }),
    [subscribed, toggle, inbox, unread, markAllRead, reload],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
