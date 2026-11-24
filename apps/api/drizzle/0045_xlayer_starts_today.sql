-- X Layer as a main chain starts on 24 November 2026 (Lagos time): token changes and receipts from before then stay on
-- the chains that already have them and aren't written to X Layer. Store tokens are still created there.
UPDATE "chain_ops" SET "xlayer_tx" = 'n/a', "xlayer_at" = now()
WHERE "xlayer_at" IS NULL AND "kind" <> 'register' AND "created_at" < '2026-11-24 00:00:00+01';
