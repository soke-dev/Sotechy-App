ALTER TABLE "merchant_payouts" ADD COLUMN "provider" text;--> statement-breakpoint
ALTER TABLE "merchant_payouts" ADD COLUMN "transfer_id" text;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "payout_recipient_id" text;