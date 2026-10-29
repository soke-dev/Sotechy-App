ALTER TABLE "featured_purchases" ADD COLUMN "tier" text DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "pro_until" timestamp with time zone;