// Push notifications through Expo's push service (https://docs.expo.dev/push-notifications/sending-notifications/),
// which hands them to Firebase (Android) and Apple. Phones register their token with POST /me/push-devices.
import { inArray } from "drizzle-orm";
import { db, schema } from "../db/client";

export interface Push {
  title: string;
  body: string;
  /** `url` is the app screen to open when tapped, e.g. "/order/123" */
  data?: { url?: string } & Record<string, unknown>;
  /** What it's about, for the app's Notifications screen (order, offer, support, tokens, security) */
  kind?: string;
  /** Store owners' notices are for their dashboard, not the customer app's list */
  audience?: "customer" | "store";
}

interface Ticket {
  status: "ok" | "error";
  details?: { error?: string };
}

/** Kinds a customer can switch off in the app (security notices always go) */
const MUTABLE = ["order", "offer", "store", "tokens", "support"] as const;

/** Sends to every registered phone of these accounts, skipping anyone who switched this kind off. Tokens Expo says are dead are removed. */
export async function sendPush(userIds: string[], push: Push) {
  if (!userIds.length) return;
  const kind = push.kind as (typeof MUTABLE)[number] | undefined;
  if (kind && MUTABLE.includes(kind) && (push.audience ?? "customer") === "customer") {
    const prefs = await db.select({ id: schema.users.id, prefs: schema.users.pushPrefs }).from(schema.users).where(inArray(schema.users.id, userIds));
    const off = new Set(prefs.filter((p) => p.prefs?.[kind] === false).map((p) => p.id));
    userIds = userIds.filter((id) => !off.has(id));
    if (!userIds.length) return;
  }
  const devices = await db.select().from(schema.pushDevices).where(inArray(schema.pushDevices.userId, userIds));
  for (let i = 0; i < devices.length; i += 100) {
    const batch = devices.slice(i, i + 100);
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(batch.map((d) => ({ to: d.token, title: push.title, body: push.body, data: push.data ?? {}, sound: "default", channelId: "default" }))),
    });
    if (!res.ok) throw new Error(`Expo push refused (${res.status}): ${(await res.text()).slice(0, 300)}`);
    const { data } = (await res.json()) as { data: Ticket[] };
    const dead = batch.filter((_, n) => data[n]?.details?.error === "DeviceNotRegistered").map((d) => d.token);
    if (dead.length) await db.delete(schema.pushDevices).where(inArray(schema.pushDevices.token, dead));
  }
}

/** Saves a notification for each account (so it shows in the app's list) without sending a push */
export async function recordNotice(userIds: string[], push: Push) {
  if (!userIds.length) return;
  await db.insert(schema.notifications).values(
    userIds.map((userId) => ({ userId, audience: push.audience ?? "customer", kind: push.kind ?? "other", title: push.title, body: push.body, url: push.data?.url ?? null })),
  );
}

/** For notices nobody should wait on: kept for the Notifications screen, then pushed. Failures are logged, never thrown */
export function sendPushLater(userIds: string[], push: Push) {
  recordNotice(userIds, push).catch((err) => console.error("Notice not saved:", err instanceof Error ? err.message : err));
  sendPush(userIds, push).catch((err) => console.error("Push failed:", err instanceof Error ? err.message : err));
}
