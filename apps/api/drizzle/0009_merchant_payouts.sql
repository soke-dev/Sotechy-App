CREATE TYPE "public"."payout_stage" AS ENUM('first', 'final', 'payback');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('scheduled', 'sending', 'paid', 'failed', 'held', 'cancelled', 'owed', 'settled');--> statement-breakpoint
CREATE TABLE "merchant_payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"stage" "payout_stage" NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"fee" numeric(14, 2) DEFAULT 0 NOT NULL,
	"status" "payout_status" DEFAULT 'scheduled' NOT NULL,
	"due_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reference" text NOT NULL,
	"provider_id" text,
	"bank_code" text,
	"bank_name" text,
	"account_number" text,
	"account_name" text,
	"failure_reason" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"sent_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "merchant_payouts_reference_unique" UNIQUE("reference"),
	CONSTRAINT "merchant_payouts_orderId_stage_unique" UNIQUE("order_id","stage")
);
--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "payout_bank_code" text;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "payout_bank_name" text;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "payout_account_number" text;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "payout_account_name" text;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "payout_account_match" text;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "payout_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "payout_plan" jsonb;--> statement-breakpoint
ALTER TABLE "merchant_payouts" ADD CONSTRAINT "merchant_payouts_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_payouts" ADD CONSTRAINT "merchant_payouts_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "merchant_payouts_status_due_at_index" ON "merchant_payouts" USING btree ("status","due_at");--> statement-breakpoint
CREATE INDEX "merchant_payouts_merchant_id_created_at_index" ON "merchant_payouts" USING btree ("merchant_id","created_at");