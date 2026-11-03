// Sotechy's own ID check for store owners (used when Didit is switched off in admin): the front of an
// ID, a selfie and a 3-second smile video, which an admin approves, sends back to redo, or declines.
import type { KycStatus } from "./types";

export type IdType = "nin" | "drivers_licence" | "passport";

export const ID_TYPES: { value: IdType; label: string; hint: string }[] = [
  { value: "nin", label: "NIN slip or card", hint: "Just the front" },
  { value: "drivers_licence", label: "Driver's licence", hint: "Just the front" },
  { value: "passport", label: "International passport", hint: "Just the photo page" },
];

export const idTypeLabel = (t: string) => ID_TYPES.find((x) => x.value === t)?.label ?? "ID";

/** What an admin can ask to redo. `part` decides what the owner sends again: the ID photo, or the selfie and video. */
export const ID_REDO_ITEMS: { code: string; label: string; part: "id" | "face"; tip: string }[] = [
  { code: "id_blurry", label: "ID photo blurry", part: "id", tip: "Retake it in good light, holding the phone still." },
  { code: "id_cut_off", label: "ID cut off", part: "id", tip: "Keep all four corners of the ID in the photo." },
  { code: "id_glare", label: "Glare on the ID", part: "id", tip: "Turn off the flash and tilt the ID away from lights." },
  { code: "id_expired", label: "ID expired", part: "id", tip: "Use an ID that hasn't expired." },
  { code: "wrong_id", label: "Not an accepted ID", part: "id", tip: "Use your NIN slip or card, driver's licence or passport." },
  { code: "name_mismatch", label: "Name doesn't match", part: "id", tip: "The name on the ID must match the store owner's name." },
  { code: "face_covered", label: "Face covered", part: "face", tip: "Take off caps, sunglasses or face masks so your whole face shows." },
  { code: "selfie_dark", label: "Selfie too dark", part: "face", tip: "Face a window or a light, not away from it." },
  { code: "no_smile", label: "No smile in the video", part: "face", tip: "Smile when the screen says “Now smile!”." },
  { code: "face_mismatch", label: "Face doesn't match the ID", part: "face", tip: "The selfie must be of the person on the ID." },
];

export const redoItem = (code: string) => ID_REDO_ITEMS.find((x) => x.code === code);
/** Which parts a redo needs sent again */
export const redoParts = (codes: string[]) => ({
  id: codes.some((c) => redoItem(c)?.part === "id"),
  face: codes.some((c) => redoItem(c)?.part === "face"),
});

/** The owner's latest manual check, as the merchant dashboard shows it */
export interface ManualIdCheck {
  id: string;
  idType: IdType;
  status: "in_review" | "approved" | "resubmit" | "declined";
  redoItems: string[];
  note: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

/** GET /merchant/verification */
export interface IdCheckState {
  status: KycStatus;
  updatedAt: string | null;
  /** Can a check be started now (manual is always available; Didit needs its keys) */
  available: boolean;
  /** Which check this store uses: Didit (when switched on in admin) or Sotechy's own */
  method: "didit" | "manual";
  check: ManualIdCheck | null;
}

/** One ID check in admin */
export interface AdminIdCheck extends ManualIdCheck {
  merchantId: string;
  storeName: string;
  storeSlug: string;
  storeStatus: string;
  ownerName: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  /** 1 for the first, 2 for the second… */
  attempt: number;
  idPhotoId: string | null;
  selfieId: string | null;
  videoId: string | null;
  reviewedByName: string | null;
}
