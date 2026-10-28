ALTER TABLE "promotions" ADD COLUMN "merchant_id" uuid;--> statement-breakpoint
ALTER TABLE "support_messages" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;