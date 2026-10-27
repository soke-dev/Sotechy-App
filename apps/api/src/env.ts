import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  CORS_ORIGINS: z.string().default("http://localhost:3000,http://localhost:3001,http://localhost:8081"),
  /** Comma-separated Google OAuth client IDs (iOS, Android, web) accepted for Google sign-in */
  GOOGLE_CLIENT_IDS: z.string().default(""),
  /** Defaults to https://business.usemoneymoves.xyz/api/v1 (test and live share it) */
  MONEYMOVES_API_URL: z.string().optional(),
  /** sk_test_… or sk_live_… from Money Moves → Developers → API keys */
  MONEYMOVES_SECRET_KEY: z.string().optional(),
  /** whsec_… from Money Moves → Developers → Webhooks (test and live have different secrets) */
  MONEYMOVES_WEBHOOK_SECRET: z.string().optional(),
  /** This API's public URL, e.g. https://api.sotechy.shop (Railway sets RAILWAY_PUBLIC_DOMAIN automatically) */
  PUBLIC_API_URL: z.string().optional(),
  RAILWAY_PUBLIC_DOMAIN: z.string().optional(),
  /** The customer app's URL scheme, used to send people back to the app after paying */
  APP_SCHEME: z.string().default("sotechy"),
  /** re_… from Resend → API Keys. Without it, emails are printed to the console instead of sent. */
  RESEND_API_KEY: z.string().optional(),
  /** Address suggestions while typing (geoapify.com); empty = no suggestions */
  GEOAPIFY_API_KEY: z.string().optional(),
  /** Outside production, emails are only printed unless this is "true" (so local runs don't use the Resend quota) */
  EMAIL_SEND_IN_DEV: z.enum(["true", "false"]).default("false"),
  /** Sender for all emails; the domain must be verified in Resend */
  EMAIL_FROM: z.string().default("Sotechy <hello@sotechy.shop>"),
  /** Didit identity checks for merchants (ID document + liveness): Console → API keys / Workflows / Webhooks */
  DIDIT_API_KEY: z.string().optional(),
  DIDIT_WORKFLOW_ID: z.string().optional(),
  DIDIT_WEBHOOK_SECRET: z.string().optional(),
  /** The merchant dashboard, where Didit sends people back after their check */
  MERCHANT_APP_URL: z.string().default("https://merchant.sotechy.shop"),
});

export const env = schema.parse(process.env);
export const corsOrigins = env.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean);
export const publicApiUrl = (env.PUBLIC_API_URL || (env.RAILWAY_PUBLIC_DOMAIN ? `https://${env.RAILWAY_PUBLIC_DOMAIN}` : "")).replace(/\/+$/, "");
