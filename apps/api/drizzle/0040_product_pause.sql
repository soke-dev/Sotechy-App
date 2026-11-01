ALTER TABLE "products" ADD COLUMN "paused_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "pause_note" text;