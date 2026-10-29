ALTER TABLE "merchants" ADD COLUMN "profile_change" jsonb;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "profile_change_status" text;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "profile_change_note" text;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "profile_change_at" timestamp with time zone;