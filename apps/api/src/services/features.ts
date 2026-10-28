// App switches (Admin → App switches). Stored in app_settings under "features"; anything not
// saved yet falls back to DEFAULT_FEATURES, so new switches start in their default position.
import { DEFAULT_FEATURES, type AppFeatures } from "@sotechy/shared";
import { db, type Tx } from "../db/client";
import { HttpError } from "../lib/errors";
import { getSetting } from "./settings";

export async function getFeatures(tx: typeof db | Tx = db): Promise<AppFeatures> {
  return { ...DEFAULT_FEATURES, ...((await getSetting<Partial<AppFeatures>>("features", tx)) ?? {}) };
}

type Switch = { [K in keyof AppFeatures]: AppFeatures[K] extends boolean ? K : never }[keyof AppFeatures];

/** Throws 403 with `message` when the switch is off. Maintenance mode stops new orders and new accounts
 *  (the app stays open for browsing and everything else). */
export async function requireFeature(key: Switch, message: string, tx: typeof db | Tx = db) {
  const features = await getFeatures(tx);
  if (features.maintenance && (key === "ordering" || key === "signups")) throw new HttpError(503, features.maintenanceMessage || "The shop is under maintenance");
  if (!features[key]) throw new HttpError(403, message);
  return features;
}
