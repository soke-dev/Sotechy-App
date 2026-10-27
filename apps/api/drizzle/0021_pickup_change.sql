ALTER TABLE "orders" ADD COLUMN "pickup_change_point" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "pickup_change_status" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "pickup_change_at" timestamp with time zone;