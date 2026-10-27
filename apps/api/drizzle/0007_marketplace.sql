CREATE TYPE "public"."zone_review" AS ENUM('pending', 'approved', 'declined');--> statement-breakpoint
CREATE TABLE "delivery_zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"state" text NOT NULL,
	"areas" text[] DEFAULT '{}'::text[] NOT NULL,
	"home_fee" numeric(14, 2) NOT NULL,
	"pickup_fee" numeric(14, 2),
	"pickup_point" text,
	"days" text NOT NULL,
	"free_over" numeric(14, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"review" "zone_review" DEFAULT 'pending' NOT NULL,
	"review_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "merchant_id" uuid;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "is_private" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "tagline" text;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "cover_url" text;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "storefront" jsonb;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "sells" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "application" jsonb;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "featured_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_hidden" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "store_category" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "negotiable" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "offer_floor" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "offer_hours" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "delivery_zone_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL;--> statement-breakpoint
ALTER TABLE "delivery_zones" ADD CONSTRAINT "delivery_zones_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;