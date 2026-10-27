CREATE TYPE "public"."kyc_status" AS ENUM('not_started', 'in_progress', 'in_review', 'approved', 'declined', 'resubmit', 'expired');--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "kyc_status" "kyc_status" DEFAULT 'not_started' NOT NULL;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "kyc_session_id" text;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "kyc_result" jsonb;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "kyc_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_kycSessionId_unique" UNIQUE("kyc_session_id");