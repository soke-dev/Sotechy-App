// Merchant identity checks through Didit (https://docs.didit.me): the owner scans their ID and does a liveness
// check on Didit's page; Didit reports back by signed webhook, and we can also ask for the decision directly.
import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/client";
import type { KycResult } from "../db/schema";
import { env } from "../env";
import { audit } from "../lib/audit";
import { HttpError } from "../lib/errors";
import { sendEmailLater } from "../lib/email";
import { idCheckEmail } from "../emails/templates";

const BASE = "https://verification.didit.me/v3";
type KycStatus = (typeof schema.kycStatusEnum.enumValues)[number];

export const diditConfigured = () => !!(env.DIDIT_API_KEY && env.DIDIT_WORKFLOW_ID);

async function didit<T>(path: string, init?: RequestInit): Promise<T> {
  if (!diditConfigured()) throw new HttpError(503, "ID checks aren't set up yet");
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { "Content-Type": "application/json", "x-api-key": env.DIDIT_API_KEY!, ...init?.headers } });
  if (!res.ok) {
    console.error(`Didit ${path} → ${res.status}: ${(await res.text()).slice(0, 300)}`);
    throw new HttpError(502, "The ID check service didn't answer. Please try again in a minute.");
  }
  return (await res.json()) as T;
}

/** Starts a check for a store's owner and returns the page to send them to */
export async function startIdCheck(store: { id: string; contactEmail: string | null }) {
  const session = await didit<{ session_id: string; url: string; status: string }>("/session/", {
    method: "POST",
    body: JSON.stringify({
      workflow_id: env.DIDIT_WORKFLOW_ID,
      vendor_data: store.id,
      metadata: { merchantId: store.id },
      callback: `${env.MERCHANT_APP_URL.replace(/\/$/, "")}/onboarding?verify=done`,
      language: "en",
      ...(store.contactEmail && { contact_details: { email: store.contactEmail } }),
    }),
  });
  await db
    .update(schema.merchants)
    .set({ kycSessionId: session.session_id, kycStatus: "in_progress", kycResult: null, kycUpdatedAt: new Date() })
    .where(eq(schema.merchants.id, store.id));
  return session.url;
}

/** Didit's statuses → ours */
function statusFrom(didit: string): KycStatus {
  switch (didit) {
    case "Approved":
      return "approved";
    case "Declined":
      return "declined";
    case "In Review":
      return "in_review";
    case "Resubmitted":
      return "resubmit";
    case "Expired":
    case "Kyc Expired":
    case "Abandoned":
      return "expired";
    default:
      return "in_progress"; // Not Started, In Progress, Awaiting User
  }
}

type Node = Record<string, unknown>;
const firstOf = (d: Node | undefined, plural: string, singular: string) => {
  const many = d?.[plural];
  return (Array.isArray(many) ? many[0] : d?.[singular]) as Node | undefined;
};
const str = (v: unknown) => (typeof v === "string" && v ? v : null);
const num = (v: unknown) => (typeof v === "number" ? v : null);

/** Keeps what admin needs to review: outcome, scores, the name on the ID. No images, no full ID number. */
function summarise(diditStatus: string, decision: Node | undefined): KycResult {
  const id = firstOf(decision, "id_verifications", "id_verification");
  const live = firstOf(decision, "liveness_checks", "liveness");
  const face = firstOf(decision, "face_matches", "face_match");
  const docNumber = str(id?.document_number);
  const warnings = [id, live, face]
    .flatMap((n) => (Array.isArray(n?.warnings) ? (n.warnings as Node[]) : []))
    .map((w) => str(w.short_description) ?? str(w.risk) ?? "")
    .filter(Boolean);
  return {
    diditStatus,
    documentType: str(id?.document_type),
    documentStatus: str(id?.status),
    issuingCountry: str(id?.issuing_state_name) ?? str(id?.issuing_state),
    fullName: str(id?.full_name) ?? ([str(id?.first_name), str(id?.last_name)].filter(Boolean).join(" ") || null),
    dateOfBirth: str(id?.date_of_birth),
    documentNumberEnding: docNumber ? docNumber.slice(-4) : null,
    livenessStatus: str(live?.status),
    livenessScore: num(live?.score),
    faceMatchStatus: str(face?.status),
    faceMatchScore: num(face?.score),
    warnings: [...new Set(warnings)],
  };
}

/** Saves a result from a webhook or a direct check; tells the owner when it's settled */
export async function applyIdResult(sessionId: string, diditStatus: string, decision: Node | undefined) {
  const [store] = await db.select().from(schema.merchants).where(eq(schema.merchants.kycSessionId, sessionId));
  if (!store) return null;
  const status = statusFrom(diditStatus);
  const [updated] = await db
    .update(schema.merchants)
    .set({ kycStatus: status, kycResult: summarise(diditStatus, decision), kycUpdatedAt: new Date() })
    .where(eq(schema.merchants.id, store.id))
    .returning();
  if (status !== store.kycStatus) {
    await audit(db, { actorId: null, action: "merchant.kyc", entityType: "merchant", entityId: store.id, details: { from: store.kycStatus, to: status, didit: diditStatus } });
    if ((status === "approved" || status === "declined" || status === "resubmit") && store.contactEmail) {
      const [owner] = store.ownerId ? await db.select({ name: schema.users.fullName }).from(schema.users).where(eq(schema.users.id, store.ownerId)) : [];
      sendEmailLater(idCheckEmail(store.contactEmail, { name: owner?.name ?? null, store: store.name, outcome: status }));
    }
  }
  return updated;
}

/** Asks Didit for the latest result (used when the dashboard checks in, so it works without webhooks too) */
export async function refreshIdCheck(sessionId: string) {
  const d = await didit<Node & { status: string }>(`/session/${sessionId}/decision/`);
  return applyIdResult(sessionId, d.status, d);
}

/** Didit's JSON form for X-Signature-V2: keys sorted at every level, compact, Unicode kept */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Node)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical((value as Node)[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

const sameHex = (a: string, b: string | undefined) => !!b && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** True when the webhook really came from Didit (and isn't a replay older than 5 minutes) */
export function webhookIsGenuine(rawBody: string, header: (name: string) => string | undefined) {
  const secret = env.DIDIT_WEBHOOK_SECRET;
  if (!secret) return false;
  const ts = Number(header("x-timestamp"));
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;
  const sign = (s: string) => createHmac("sha256", secret).update(s, "utf8").digest("hex");
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return false;
  }
  const v2 = sign(canonical(parsed));
  const raw = sign(rawBody);
  return (
    sameHex(v2, header("x-signature-v2")) ||
    sameHex(v2, header("x-signature-v2-previous")) ||
    sameHex(raw, header("x-signature")) ||
    sameHex(raw, header("x-signature-previous"))
  );
}
