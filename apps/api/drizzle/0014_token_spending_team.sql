CREATE TABLE "merchant_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"user_id" uuid,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"invite_hash" text,
	"invited_by" uuid,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "merchant_members_userId_unique" UNIQUE("user_id"),
	CONSTRAINT "merchant_members_inviteHash_unique" UNIQUE("invite_hash"),
	CONSTRAINT "merchant_members_merchantId_email_unique" UNIQUE("merchant_id","email")
);
--> statement-breakpoint
CREATE TABLE "reserve_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"order_id" uuid,
	"walk_in_id" uuid,
	"note" text,
	"source_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reserve_entries_sourceKey_unique" UNIQUE("source_key")
);
--> statement-breakpoint
CREATE TABLE "walk_in_sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"fee" numeric(14, 2) NOT NULL,
	"note" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"checkout_id" text,
	"paid_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "token_entries" DROP CONSTRAINT "token_entries_orderId_reason_tokenId_unique";--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tokens_value" numeric(14, 2) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tokens_used" jsonb;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD COLUMN "photos" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "token_entries" ADD COLUMN "source_key" text;--> statement-breakpoint
UPDATE "token_entries" SET "source_key" = CASE
  WHEN "reason" = 'earned' AND "order_id" IS NOT NULL THEN 'earn:' || "order_id" || ':' || "token_id"
  WHEN "reason" = 'bonus' AND "order_id" IS NOT NULL THEN 'bonus:' || "order_id"
  WHEN "reason" = 'refunded' THEN 'refund:' || "id"
  ELSE NULL END;--> statement-breakpoint
ALTER TABLE "merchant_members" ADD CONSTRAINT "merchant_members_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_members" ADD CONSTRAINT "merchant_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "walk_in_sales" ADD CONSTRAINT "walk_in_sales_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "walk_in_sales" ADD CONSTRAINT "walk_in_sales_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reserve_entries_created_at_index" ON "reserve_entries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "walk_in_sales_merchant_id_created_at_index" ON "walk_in_sales" USING btree ("merchant_id","created_at");--> statement-breakpoint
CREATE INDEX "token_entries_order_id_index" ON "token_entries" USING btree ("order_id");--> statement-breakpoint
ALTER TABLE "token_entries" ADD CONSTRAINT "token_entries_sourceKey_unique" UNIQUE("source_key");