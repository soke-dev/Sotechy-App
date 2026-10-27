import { serve } from "@hono/node-server";
import { app } from "./app";
import { env } from "./env";
import { releaseExpiredReservations } from "./services/orders";
import { payoutRound } from "./services/payouts";
import { startChainWorker } from "./services/chain";

serve({ fetch: app.fetch, port: env.PORT, hostname: "0.0.0.0" }, (info) => {
  console.log(`Sotechy API listening on http://localhost:${info.port}`);
});

// Release stock held by unpaid orders once their payment window expires.
setInterval(() => {
  releaseExpiredReservations()
    .then((n) => n > 0 && console.log(`Released ${n} expired reservation(s)`))
    .catch((err) => console.error("Reservation cleanup failed", err));
}, 60_000);

// Copy the token ledger and receipts onto Monad as they happen
startChainWorker();

// Check payouts on their way, and send due ones when automatic sending is on.
setInterval(() => {
  payoutRound().catch((err) => console.error("Payout round failed", err));
}, 2 * 60_000);
