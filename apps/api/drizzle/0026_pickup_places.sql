ALTER TABLE "delivery_zones" ADD COLUMN "pickup_places" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "pickup_spot" text;--> statement-breakpoint
UPDATE "delivery_zones" SET "pickup_places" = jsonb_build_array(jsonb_build_object('name', "pickup_point", 'address', coalesce("pickup_address", ''))) WHERE "pickup_point" IS NOT NULL;