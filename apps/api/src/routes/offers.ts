// A customer's price offers: make one, see them, and answer the store.
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { requireAuth, type AppEnv } from "../lib/auth";
import { notFound } from "../lib/errors";
import { answerOffer, customerOffers, makeOffer } from "../services/offers";

export const answerSchema = z.object({ action: z.enum(["accept", "decline", "counter"]), amount: z.number().positive().max(100_000_000).optional(), text: z.string().trim().max(300).nullable().optional() });

export const offerRoutes = new Hono<AppEnv>()
  .use(requireAuth)
  .get("/", async (c) => c.json(await customerOffers(c.get("user").id)))
  .post("/", zValidator("json", z.object({ variantId: z.uuid(), amount: z.number().positive().max(100_000_000), text: z.string().trim().max(300).nullable().optional() })), async (c) =>
    c.json(await makeOffer(c.get("user").id, c.req.valid("json")), 201),
  )
  .get("/:id", async (c) => {
    const [offer] = await customerOffers(c.get("user").id, c.req.param("id"));
    if (!offer) throw notFound("Offer not found");
    return c.json(offer);
  })
  .post("/:id/answer", zValidator("json", answerSchema), async (c) => c.json(await answerOffer(c.req.param("id"), { side: "customer", userId: c.get("user").id }, c.req.valid("json"))));
