ALTER TABLE "merchants" ADD COLUMN "token_approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "token_contract" text;--> statement-breakpoint
-- Stores approved before tokens had their own approval keep their ticker
UPDATE "merchants" SET "token_approved_at" = now() WHERE "status" = 'approved';
