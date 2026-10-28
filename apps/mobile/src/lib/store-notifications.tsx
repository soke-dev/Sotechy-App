// Following stores: only stores you follow can send you messages. Messages arrive as push notifications
// and land in the Notifications inbox; which ones you've seen is remembered on this phone. The inbox also
// holds the customer's own notifications (orders, offers, support, tokens, security), read state on the server.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AppNotification, StoreNoticeView } from "@sotechy/shared";
import { api } from "./api";
import { useAuth } from "./auth";
import { usePulse } from "./pulse";

export type StoreNotice = StoreNoticeView;

const READ_KEY = "sotechy_store_read";

interface StoreNotificationsState {
  subscribed: string[];
  isSubscribed: (slug: string) => boolean;
  /** Follows or unfollows a store (signing in first if needed) */
  toggle: (slug: string) => void;
  /** Messages from stores you follow, newest first */
  inbox: StoreNotice[];
  /** Orders, offers, support replies, tokens and account security */
  feed: AppNotification[];
  unread: number;
  markAllRead: () => void;
  reload: () => void;
  /** Stores saved with the heart */
  favourites: string[];
  isFavourite: (slug: string) => boolean;
  toggleFavourite: (slug: string) => void;
}

const Ctx = createContext<StoreNotificationsState>({ subscribed: [], isSubscribed: () => false, toggle: () => {}, inbox: [], feed: [], unread: 0, markAllRead: () => {}, reload: () => {}, favourites: [], isFavourite: () => false, toggleFavourite: () => {} });
export const useStoreNotifications = () => useContext(Ctx);

export function StoreNotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [subscribed, setSubscribed] = useState<string[]>([]);
  const [favourites, setFavourites] = useState<string[]>([]);
  const [inbox, setInbox] = useState<StoreNotice[]>([]);
  const [feed, setFeed] = useState<AppNotification[]>([]);
  const pulse = usePulse();
  const [read, setRead] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(READ_KEY)
      .then((r) => r && setRead(JSON.parse(r)))
      .catch(() => {});
  }, []);

  const reload = useCallback(() => {
    if (!user) {
      setSubscribed([]);
      setFavourites([]);
      setInbox([]);
      setFeed([]);
      return;
    }
    api.follows().then(setSubscribed, () => {});
    api.favouriteStores().then(setFavourites, () => {});
    api.storeNotices().then(setInbox, () => {});
    api.notifications().then(setFeed, () => {});
  }, [user]);
  useEffect(() => reload(), [reload]);
  // New notifications show up while the app is open
  useEffect(() => {
    if (user && pulse) api.notifications().then(setFeed, () => {});
  }, [pulse, user]);

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

  const toggleFavourite = useCallback(
    (slug: string) => {
      if (!user) return router.push("/sign-in");
      const on = !favourites.includes(slug);
      setFavourites((f) => (on ? [...f, slug] : f.filter((x) => x !== slug)));
      (on ? api.favouriteStore(slug) : api.unfavouriteStore(slug)).catch(() => setFavourites((f) => (on ? f.filter((x) => x !== slug) : [...f, slug])));
    },
    [favourites, user],
  );

  const unread = inbox.filter((n) => !read.includes(n.id)).length + feed.filter((n) => !n.readAt).length;
  const markAllRead = useCallback(() => {
    const next = [...new Set([...read, ...inbox.map((n) => n.id)])].slice(-500);
    setRead(next);
    AsyncStorage.setItem(READ_KEY, JSON.stringify(next)).catch(() => {});
    if (feed.some((n) => !n.readAt)) {
      const now = new Date().toISOString();
      setFeed((f) => f.map((n) => (n.readAt ? n : { ...n, readAt: now })));
      api.markNotificationsRead().catch(() => {});
    }
  }, [read, inbox, feed]);

  const value = useMemo(
    () => ({ subscribed, isSubscribed: (s: string) => subscribed.includes(s), toggle, inbox, feed, unread, markAllRead, reload, favourites, isFavourite: (s: string) => favourites.includes(s), toggleFavourite }),
    [subscribed, toggle, inbox, feed, unread, markAllRead, reload, favourites, toggleFavourite],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
