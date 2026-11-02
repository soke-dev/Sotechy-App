// Live chat between a customer and Sotechy staff. Each customer has one open conversation (a support
// ticket titled "Live chat"); the app checks it every few seconds while the chat is open. Admins are
// emailed when a conversation starts or a customer writes again after a quiet spell, and the customer
// gets a push when staff reply.
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "../db/client";
import { sendEmailLater } from "../lib/email";
import { notFound } from "../lib/errors";
import { supportChatEmail } from "../emails/templates";
import { sendPushLater } from "./push";

const { supportTickets: tickets, supportMessages: messages, users } = schema;
export const CHAT_SUBJECT = "Live chat";
/** A customer writing again after this long brings a fresh email to admins */
const QUIET_MS = 30 * 60_000;

async function openChat(userId: string) {
  const [t] = await db
    .select()
    .from(tickets)
    .where(and(eq(tickets.customerId, userId), eq(tickets.subject, CHAT_SUBJECT), inArray(tickets.status, ["open", "pending"])))
    .orderBy(desc(tickets.createdAt))
    .limit(1);
  return t ?? null;
}

const threadOf = (ticketId: string) =>
  db.select({ id: messages.id, fromStaff: messages.fromStaff, body: messages.body, imageUrl: messages.imageUrl, createdAt: messages.createdAt }).from(messages).where(eq(messages.ticketId, ticketId)).orderBy(asc(messages.createdAt));

/** The customer's open conversation, oldest message first */
export async function chatFor(userId: string) {
  const t = await openChat(userId);
  if (!t) return { ticketId: null, messages: [] };
  const rows = await threadOf(t.id);
  return { ticketId: t.id, messages: rows.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })) };
}

export async function postChatMessage(userId: string, body: string, orderId?: string, imageUrl?: string | null) {
  let t = await openChat(userId);
  const isNew = !t;
  const quiet = !t || Date.now() - t.lastMessageAt.getTime() > QUIET_MS;
  if (!t) [t] = await db.insert(tickets).values({ customerId: userId, orderId, subject: CHAT_SUBJECT, message: body || "Photo" }).returning();
  await db.insert(messages).values({ ticketId: t.id, authorId: userId, body, imageUrl: imageUrl ?? null });
  // Back to "open": it's the team's turn to answer
  await db.update(tickets).set({ lastMessageAt: new Date(), status: "open" }).where(eq(tickets.id, t.id));
  if (quiet) await tellAdmins(userId, t.id, body || "Sent a photo", isNew);
  return t.id;
}

/** Emails every admin account about a customer's message */
export async function tellAdmins(userId: string, ticketId: string, message: string, isNew: boolean, form = false) {
  const [me] = await db.select({ username: users.username, fullName: users.fullName, email: users.email }).from(users).where(eq(users.id, userId));
  const customer = me?.username ? `@${me.username}` : (me?.fullName ?? me?.email ?? "A customer");
  const admins = await db.select({ email: users.email, name: users.fullName }).from(users).where(eq(users.role, "admin"));
  for (const a of admins) sendEmailLater(supportChatEmail(a.email, { name: a.name, customer, message, ticketId, isNew, form }));
}

/** The customer's conversations, newest first, with the last message of each */
export async function chatsFor(userId: string) {
  const rows = await db.select().from(tickets).where(eq(tickets.customerId, userId)).orderBy(desc(tickets.lastMessageAt)).limit(50);
  if (!rows.length) return [];
  const last = await db
    .selectDistinctOn([messages.ticketId], { ticketId: messages.ticketId, body: messages.body, imageUrl: messages.imageUrl, fromStaff: messages.fromStaff })
    .from(messages)
    .where(inArray(messages.ticketId, rows.map((r) => r.id)))
    .orderBy(messages.ticketId, desc(messages.createdAt));
  return rows.map((t) => {
    const m = last.find((x) => x.ticketId === t.id);
    return {
      id: t.id,
      open: t.status === "open" || t.status === "pending",
      lastMessage: (m?.body || (m?.imageUrl ? "Photo" : "")) || t.message,
      lastFromStaff: m?.fromStaff ?? false,
      lastMessageAt: t.lastMessageAt.toISOString(),
      createdAt: t.createdAt.toISOString(),
    };
  });
}

/** One of the customer's conversations, to read again */
export async function chatById(userId: string, ticketId: string) {
  const [t] = await db.select().from(tickets).where(and(eq(tickets.id, ticketId), eq(tickets.customerId, userId)));
  if (!t) throw notFound("Conversation not found");
  const rows = await threadOf(t.id);
  const thread = rows.length ? rows : [{ id: `${t.id}-first`, fromStaff: false, body: t.message, imageUrl: null, createdAt: t.createdAt }];
  return { ticketId: t.id, open: t.status === "open" || t.status === "pending", messages: thread.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })) };
}

/** The customer starts afresh: their open conversation is closed, and the next message opens a new one */
export async function startNewChat(userId: string) {
  await db.update(tickets).set({ status: "closed" }).where(and(eq(tickets.customerId, userId), inArray(tickets.status, ["open", "pending"])));
  return { ticketId: null, messages: [] };
}

/** A conversation for the admin: the ticket, who wrote it, and every message */
export async function ticketThread(ticketId: string) {
  const [row] = await db
    .select({ t: tickets, email: users.email, fullName: users.fullName, username: users.username, phone: users.phone })
    .from(tickets)
    .leftJoin(users, eq(users.id, tickets.customerId))
    .where(eq(tickets.id, ticketId));
  if (!row) throw notFound("Conversation not found");
  const rows = await threadOf(ticketId);
  // Requests sent before live chat existed only have their first message on the ticket
  const thread = rows.length ? rows : [{ id: `${ticketId}-first`, fromStaff: false, body: row.t.message, imageUrl: null, createdAt: row.t.createdAt }];
  return {
    ...row.t,
    customer: { id: row.t.customerId, email: row.email, fullName: row.fullName, username: row.username, phone: row.phone },
    messages: thread.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
  };
}

/** Staff answer: saved, the conversation waits on the customer, and they get a push */
export async function replyToTicket(ticketId: string, staffId: string, body: string, imageUrl?: string | null) {
  const [t] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
  if (!t) throw notFound("Conversation not found");
  // An old request gets its first message copied in, so the thread reads in order
  const [existing] = await db.select({ id: messages.id }).from(messages).where(eq(messages.ticketId, ticketId)).limit(1);
  if (!existing) await db.insert(messages).values({ ticketId, authorId: t.customerId, body: t.message, createdAt: t.createdAt });
  await db.insert(messages).values({ ticketId, fromStaff: true, authorId: staffId, body, imageUrl: imageUrl ?? null });
  await db.update(tickets).set({ lastMessageAt: new Date(), status: "pending" }).where(eq(tickets.id, ticketId));
  if (t.customerId) sendPushLater([t.customerId], { kind: "support", title: "Sotechy Support replied", body: (body || "Sent a photo").slice(0, 140), data: { url: "/support?chat=1" } });
  return ticketThread(ticketId);
}
