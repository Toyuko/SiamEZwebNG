-- Additive legacy source identifiers for idempotent siam-ez.com → SiamEZwebNG import.
-- Nullable unique columns: multiple NULLs are allowed in PostgreSQL.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "legacy_customer_id" INTEGER;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "legacy_staff_id" INTEGER;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS "User_legacy_customer_id_key" ON "User"("legacy_customer_id");
CREATE UNIQUE INDEX IF NOT EXISTS "User_legacy_staff_id_key" ON "User"("legacy_staff_id");

ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "legacy_job_id" INTEGER;
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "legacy_order_number" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Case_legacy_job_id_key" ON "Case"("legacy_job_id");
CREATE UNIQUE INDEX IF NOT EXISTS "Case_legacy_order_number_key" ON "Case"("legacy_order_number");

ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "legacy_order_id" INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_legacy_order_id_key" ON "invoices"("legacy_order_id");

ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "legacy_order_id" INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_legacy_order_id_key" ON "Payment"("legacy_order_id");

CREATE TABLE IF NOT EXISTS "legacy_id_map" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "legacy_id" TEXT NOT NULL,
    "new_id" TEXT NOT NULL,
    "extra" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legacy_id_map_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "legacy_id_map_entity_type_legacy_id_key" ON "legacy_id_map"("entity_type", "legacy_id");
CREATE INDEX IF NOT EXISTS "legacy_id_map_new_id_idx" ON "legacy_id_map"("new_id");
