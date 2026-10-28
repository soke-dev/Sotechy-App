ALTER TABLE "merchant_payouts" ADD COLUMN "payback_claimed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "merchant_payouts" ADD COLUMN "payback_reference" text;--> statement-breakpoint
UPDATE "app_settings" SET "value" = jsonb_set("value"::jsonb, '{maxStores}', '10') WHERE "key" = 'featuring';