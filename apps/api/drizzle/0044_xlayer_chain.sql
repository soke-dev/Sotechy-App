ALTER TABLE "chain_ops" ADD COLUMN "xlayer_tx" text;--> statement-breakpoint
ALTER TABLE "chain_ops" ADD COLUMN "xlayer_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chain_ops" ADD COLUMN "xlayer_error" text;--> statement-breakpoint
ALTER TABLE "chain_ops" ADD COLUMN "xlayer_tries" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "chain_ops_xlayer_at_index" ON "chain_ops" USING btree ("xlayer_at");