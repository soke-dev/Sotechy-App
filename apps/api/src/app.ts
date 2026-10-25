import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { corsOrigins } from "./env";
import { requireAuth, requireRole, STAFF, type AppEnv } from "./lib/auth";
import { HttpError } from "./lib/errors";
import { adminCatalogRoutes } from "./routes/admin/catalog";
import { adminContentRoutes } from "./routes/admin/content";
import { adminManagementRoutes } from "./routes/admin/management";
import { adminOperationsRoutes } from "./routes/admin/operations";
import { authRoutes } from "./routes/auth";
import { mediaRoutes } from "./routes/media";
import { meRoutes } from "./routes/me";
import { orderRoutes } from "./routes/orders";
import { paymentRoutes } from "./routes/payments";
import { storeRoutes } from "./routes/store";

const admin = new Hono<AppEnv>()
  .use(requireAuth, requireRole(...STAFF))
  .route("/", adminCatalogRoutes)
  .route("/", adminOperationsRoutes)
  .route("/", adminManagementRoutes)
  .route("/", adminContentRoutes);

export const app = new Hono()
  .use(logger())
  // Images under /media are loaded by the admin site and the apps from other origins.
  .use(secureHeaders({ crossOriginResourcePolicy: "cross-origin" }))
  .use(cors({ origin: corsOrigins, credentials: true }))
  .get("/", (c) => c.json({ name: "Sotechy API", status: "ok" }))
  .get("/health", (c) => c.json({ ok: true }))
  .route("/auth", authRoutes)
  .route("/store", storeRoutes)
  .route("/orders", orderRoutes)
  .route("/me", meRoutes)
  .route("/payments", paymentRoutes)
  .route("/media", mediaRoutes)
  .route("/admin", admin);

app.onError((err, c) => {
  if (err instanceof HttpError) return c.json({ error: err.message, details: err.details }, err.status);
  // zod validation errors from zValidator are returned as 400 by the validator itself
  const pgCode = (err as { code?: string }).code;
  if (pgCode === "23505") return c.json({ error: "That record already exists" }, 409);
  if (pgCode === "23514") return c.json({ error: "Not enough stock for this change" }, 409);
  console.error(err);
  return c.json({ error: "Something went wrong" }, 500);
});

app.notFound((c) => c.json({ error: "Not found" }, 404));
