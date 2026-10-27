CREATE TABLE "chain_ops" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "chain_ops_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"contract" text NOT NULL,
	"kind" text NOT NULL,
	"source_id" text NOT NULL,
	"data" jsonb NOT NULL,
	"ref" text NOT NULL,
	"monad_tx" text,
	"monad_at" timestamp with time zone,
	"monad_error" text,
	"monad_tries" integer DEFAULT 0 NOT NULL,
	"base_tx" text,
	"base_at" timestamp with time zone,
	"base_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chain_ops_contract_kind_sourceId_unique" UNIQUE("contract","kind","source_id")
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "receipts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"order_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"token_id" integer NOT NULL,
	"content" jsonb NOT NULL,
	"fingerprint" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "receipts_orderId_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "token_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_id" integer NOT NULL,
	"kind" text NOT NULL,
	"from_user_id" uuid,
	"to_user_id" uuid,
	"amount" integer NOT NULL,
	"reason" text NOT NULL,
	"order_id" uuid,
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "token_entries_orderId_reason_tokenId_unique" UNIQUE("order_id","reason","token_id"),
	CONSTRAINT "token_entries_amount_positive" CHECK ("token_entries"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "token_id" integer;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chain_ops_monad_at_index" ON "chain_ops" USING btree ("monad_at");--> statement-breakpoint
CREATE INDEX "chain_ops_base_at_index" ON "chain_ops" USING btree ("base_at");--> statement-breakpoint
CREATE INDEX "token_entries_to_user_id_created_at_index" ON "token_entries" USING btree ("to_user_id","created_at");--> statement-breakpoint
CREATE INDEX "token_entries_from_user_id_created_at_index" ON "token_entries" USING btree ("from_user_id","created_at");--> statement-breakpoint
CREATE INDEX "token_entries_token_id_index" ON "token_entries" USING btree ("token_id");--> statement-breakpoint
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_tokenId_unique" UNIQUE("token_id");