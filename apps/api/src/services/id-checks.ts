// Sotechy's own ID check for store owners, used while Didit is switched off (Admin → App switches): the
// owner sends the front of their ID, a selfie and a 3-second smile video; an admin approves it, sends it
// back with what to redo, or declines it. Approving the ID never approves the store: that stays separate.
import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { ID_REDO_ITEMS, ID_TYPES, redoParts, type AdminIdCheck, type IdCheckState, type IdType, type ManualIdCheck } from "@sotechy/shared";
import { db, schema } from "../db/client";
import { audit } from "../lib/audit";
import { sendEmailLater } from "../lib/email";
import { badRequest, conflict, notFound } from "../lib/errors";
import { compressImage } from "../lib/images";
import { idCheckEmail } from "../emails/templates";
import { diditConfigured, refreshIdCheck } from "./didit";
import { getFeatures } from "./features";

type Store = typeof schema.merchants.$inferSelect;
type Check = typeof schema.idChecks.$inferSelect;

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const VIDEO_TYPES = ["video/webm", "video/mp4", "video/quicktime"];
const MB = 1024 * 1024;
/** How long a "continue on your phone" link works */
const HANDOFF_MINUTES = 30;

const toManual = (c: Check): ManualIdCheck => ({
  id: c.id,
  idType: c.idType as IdType,
  status: c.status,
  redoItems: c.redoItems ?? [],
  note: c.note,
  createdAt: c.createdAt.toISOString(),
  reviewedAt: c.reviewedAt?.toISOString() ?? null,
});

export async function latestCheck(merchantId: string) {
  const [row] = await db.select().from(schema.idChecks).where(eq(schema.idChecks.merchantId, merchantId)).orderBy(desc(schema.idChecks.createdAt)).limit(1);
  return row ?? null;
}

/** Didit when it's switched on and set up; a Didit check that's already running finishes there either way */
export async function idCheckMethod(store: Store): Promise<"didit" | "manual"> {
  const diditRunning = !!store.kycSessionId && (store.kycStatus === "in_progress" || store.kycStatus === "in_review");
  if (diditRunning) return "didit";
  // And one of ours that's waiting for an admin finishes here
  if (store.kycStatus === "in_review" && !store.kycSessionId) return "manual";
  const { diditIdCheck } = await getFeatures();
  return diditIdCheck && diditConfigured() ? "didit" : "manual";
}

/** What the merchant dashboard shows for the ID step */
export async function idCheckState(store: Store): Promise<IdCheckState> {
  const method = await idCheckMethod(store);
  let current = store;
  if (method === "didit" && store.kycSessionId && (store.kycStatus === "in_progress" || store.kycStatus === "in_review") && diditConfigured()) {
    current = (await refreshIdCheck(store.kycSessionId).catch(() => null)) ?? store;
  }
  const check = method === "manual" ? await latestCheck(store.id) : null;
  return {
    status: current.kycStatus,
    updatedAt: current.kycUpdatedAt?.toISOString() ?? null,
    available: method === "manual" || diditConfigured(),
    method,
    check: check ? toManual(check) : null,
  };
}

/** Saves one private file (ID photo, selfie or video) and returns its id */
async function saveFile(file: File, kind: "id" | "selfie" | "video", ownerId: string | null) {
  const raw = Buffer.from(await file.arrayBuffer());
  const pdf = file.type === "application/pdf";
  // Photos are shrunk but kept sharp enough to read an ID; PDFs and videos are kept as sent
  const saved =
    kind === "video" || pdf ? { data: raw, type: file.type, filename: file.name.slice(0, 200) || kind } : await compressImage(raw, file.type, file.name.slice(0, 200) || `${kind}.jpg`, 2000);
  const [row] = await db
    .insert(schema.media)
    .values({ filename: saved.filename, contentType: saved.type, size: saved.data.length, data: saved.data, isPrivate: true, createdBy: ownerId })
    .returning({ id: schema.media.id });
  return row.id;
}

const asFile = (v: unknown) => (v instanceof File && v.size > 0 ? v : null);

/**
 * The owner sends their check (from the dashboard, or from their phone through a one-time link).
 * A first check needs all three; after "redo", only what was asked for (the rest is kept from last time).
 */
