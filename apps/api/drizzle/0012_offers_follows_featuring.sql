CREATE TYPE "public"."offer_status" AS ENUM('waiting_store', 'waiting_customer', 'agreed', 'declined', 'expired', 'used');--> statement-breakpoint
CREATE TABLE "featured_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"months" integer NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"checkout_id" text,
	"until" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offer_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" uuid NOT NULL,
	"from" text NOT NULL,
	"kind" text NOT NULL,
	"amount" numeric(14, 2),
	"text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"status" "offer_status" DEFAULT 'waiting_store' NOT NULL,
	"list_price" numeric(14, 2) NOT NULL,
	"last_amount" numeric(14, 2) NOT NULL,
	"agreed_price" numeric(14, 2),
	"agreed_until" timestamp with time zone,
	"order_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_follows" (
	"user_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "store_follows_user_id_merchant_id_pk" PRIMARY KEY("user_id","merchant_id")
);
--> statement-breakpoint
CREATE TABLE "store_notices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"product_id" uuid,
	"sent_to" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_reviews" ADD COLUMN "store_reply" text;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD COLUMN "store_replied_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "featured_purchases" ADD CONSTRAINT "featured_purchases_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_messages" ADD CONSTRAINT "offer_messages_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_follows" ADD CONSTRAINT "store_follows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_follows" ADD CONSTRAINT "store_follows_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_notices" ADD CONSTRAINT "store_notices_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_notices" ADD CONSTRAINT "store_notices_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "featured_purchases_merchant_id_created_at_index" ON "featured_purchases" USING btree ("merchant_id","created_at");--> statement-breakpoint
CREATE INDEX "offer_messages_offer_id_created_at_index" ON "offer_messages" USING btree ("offer_id","created_at");--> statement-breakpoint
CREATE INDEX "offers_merchant_id_updated_at_index" ON "offers" USING btree ("merchant_id","updated_at");--> statement-breakpoint
CREATE INDEX "offers_customer_id_updated_at_index" ON "offers" USING btree ("customer_id","updated_at");--> statement-breakpoint
CREATE INDEX "store_follows_merchant_id_index" ON "store_follows" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "store_notices_merchant_id_created_at_index" ON "store_notices" USING btree ("merchant_id","created_at");