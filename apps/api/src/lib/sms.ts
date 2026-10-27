// Text messages through Termii (https://developers.termii.com). Without TERMII_API_KEY they're printed instead.
import { env } from "../env";

/** "08031234567" or "+2348031234567" → "2348031234567" */
const toTermii = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("234") ? digits : digits.startsWith("0") ? `234${digits.slice(1)}` : digits;
};

export async function sendSms(to: string[], text: string) {
  const phones = [...new Set(to.filter(Boolean).map(toTermii))].filter((p) => p.length >= 12);
  if (!phones.length) return;
  if (!env.TERMII_API_KEY || env.NODE_ENV !== "production") {
    console.log(`[sms not sent${env.TERMII_API_KEY ? ": local" : ": no TERMII_API_KEY"}] to ${phones.join(", ")}: ${text}`);
    return;
  }
  const res = await fetch(`${env.TERMII_BASE_URL.replace(/\/$/, "")}/api/sms/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: env.TERMII_API_KEY, to: phones.length === 1 ? phones[0] : phones, from: env.TERMII_SENDER_ID, sms: text.slice(0, 600), type: "plain", channel: "generic" }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Termii refused the SMS (${res.status}): ${(await res.text()).slice(0, 300)}`);
}

/** For alerts nobody should wait on: failures are logged, never thrown */
export function sendSmsLater(to: string[], text: string) {
  sendSms(to, text).catch((err) => console.error("SMS failed:", err instanceof Error ? err.message : err));
}