export async function submitManualCheck(store: Store, body: Record<string, unknown>) {
  if ((await idCheckMethod(store)) !== "manual") throw badRequest("ID checks go through Didit right now. Refresh the page.");
  if (store.kycStatus === "approved") throw conflict("Your ID is already verified");
  if (store.kycStatus === "in_review") throw conflict("Your ID is already under verification. We'll email you when it's done.");
  if (store.kycStatus === "declined") throw conflict("Your ID couldn't be verified. Contact support@sotechy.shop and we'll look at it with you.");

  const idType = String(body.idType ?? "") as IdType;
  if (!ID_TYPES.some((t) => t.value === idType)) throw badRequest("Choose which ID you're using");
  const idPhoto = asFile(body.idPhoto);
  const selfie = asFile(body.selfie);
  const video = asFile(body.video);

  // After "redo", only the parts asked for are needed again
  const previous = await latestCheck(store.id);
  const redo = previous?.status === "resubmit" ? redoParts(previous.redoItems ?? []) : null;
  const needId = !redo || redo.id || idType !== previous?.idType || !previous?.idPhotoId;
  const needFace = !redo || redo.face || !previous?.selfieId || !previous?.videoId;
  if (needId && !idPhoto) throw badRequest("Add a photo of the front of your ID");
  if (needFace && !selfie) throw badRequest("Take your selfie");
  if (needFace && !video) throw badRequest("Record the smile video");

  if (idPhoto && ![...IMAGE_TYPES, "application/pdf"].includes(idPhoto.type)) throw badRequest("The ID photo must be a JPG, PNG or PDF");
  if (idPhoto && idPhoto.size > 10 * MB) throw badRequest("The ID photo is too large (up to 10 MB)");
  if (selfie && !IMAGE_TYPES.includes(selfie.type)) throw badRequest("The selfie must be a photo");
  if (selfie && selfie.size > 10 * MB) throw badRequest("The selfie is too large (up to 10 MB)");
  // Phones label recordings in different ways ("video/webm;codecs=vp8"): compare the main type only
  if (video && !VIDEO_TYPES.includes(video.type.split(";")[0])) throw badRequest("The smile video couldn't be read. Record it again.");
  if (video && video.size > 20 * MB) throw badRequest("The video is too long. Record it again (3 seconds).");

  const [idPhotoId, selfieId, videoId] = await Promise.all([
    idPhoto ? saveFile(idPhoto, "id", store.ownerId) : Promise.resolve(previous?.idPhotoId ?? null),
    selfie ? saveFile(selfie, "selfie", store.ownerId) : Promise.resolve(previous?.selfieId ?? null),
    video ? saveFile(video, "video", store.ownerId) : Promise.resolve(previous?.videoId ?? null),
  ]);
  const [check] = await db.insert(schema.idChecks).values({ merchantId: store.id, userId: store.ownerId, idType, idPhotoId, selfieId, videoId }).returning();
  // The store's ID step now shows "under verification"; the phone link can't be used again
  await db
    .update(schema.merchants)
    .set({ kycStatus: "in_review", kycUpdatedAt: new Date(), kycSessionId: null, kycResult: null, idHandoffHash: null, idHandoffExpiresAt: null })
    .where(eq(schema.merchants.id, store.id));
  await audit(db, { actorId: store.ownerId, action: "merchant.id_check_sent", entityType: "merchant", entityId: store.id, details: { checkId: check.id, idType, redo: !!redo } });
  return toManual(check);
}

// --- Continue on your phone ---

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

/** A one-time link for the owner's phone; a new one replaces the last */
export async function createHandoff(store: Store) {
  if (store.kycStatus === "approved") throw conflict("Your ID is already verified");
  if (store.kycStatus === "in_review") throw conflict("Your ID is already under verification");
  if (store.kycStatus === "declined") throw conflict("Your ID couldn't be verified. Contact support@sotechy.shop and we'll look at it with you.");
  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + HANDOFF_MINUTES * 60_000);
  await db.update(schema.merchants).set({ idHandoffHash: hash(token), idHandoffExpiresAt: expiresAt }).where(eq(schema.merchants.id, store.id));
  return { token, expiresAt: expiresAt.toISOString() };
}

/** The store a phone link belongs to, while it still works */
export async function storeForHandoff(token: string) {
  const gone = () => notFound("This link was already used or has expired. Scan the new code on your computer.");
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) throw gone();
  const [store] = await db.select().from(schema.merchants).where(eq(schema.merchants.idHandoffHash, hash(token)));
  if (!store || !store.idHandoffExpiresAt || store.idHandoffExpiresAt < new Date()) throw gone();
  return store;
}

// --- Admin ---

const ownerName = sql<string | null>`(select u.full_name from users u where u.id = ${schema.merchants.ownerId})`;
const ownerEmail = sql<string | null>`(select u.email from users u where u.id = ${schema.merchants.ownerId})`;
const ownerPhone = sql<string | null>`(select u.phone from users u where u.id = ${schema.merchants.ownerId})`;
const reviewer = sql<string | null>`(select u.full_name from users u where u.id = ${schema.idChecks.reviewedBy})`;
const attempt = sql<number>`(select count(*)::int from id_checks x where x.merchant_id = ${schema.idChecks.merchantId} and x.created_at <= ${schema.idChecks.createdAt})`;

