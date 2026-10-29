-- Featured and Pro now run side by side. Pro payments made before this were added after the store's Featured
-- months instead; bring them back to Pro's own end, with their banners, and the store's featured end with them.
UPDATE "featured_purchases" fp SET "until" = m."pro_until"
FROM "merchants" m
WHERE fp."merchant_id" = m."id" AND fp."tier" = 'pro' AND fp."status" = 'paid' AND m."pro_until" IS NOT NULL AND fp."until" > m."pro_until";--> statement-breakpoint
UPDATE "banners" b SET "ends_at" = fp."until"
FROM "featured_purchases" fp
WHERE b."featured_purchase_id" = fp."id" AND fp."tier" = 'pro' AND b."ends_at" > fp."until";--> statement-breakpoint
UPDATE "merchants" m SET "featured_until" = GREATEST(
  m."pro_until",
  (SELECT max(s."until") FROM "featured_purchases" s WHERE s."merchant_id" = m."id" AND s."status" = 'paid' AND s."tier" = 'standard')
)
WHERE EXISTS (SELECT 1 FROM "featured_purchases" p WHERE p."merchant_id" = m."id" AND p."tier" = 'pro' AND p."status" = 'paid')
  AND m."featured_until" > GREATEST(
    m."pro_until",
    (SELECT max(s."until") FROM "featured_purchases" s WHERE s."merchant_id" = m."id" AND s."status" = 'paid' AND s."tier" = 'standard')
  );
