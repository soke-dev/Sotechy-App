ALTER TABLE "users" ADD COLUMN "wallet_address" text;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_walletAddress_unique" UNIQUE("wallet_address");