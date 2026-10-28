ALTER TYPE "public"."merchant_status" ADD VALUE 'declined';--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "review_note" text;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "review_note_at" timestamp with time zone;