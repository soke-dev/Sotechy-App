// Public image hosting for uploads from the admin dashboard (product photos, banners, categories).
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { db, schema } from "../db/client";
import { notFound } from "../lib/errors";

export const mediaRoutes = new Hono().get("/:id", async (c) => {
  const id = c.req.param("id");
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound("Image not found");
  const [row] = await db.select({ data: schema.media.data, contentType: schema.media.contentType, isPrivate: schema.media.isPrivate }).from(schema.media).where(eq(schema.media.id, id));
  // Business documents are private: staff see them through the admin API, owners through their own
  if (!row || row.isPrivate) throw notFound("Image not found");
  // Uploads never change (a new upload gets a new id), so they can be cached for a long time.
  return c.body(new Uint8Array(row.data), 200, { "Content-Type": row.contentType, "Cache-Control": "public, max-age=31536000, immutable" });
});
