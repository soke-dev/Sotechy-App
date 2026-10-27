ALTER TABLE "orders" ADD COLUMN "customer_issue_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "customer_issue_note" text;