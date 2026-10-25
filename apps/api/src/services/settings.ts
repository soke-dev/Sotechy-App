import { eq } from "drizzle-orm";
import { db, schema, type Tx } from "../db/client";

export interface DeliverySettings {
  flatFee: number;
  freeOver: number | null;
  note: string | null;
}

export async function getSetting<T>(key: string, tx: typeof db | Tx = db): Promise<T | null> {
  const [row] = await tx.select().from(schema.appSettings).where(eq(schema.appSettings.key, key));
  return (row?.value as T) ?? null;
}

export function deliveryFeeFor(settings: DeliverySettings | null, subtotal: number) {
  if (!settings) return 0;
  if (settings.freeOver != null && subtotal >= settings.freeOver) return 0;
  return settings.flatFee ?? 0;
}
