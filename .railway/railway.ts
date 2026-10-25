// Railway infrastructure for Sotechy Shop (Railway "Infrastructure as Code").
//   railway config plan    → preview changes against the live project
//   railway config apply   → apply them
// Secrets are never written here: they use preserve(), which keeps the value already set in
// Railway (set them with `railway variable set` or in the dashboard). See apps/api/.env.example.
import { defineRailway, postgres, preserve, project, service, volume } from "railway/iac";

const REGION = "europe-west4-drams3a";

export default defineRailway(() => {
  const Postgres = postgres("Postgres", { region: REGION });
  const postgresVolume = volume("postgres-volume", {
    alerts: { usage: { "100": {}, "80": {}, "95": {} } },
    allowOnlineResize: true,
    region: REGION,
    sizeMB: 50000,
  });

  // Hono API + Postgres. Every deploy runs migrations, then the seed (which only adds what's missing).
  const api = service("api", {
    replicas: { [REGION]: 1 },
    build: {
      builder: "RAILPACK",
      buildCommand: "pnpm --filter @sotechy/api build",
      watchPatterns: ["apps/api/**", "packages/shared/**", "pnpm-lock.yaml"],
    },
    start: "pnpm --filter @sotechy/api start",
    preDeploy: "pnpm --filter @sotechy/api db:migrate:prod && pnpm --filter @sotechy/api db:seed:prod",
    healthcheck: "/health",
    env: {
      NODE_ENV: "production",
      DATABASE_URL: Postgres.env.DATABASE_URL,
      // Browsers allowed to call the API: the admin dashboard
      CORS_ORIGINS: "https://${{admin.RAILWAY_PUBLIC_DOMAIN}}",
      JWT_SECRET: preserve(),
      SEED_ADMIN_EMAIL: "admin@sotechy.shop",
      SEED_ADMIN_PASSWORD: preserve(),
      // Adds a few [DEMO] products for testing; set to "false" once real products are in
      SEED_DEMO_PRODUCTS: "true",
      MONEYMOVES_SECRET_KEY: preserve(),
      MONEYMOVES_WEBHOOK_SECRET: preserve(),
      GOOGLE_CLIENT_IDS: preserve(),
    },
  });

  // Next.js admin dashboard
  const admin = service("admin", {
    replicas: { [REGION]: 1 },
    build: {
      builder: "RAILPACK",
      buildCommand: "pnpm --filter @sotechy/admin build",
      watchPatterns: ["apps/admin/**", "packages/shared/**", "pnpm-lock.yaml"],
    },
    start: "pnpm --filter @sotechy/admin start",
    env: {
      NODE_ENV: "production",
      API_URL: "https://${{api.RAILWAY_PUBLIC_DOMAIN}}",
    },
  });

  return project("Sotechy Shop", {
    resources: [admin, api, Postgres, postgresVolume],
  });
});