function adminQuery() {
  const k = schema.idChecks;
  const m = schema.merchants;
  return db
    .select({
      check: k,
      storeName: m.name,
      storeSlug: m.slug,
      storeStatus: m.status,
      contactEmail: m.contactEmail,
      contactPhone: m.contactPhone,
      ownerName,
      ownerEmail,
      ownerPhone,
      attempt,
      reviewedByName: reviewer,
    })
    .from(k)
    .innerJoin(m, eq(m.id, k.merchantId));
}

type AdminRow = Awaited<ReturnType<typeof adminQuery>>[number];
const toAdmin = (r: AdminRow): AdminIdCheck => ({
  ...toManual(r.check),
  merchantId: r.check.merchantId,
  storeName: r.storeName,
  storeSlug: r.storeSlug,
  storeStatus: r.storeStatus,
  ownerName: r.ownerName,
  ownerEmail: r.ownerEmail ?? r.contactEmail,
  ownerPhone: r.ownerPhone ?? r.contactPhone,
  attempt: r.attempt,
  idPhotoId: r.check.idPhotoId,
  selfieId: r.check.selfieId,
  videoId: r.check.videoId,
  reviewedByName: r.reviewedByName,
});

export async function adminIdChecks(status: Check["status"]) {
  const k = schema.idChecks;
  const rows = await adminQuery()
    .where(eq(k.status, status))
    .orderBy(status === "in_review" ? k.createdAt : desc(k.reviewedAt))
    .limit(200);
  return rows.map(toAdmin);
}

export async function adminIdCheck(id: string) {
  const [row] = await adminQuery().where(eq(schema.idChecks.id, id));
  if (!row) throw notFound("ID check not found");
  return toAdmin(row);
}

export async function idCheckCounts() {
  const rows = await db
    .select({ status: schema.idChecks.status, n: sql<number>`count(*)::int` })
    .from(schema.idChecks)
    .groupBy(schema.idChecks.status);
  const counts = { in_review: 0, approved: 0, resubmit: 0, declined: 0 };
  for (const r of rows) counts[r.status] = r.n;
  return counts;
}

/** Approve, send back to redo (with what was missed), or decline. Emails the owner every time. */
export async function decideIdCheck(id: string, actorId: string, input: { outcome: "approve" | "redo" | "decline"; items?: string[]; note?: string }) {
  const [check] = await db.select().from(schema.idChecks).where(eq(schema.idChecks.id, id));
  if (!check) throw notFound("ID check not found");
  if (check.status !== "in_review") throw conflict("This check has already been decided");
  const newest = await latestCheck(check.merchantId);
  if (newest?.id !== check.id) throw conflict("The owner has sent a newer check. Open that one.");
  const items = (input.items ?? []).filter((c) => ID_REDO_ITEMS.some((x) => x.code === c));
  const note = input.note?.trim() || null;
  if (input.outcome === "redo" && !items.length) throw badRequest("Pick what they need to redo");
  if (input.outcome === "decline" && !note) throw badRequest("Say why it's declined. The owner sees this.");

  const status = input.outcome === "approve" ? "approved" : input.outcome === "redo" ? "resubmit" : "declined";
  const [store] = await db.transaction(async (tx) => {
    await tx
      .update(schema.idChecks)
      .set({ status, redoItems: input.outcome === "redo" ? items : [], note: input.outcome === "approve" ? null : note, reviewedBy: actorId, reviewedAt: new Date() })
      .where(eq(schema.idChecks.id, check.id));
    // Only the identity: approving the store itself stays a separate decision in Merchants
    const updated = await tx.update(schema.merchants).set({ kycStatus: status, kycUpdatedAt: new Date() }).where(eq(schema.merchants.id, check.merchantId)).returning();
    await audit(tx, { actorId, action: `merchant.id_check_${input.outcome}`, entityType: "merchant", entityId: check.merchantId, details: { checkId: check.id, items, note } });
    return updated;
  });

  if (store) {
    const [owner] = store.ownerId ? await db.select({ email: schema.users.email, name: schema.users.fullName }).from(schema.users).where(eq(schema.users.id, store.ownerId)) : [];
    const to = store.contactEmail ?? owner?.email;
    if (to) {
      sendEmailLater(
        idCheckEmail(to, {
          name: owner?.name ?? null,
          store: store.name,
          outcome: status,
          redo: input.outcome === "redo" ? items.map((c) => ID_REDO_ITEMS.find((x) => x.code === c)!).map((x) => `${x.label}: ${x.tip}`) : undefined,
          note,
        }),
      );
    }
  }
  return adminIdCheck(check.id);
}

/** For the store's page in admin: its newest manual check, if any */
export async function storeIdCheck(merchantId: string) {
  const [row] = await adminQuery().where(and(eq(schema.idChecks.merchantId, merchantId))).orderBy(desc(schema.idChecks.createdAt)).limit(1);
  return row ? toAdmin(row) : null;
}
