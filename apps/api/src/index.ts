import { serve } from "@hono/node-server";
import { app } from "./app";
import { env } from "./env";
import { releaseExpiredReservations } from "./services/orders";

serve({ fetch: app.fetch, port: env.PORT, hostname: "0.0.0.0" }, (info) => {
  console.log(`Sotechy API listening on http://localhost:${info.port}`);
});

// Release stock held by unpaid orders once their payment window expires.
setInterval(() => {
  releaseExpiredReservations()
    .then((n) => n > 0 && console.log(`Released ${n} expired reservation(s)`))
    .catch((err) => console.error("Reservation cleanup failed", err));
}, 60_000);
