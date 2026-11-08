ALTER TABLE "chain_ops" ADD COLUMN "near_tx" text;--> statement-breakpoint
ALTER TABLE "chain_ops" ADD COLUMN "near_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chain_ops" ADD COLUMN "near_error" text;--> statement-breakpoint
ALTER TABLE "chain_ops" ADD COLUMN "near_tries" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "chain_ops_near_at_index" ON "chain_ops" USING btree ("near_at");