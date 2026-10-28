CREATE TYPE "public"."banner_layout" AS ENUM('art', 'image');--> statement-breakpoint
ALTER TYPE "public"."banner_link" ADD VALUE 'store';--> statement-breakpoint
ALTER TYPE "public"."banner_link" ADD VALUE 'stores';--> statement-breakpoint
ALTER TYPE "public"."banner_link" ADD VALUE 'wallet';--> statement-breakpoint
ALTER TABLE "banners" ALTER COLUMN "title" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "banners" ALTER COLUMN "cta_label" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "banners" ALTER COLUMN "cta_label" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "layout" "banner_layout" DEFAULT 'art' NOT NULL;--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "merchant_id" uuid;--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "featured_purchase_id" uuid;--> statement-breakpoint
ALTER TABLE "banners" ADD CONSTRAINT "banners_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "banners" ADD CONSTRAINT "banners_featured_purchase_id_featured_purchases_id_fk" FOREIGN KEY ("featured_purchase_id") REFERENCES "public"."featured_purchases"("id") ON DELETE set null ON UPDATE no action;