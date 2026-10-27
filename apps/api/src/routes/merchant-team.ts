// A store's team: invite people by email with a role, change roles, remove people, and accept an invite.
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db, schema } from "../db/client";
import { requireAuth, type AppEnv } from "../lib/auth";
import { forbidden, notFound } from "../lib/errors";
import { acceptInvite, changeRole, describeInvite, inviteMember, removeMember, storeAccess, TEAM_ROLES, teamOf } from "../services/team";

const role = z.enum(TEAM_ROLES);

async function managing(userId: string) {
  const access = await storeAccess(userId);
  if (!access) throw notFound("You don't have a store yet");
  if (access.role !== "owner" && access.role !== "admin") throw forbidden("Only the owner and admins can manage the team");
  return access;
}

export const merchantTeamRoutes = new Hono<AppEnv>()
  /** What an invite link is for (no sign-in needed, so the join page can say it) */
  .get("/team/invites/:token", async (c) => {
    const invite = await describeInvite(c.req.param("token"));
    if (!invite) throw notFound("This invite has been used or withdrawn. Ask the store for a new one.");
    return c.json(invite);
  })
  .post("/team/accept", requireAuth, zValidator("json", z.object({ token: z.string().min(10).max(100) })), async (c) => {
    const [user] = await db.select({ id: schema.users.id, email: schema.users.email }).from(schema.users).where(eq(schema.users.id, c.get("user").id));
    return c.json(await acceptInvite(user, c.req.valid("json").token));
  })
  .get("/team", requireAuth, async (c) => {
    const access = await storeAccess(c.get("user").id);
    if (!access) throw notFound("You don't have a store yet");
    const [owner] = access.store.ownerId ? await db.select({ email: schema.users.email, name: schema.users.fullName, username: schema.users.username }).from(schema.users).where(eq(schema.users.id, access.store.ownerId)) : [];
    return c.json({ owner: owner ?? null, members: await teamOf(access.store.id), you: access.role });
  })
  .post("/team", requireAuth, zValidator("json", z.object({ email: z.email(), role })), async (c) => {
    const access = await managing(c.get("user").id);
    const [me] = await db.select({ name: schema.users.fullName }).from(schema.users).where(eq(schema.users.id, c.get("user").id));
    await inviteMember(access.store, { id: c.get("user").id, role: access.role, name: me?.name ?? null }, c.req.valid("json"));
    return c.json(await teamOf(access.store.id), 201);
  })
  .patch("/team/:id", requireAuth, zValidator("json", z.object({ role })), async (c) => {
    const access = await managing(c.get("user").id);
    await changeRole(access.store, { id: c.get("user").id, role: access.role }, c.req.param("id"), c.req.valid("json").role);
    return c.json(await teamOf(access.store.id));
  })
  .delete("/team/:id", requireAuth, async (c) => {
    const access = await storeAccess(c.get("user").id);
    if (!access) throw notFound("You don't have a store yet");
    await removeMember(access.store, { id: c.get("user").id, role: access.role }, c.req.param("id"));
    return c.json(await teamOf(access.store.id));
  });
