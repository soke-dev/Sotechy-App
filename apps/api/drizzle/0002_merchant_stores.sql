CREATE TYPE "public"."seller_kind" AS ENUM('registered', 'individual');--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "ticker" text NOT NULL;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "seller_kind" "seller_kind" DEFAULT 'registered' NOT NULL;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "contact_whatsapp" text;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_slug_unique" UNIQUE("slug");--> statement-breakpoint
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_ticker_unique" UNIQUE("ticker");--> statement-breakpoint
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_ownerId_unique" UNIQUE("owner_id");