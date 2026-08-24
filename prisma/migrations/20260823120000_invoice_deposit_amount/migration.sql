-- Optional deposit due now on invoices (satang). Null = pay full amount.
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "deposit_amount" INTEGER;
