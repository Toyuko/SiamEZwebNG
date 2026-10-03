-- Optional receipt number for money already received. Existing payments stay without one.

ALTER TABLE "Payment" ADD COLUMN "receipt_number" TEXT;
CREATE UNIQUE INDEX "Payment_receipt_number_key" ON "Payment"("receipt_number");
