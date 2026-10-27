CREATE TABLE "store_favourites" (
	"user_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "store_favourites_user_id_merchant_id_pk" PRIMARY KEY("user_id","merchant_id")
);
--> statement-breakpoint
ALTER TABLE "store_favourites" ADD CONSTRAINT "store_favourites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_favourites" ADD CONSTRAINT "store_favourites_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "store_favourites_merchant_id_index" ON "store_favourites" USING btree ("merchant_id");