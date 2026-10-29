CREATE TABLE "popups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"layout" "banner_layout" DEFAULT 'art' NOT NULL,
	"style" "banner_style" DEFAULT 'orange' NOT NULL,
	"title" text,
	"body" text,
	"image_url" text,
	"cta_label" text DEFAULT 'Take a look' NOT NULL,
	"link_type" "banner_link" DEFAULT 'none' NOT NULL,
	"link_value" text,
	"dismiss_label" text,
	"show_once" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
