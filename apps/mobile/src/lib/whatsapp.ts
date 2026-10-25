import { Linking } from "react-native";

export const ORDER_MESSAGE = "Hello Sotechy, I'd like to place an order.";

/** Opens a WhatsApp chat with Sotechy, pre-filled with `message`. Returns false if no number is configured. */
export async function openWhatsApp(number: string | null | undefined, message: string) {
  const digits = (number ?? "").replace(/[^\d]/g, "");
  if (!digits) return false;
  await Linking.openURL(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`);
  return true;
}
