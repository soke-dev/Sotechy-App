ALTER TABLE "branches" ADD COLUMN "map_url" text;
--> statement-breakpoint
UPDATE "branches" SET "address" = 'No 20A Etete Road, GRA', "city" = 'Benin City', "state" = 'Edo', "map_url" = 'https://www.google.com/maps/place/SoTechy/@6.2997079,5.6226397,17z/data=!3m1!4b1!4m6!3m5!1s0x1040d3e752724101:0x3f45bb7b391a3a62!8m2!3d6.2997079!4d5.6252146!16s%2Fg%2F11jzkvfxss' WHERE "merchant_id" IS NULL AND ("code" = 'BEN-01' OR "address" ILIKE '%etete%');
