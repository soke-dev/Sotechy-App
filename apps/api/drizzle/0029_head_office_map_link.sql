-- Sotechy's head office: its Google Maps share link
UPDATE "branches" SET "map_url" = 'https://maps.app.goo.gl/ZkE75Azzh7pfPHKy5' WHERE "merchant_id" IS NULL AND ("code" = 'BEN-01' OR "address" ILIKE '%etete%');
