-- Optional receipt number for money already received. Existing payments stay without one.
-- Idempotent: production already had this column before the migration was recorded.

ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "receipt_number" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_receipt_number_key" ON "Payment"("receipt_number");
