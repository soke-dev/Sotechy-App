CREATE TABLE "payout_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"bank_code" text NOT NULL,
	"bank_name" text NOT NULL,
	"account_number" text NOT NULL,
	"account_name" text NOT NULL,
	"match" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payout_accounts_merchantId_bankCode_accountNumber_unique" UNIQUE("merchant_id","bank_code","account_number")
);
--> statement-breakpoint
ALTER TABLE "payout_accounts" ADD CONSTRAINT "payout_accounts_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payout_accounts_merchant_id_index" ON "payout_accounts" USING btree ("merchant_id");--> statement-breakpoint
INSERT INTO "payout_accounts" ("merchant_id", "bank_code", "bank_name", "account_number", "account_name", "match", "is_default", "verified_at")
SELECT "id", "payout_bank_code", "payout_bank_name", "payout_account_number", "payout_account_name", "payout_account_match", true, "payout_verified_at"
FROM "merchants"
WHERE "payout_bank_code" IS NOT NULL AND "payout_account_number" IS NOT NULL AND "payout_account_name" IS NOT NULL AND "payout_verified_at" IS NOT NULL;
