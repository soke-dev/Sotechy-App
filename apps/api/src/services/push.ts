// Push notifications through Expo's push service (https://docs.expo.dev/push-notifications/sending-notifications/),
// which hands them to Firebase (Android) and Apple. Phones register their token with POST /me/push-devices.
import { inArray } from "drizzle-orm";
import { db, schema } from "../db/client";

export interface Push {
  title: string;
  body: string;
  /** `url` is the app screen to open when tapped, e.g. "/order/123" */
  data?: { url?: string } & Record<string, unknown>;
}

interface Ticket {
  status: "ok" | "error";
  details?: { error?: string };
}

/** Sends to every registered phone of these accounts. Tokens Expo says are dead are removed. */
export async function sendPush(userIds: string[], push: Push) {
  if (!userIds.length) return;
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

/** For notices nobody should wait on: failures are logged, never thrown */
export function sendPushLater(userIds: string[], push: Push) {
  sendPush(userIds, push).catch((err) => console.error("Push failed:", err instanceof Error ? err.message : err));
}
