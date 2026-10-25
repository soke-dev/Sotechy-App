import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  CORS_ORIGINS: z.string().default("http://localhost:3000,http://localhost:3001,http://localhost:8081"),
  /** Comma-separated Google OAuth client IDs (iOS, Android, web) accepted for Google sign-in */
  GOOGLE_CLIENT_IDS: z.string().default(""),
  MONEYMOVES_API_URL: z.string().optional(),
  MONEYMOVES_SECRET_KEY: z.string().optional(),
  MONEYMOVES_WEBHOOK_SECRET: z.string().optional(),
  MONEYMOVES_CALLBACK_URL: z.string().optional(),
});

export const env = schema.parse(process.env);
export const corsOrigins = env.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean);
