// WhatsApp messages through Meta's WhatsApp Cloud API (https://developers.facebook.com/docs/whatsapp/cloud-api).
// Messages Sotechy starts must use a template approved in WhatsApp Manager; its {{1}}, {{2}}… are filled
// from `params` in order. Without WHATSAPP_TOKEN (or outside production) they're printed instead.
import { env } from "../env";

/** "08031234567" or "+2348031234567" → "2348031234567" */
const toWhatsApp = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("234") ? digits : digits.startsWith("0") ? `234${digits.slice(1)}` : digits;
};

export async function sendWhatsApp(to: string[], template: string, params: string[]) {
  const phones = [...new Set(to.filter(Boolean).map(toWhatsApp))].filter((p) => p.length >= 12);
  if (!phones.length) return;
  if (!env.WHATSAPP_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID || env.NODE_ENV !== "production") {
    console.log(`[whatsapp not sent${env.WHATSAPP_TOKEN ? ": local" : ": no WHATSAPP_TOKEN"}] to ${phones.join(", ")}: ${template}(${params.join(" | ")})`);
    return;
  }
  for (const phone of phones) {
    const res = await fetch(`https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "template",
        template: { name: template, language: { code: env.WHATSAPP_TEMPLATE_LANGUAGE }, components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }] },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`WhatsApp refused the message to ${phone} (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }
}

/** For alerts nobody should wait on: failures are logged, never thrown */
export function sendWhatsAppLater(to: string[], template: string, params: string[]) {
  sendWhatsApp(to, template, params).catch((err) => console.error("WhatsApp failed:", err instanceof Error ? err.message : err));
}
