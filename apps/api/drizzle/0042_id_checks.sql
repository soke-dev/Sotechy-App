CREATE TYPE "public"."id_check_status" AS ENUM('in_review', 'approved', 'resubmit', 'declined');--> statement-breakpoint
CREATE TABLE "id_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"user_id" uuid,
	"id_type" text NOT NULL,
	"id_photo_id" uuid,
	"selfie_id" uuid,
	"video_id" uuid,
	"status" "id_check_status" DEFAULT 'in_review' NOT NULL,
	"redo_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"note" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "id_handoff_hash" text;--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "id_handoff_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "id_checks" ADD CONSTRAINT "id_checks_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "id_checks" ADD CONSTRAINT "id_checks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "id_checks" ADD CONSTRAINT "id_checks_id_photo_id_media_id_fk" FOREIGN KEY ("id_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "id_checks" ADD CONSTRAINT "id_checks_selfie_id_media_id_fk" FOREIGN KEY ("selfie_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "id_checks" ADD CONSTRAINT "id_checks_video_id_media_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "id_checks" ADD CONSTRAINT "id_checks_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "id_checks_status_created_at_index" ON "id_checks" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "id_checks_merchant_id_created_at_index" ON "id_checks" USING btree ("merchant_id","created_at");