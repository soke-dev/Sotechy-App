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

  // Custom addresses (api., admin., merchant., sotechy.shop, www.) are attached with `railway domain`,
  // since this file can't register them; DNS for them lives at Namecheap.

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
      // Browsers allowed to call the API: the dashboards and the website
      CORS_ORIGINS: [
        "https://${{admin.RAILWAY_PUBLIC_DOMAIN}}",
        "https://admin.sotechy.shop",
        "https://merchant.sotechy.shop",
        "https://sotechy.shop",
        "https://www.sotechy.shop",
      ].join(","),
      JWT_SECRET: preserve(),
      // The first admin (more are added from the admin dashboard). Their sign-in codes go to this inbox.
      SEED_ADMIN_EMAIL: "coolexcollins@gmail.com",
      SEED_ADMIN_PASSWORD: preserve(),
      // Adds a few [DEMO] products for testing; set to "false" once real products are in
      SEED_DEMO_PRODUCTS: "true",
      MONEYMOVES_SECRET_KEY: preserve(),
      MONEYMOVES_WEBHOOK_SECRET: preserve(),
      GOOGLE_CLIENT_IDS: preserve(),
      // Email through Resend; the sotechy.shop domain must be verified there
      RESEND_API_KEY: preserve(),
      EMAIL_FROM: "Sotechy <hello@sotechy.shop>",
      // Merchant ID + liveness checks through Didit; webhook URL: https://<api>/webhooks/didit
      DIDIT_API_KEY: preserve(),
      DIDIT_WORKFLOW_ID: preserve(),
      DIDIT_WEBHOOK_SECRET: preserve(),
      GEOAPIFY_API_KEY: preserve(),
      // Where Didit sends merchants back to (switch to https://merchant.sotechy.shop once its DNS works)
      MERCHANT_APP_URL: "https://${{merchant.RAILWAY_PUBLIC_DOMAIN}}",
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

  // Next.js merchant dashboard
  const merchant = service("merchant", {
    replicas: { [REGION]: 1 },
    build: {
      builder: "RAILPACK",
      buildCommand: "pnpm --filter @sotechy/merchant build",
      watchPatterns: ["apps/merchant/**", "packages/shared/**", "pnpm-lock.yaml"],
    },
    start: "pnpm --filter @sotechy/merchant start",
    env: {
      NODE_ENV: "production",
      API_URL: "https://${{api.RAILWAY_PUBLIC_DOMAIN}}",
      // Google's Web client ID (public; read at build time)
      NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID: "135476780081-itrqdn08npnranseuh73v5l1cnmq3jip.apps.googleusercontent.com",
    },
  });

  // Next.js landing site
  const web = service("web", {
    replicas: { [REGION]: 1 },
    build: {
      builder: "RAILPACK",
      buildCommand: "pnpm --filter @sotechy/web build",
      watchPatterns: ["apps/web/**", "packages/shared/**", "pnpm-lock.yaml"],
    },
    start: "pnpm --filter @sotechy/web start",
    env: {
      NODE_ENV: "production",
    },
  });

  return project("Sotechy Shop", {
    resources: [admin, api, merchant, web, Postgres, postgresVolume],
  });
});
