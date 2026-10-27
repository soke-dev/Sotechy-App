// The people who run a store. The owner opened it; others join by invite with a role that decides
// which parts of the dashboard they can use. Where the money goes (payout accounts), setup and the
// store's admins stay with the owner.
import { createHash, randomBytes } from "node:crypto";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import { db, schema } from "../db/client";
import { env } from "../env";
import { audit } from "../lib/audit";
import { badRequest, conflict, forbidden, notFound } from "../lib/errors";
import { sendEmailLater } from "../lib/email";
import { teamInviteEmail } from "../emails/templates";

export const TEAM_ROLES = ["admin", "orders", "catalogue", "finance", "viewer"] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];
export type StoreRole = "owner" | TeamRole;
type Store = typeof schema.merchants.$inferSelect;

const members = schema.merchantMembers;
const MAX_MEMBERS = 10;

/** The store this account runs, and as what: its own store, or one it joined */
export async function storeAccess(userId: string): Promise<{ store: Store; role: StoreRole } | null> {
  const [own] = await db.select().from(schema.merchants).where(eq(schema.merchants.ownerId, userId));
  if (own) return { store: own, role: "owner" };
  const [m] = await db
    .select({ store: schema.merchants, role: members.role })
    .from(members)
    .innerJoin(schema.merchants, eq(schema.merchants.id, members.merchantId))
    .where(and(eq(members.userId, userId), isNotNull(members.acceptedAt)));
  return m ? { store: m.store, role: m.role as TeamRole } : null;
}

// Which parts of /merchant each role can use, by the first part of the path
const AREAS: Record<Exclude<TeamRole, "admin" | "viewer">, string[]> = {
  orders: ["orders", "offers", "customers", "walk-in", "notices"],
  catalogue: ["products", "media", "delivery-zones", "storefront", "reviews", "notices"],
  finance: ["payouts", "banks", "featuring", "token", "walk-in"],
};
/** Read by every page, so everyone can see them */
const EVERYONE_READS = ["summary", "token", "offers", "featuring"];
const OWNER_ONLY = ["payout-account", "payout-accounts", "application", "ticker"];

/** Whether a role may make this request to the merchant API (path without /merchant) */
export function roleAllows(role: StoreRole, method: string, path: string) {
  if (role === "owner") return true;
  const area = path.replace(/^\/merchant/, "").split("/").filter(Boolean)[0] ?? "";
  if (OWNER_ONLY.includes(area)) return false;
  const reading = method === "GET" || method === "HEAD";
  if (role === "admin") return true;
  if (reading && (role === "viewer" || EVERYONE_READS.includes(area))) return area !== "media";
  return AREAS[role as keyof typeof AREAS]?.includes(area) ?? false;
}

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function teamOf(merchantId: string) {
  const rows = await db
    .select({ id: members.id, email: members.email, role: members.role, acceptedAt: members.acceptedAt, createdAt: members.createdAt, name: schema.users.fullName, username: schema.users.username })
    .from(members)
    .leftJoin(schema.users, eq(schema.users.id, members.userId))
    .where(eq(members.merchantId, merchantId))
    .orderBy(asc(members.createdAt));
  return rows.map((r) => ({ ...r, status: r.acceptedAt ? ("active" as const) : ("invited" as const) }));
}

/** Invites someone by email. Only the owner can add admins. */
export async function inviteMember(store: Store, by: { id: string; role: StoreRole; name: string | null }, input: { email: string; role: TeamRole }) {
  if (by.role !== "owner" && by.role !== "admin") throw forbidden("Only the owner and admins can add people");
  if (input.role === "admin" && by.role !== "owner") throw forbidden("Only the owner can add admins");
  const email = input.email.trim().toLowerCase();
  const [owner] = store.ownerId ? await db.select({ email: schema.users.email }).from(schema.users).where(eq(schema.users.id, store.ownerId)) : [];
  if (owner?.email.toLowerCase() === email) throw badRequest("That's the owner's own email");
  const current = await teamOf(store.id);
  if (current.some((m) => m.email === email)) throw conflict("They're already on your team or invited");
  if (current.length >= MAX_MEMBERS) throw badRequest(`A store can have up to ${MAX_MEMBERS} people besides the owner`);
  const token = randomBytes(24).toString("base64url");
  const [row] = await db.insert(members).values({ merchantId: store.id, email, role: input.role, inviteHash: hash(token), invitedBy: by.id }).returning();
  const link = `${env.MERCHANT_APP_URL.replace(/\/$/, "")}/join?invite=${token}`;
  sendEmailLater(teamInviteEmail(email, { store: store.name, from: by.name, role: input.role, link }));
  await audit(db, { actorId: by.id, action: "merchant.team_invite", entityType: "merchant", entityId: store.id, details: { email, role: input.role } });
  return row;
}

/** The signed-in person accepts an invite sent to their email */
export async function acceptInvite(user: { id: string; email: string }, token: string) {
  const [invite] = await db.select().from(members).where(eq(members.inviteHash, hash(token)));
  if (!invite || invite.acceptedAt) throw notFound("This invite has been used or withdrawn. Ask the store for a new one.");
  if (invite.email !== user.email.toLowerCase()) throw forbidden(`This invite is for ${invite.email}. Sign in with that email to accept it.`);
  if (await storeAccess(user.id)) throw conflict("This account already runs a store. Use another email to join this one.");
  await db.update(members).set({ userId: user.id, acceptedAt: new Date(), inviteHash: null }).where(eq(members.id, invite.id));
  await audit(db, { actorId: user.id, action: "merchant.team_join", entityType: "merchant", entityId: invite.merchantId, details: { role: invite.role } });
  return { merchantId: invite.merchantId, role: invite.role };
}

/** What an invite link is for, so the join page can say so before signing in */
export async function describeInvite(token: string) {
  const [row] = await db
    .select({ email: members.email, role: members.role, acceptedAt: members.acceptedAt, store: schema.merchants.name })
    .from(members)
    .innerJoin(schema.merchants, eq(schema.merchants.id, members.merchantId))
    .where(eq(members.inviteHash, hash(token)));
  if (!row || row.acceptedAt) return null;
  return { email: row.email, role: row.role, store: row.store };
}

export async function changeRole(store: Store, by: { id: string; role: StoreRole }, memberId: string, role: TeamRole) {
  const [m] = await db.select().from(members).where(and(eq(members.id, memberId), eq(members.merchantId, store.id)));
  if (!m) throw notFound("Not on this store's team");
  if (by.role !== "owner" && (role === "admin" || m.role === "admin")) throw forbidden("Only the owner can change admins");
  if (by.role !== "owner" && by.role !== "admin") throw forbidden("Only the owner and admins can change roles");
  await db.update(members).set({ role }).where(eq(members.id, m.id));
  await audit(db, { actorId: by.id, action: "merchant.team_role", entityType: "merchant", entityId: store.id, details: { email: m.email, from: m.role, to: role } });
}

export async function removeMember(store: Store, by: { id: string; role: StoreRole }, memberId: string) {
  const [m] = await db.select().from(members).where(and(eq(members.id, memberId), eq(members.merchantId, store.id)));
  if (!m) throw notFound("Not on this store's team");
  if (by.role !== "owner" && m.role === "admin") throw forbidden("Only the owner can remove admins");
  if (by.role !== "owner" && by.role !== "admin" && m.userId !== by.id) throw forbidden("Only the owner and admins can remove people");
  await db.delete(members).where(eq(members.id, m.id));
  await audit(db, { actorId: by.id, action: "merchant.team_remove", entityType: "merchant", entityId: store.id, details: { email: m.email } });
}
