ALTER TYPE "public"."refund_status" ADD VALUE 'needs_info';--> statement-breakpoint
ALTER TABLE "refunds" ADD COLUMN "info_needed" text;--> statement-breakpoint
ALTER TABLE "refunds" ADD COLUMN "info_message" text;--> statement-breakpoint
ALTER TABLE "refunds" ADD COLUMN "customer_details" jsonb;--> statement-breakpoint
ALTER TABLE "refunds" ADD COLUMN "customer_replied_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "refunds" ADD COLUMN "method" text;--> statement-breakpoint
ALTER TABLE "refunds" ADD COLUMN "reference" text;--> statement-breakpoint
ALTER TABLE "refunds" ADD COLUMN "tx_hash" text;--> statement-breakpoint
ALTER TABLE "refunds" ADD COLUMN "crypto_asset" text;--> statement-breakpoint
ALTER TABLE "refunds" ADD COLUMN "network" text;--> statement-breakpoint
ALTER TABLE "refunds" ADD COLUMN "note" text;