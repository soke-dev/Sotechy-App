// Marketplace stores as the admin API returns them (GET /admin/merchants and /admin/merchants/:id).
import type { KycStatus, MerchantApplicationInput } from "@sotechy/shared";

export interface KycResult {
  diditStatus: string;
  documentType?: string | null;
  documentStatus?: string | null;
  issuingCountry?: string | null;
  fullName?: string | null;
  dateOfBirth?: string | null;
  documentNumberEnding?: string | null;
  livenessStatus?: string | null;
  livenessScore?: number | null;
  faceMatchStatus?: string | null;
  faceMatchScore?: number | null;
  warnings?: string[];
}

export interface AdminStore {
  id: string;
  name: string;
  slug: string;
  ticker: string;
  sellerKind: "registered" | "individual";
  status: "pending" | "approved" | "suspended";
  contactEmail: string | null;
  contactPhone: string | null;
  contactWhatsapp: string | null;
  sells: string[];
  application: (Omit<MerchantApplicationInput, "sellerKind" | "sells" | "submit"> & { tickerChosen?: boolean }) | null;
  /** When the store's token was approved (its ticker is fixed from then on) */
  tokenApprovedAt: string | null;
  submittedAt: string | null;
  kycStatus: KycStatus;
  kycResult: KycResult | null;
  kycUpdatedAt: string | null;
  logoUrl: string | null;
  createdAt: string;
  ownerName: string | null;
  ownerEmail: string | null;
  productCount: number;
  orderCount: number;
  pendingZones: number;
  /** This store's own payout plan; null = the standard plan */
  payoutPlan: import("@sotechy/shared").PayoutPlan | null;
  payoutAccountName: string | null;
  payoutBankName: string | null;
}

export interface AdminZone {
  id: string;
  state: string;
  areas: string[];
  homeFee: number;
  pickupFee: number | null;
  pickupPoint: string | null;
  pickupAddress?: string | null;
  pickupPlaces?: { name: string; address: string; mapUrl?: string | null; fee?: number | null }[];
  days: string;
  freeOver: number | null;
  isActive: boolean;
  review: "pending" | "approved" | "declined";
  reviewNote: string | null;
  createdAt: string;
}

export interface AdminStoreDetail extends Omit<AdminStore, "ownerName" | "ownerEmail" | "productCount" | "orderCount" | "pendingZones"> {
  owner: { id: string; name: string | null; email: string; username: string | null; phone: string | null; avatarUrl: string | null; createdAt: string } | null;
  zones: AdminZone[];
  products: number;
  orders: number;
  sales: number;
}

/** Where a store is in Sotechy's process */
export type Stage = "review" | "setup" | "live" | "suspended";

export const stageOf = (s: Pick<AdminStore, "status" | "submittedAt">): Stage =>
  s.status === "approved" ? "live" : s.status === "suspended" ? "suspended" : s.submittedAt ? "review" : "setup";

export const STAGE: Record<Stage, { label: string; tone: "warn" | "info" | "good" | "bad" }> = {
  review: { label: "Needs review", tone: "warn" },
  setup: { label: "Still setting up", tone: "info" },
  live: { label: "Live", tone: "good" },
  suspended: { label: "Suspended", tone: "bad" },
};

export const KYC: Record<KycStatus, { label: string; ok: boolean | null }> = {
  not_started: { label: "ID check not started", ok: null },
  in_progress: { label: "ID check in progress", ok: null },
  in_review: { label: "ID check being reviewed by Didit", ok: null },
  approved: { label: "Identity verified", ok: true },
  declined: { label: "ID check declined", ok: false },
  resubmit: { label: "ID check needs a retry", ok: false },
  expired: { label: "ID check timed out", ok: false },
};
