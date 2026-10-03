-- Sales attribution: who closed the deal, separate from service staff.
-- Existing rows stay unassigned (sales_person_id and closed_at remain null).

ALTER TABLE "Case" ADD COLUMN "sales_person_id" TEXT;
ALTER TABLE "Case" ADD COLUMN "closed_at" TIMESTAMP(3);
ALTER TABLE "Case" ADD COLUMN "deal_value" INTEGER;
ALTER TABLE "Case" ADD COLUMN "sales_notes" TEXT;

ALTER TABLE "Quote" ADD COLUMN "sales_person_id" TEXT;

CREATE INDEX "Case_sales_person_id_closed_at_idx" ON "Case"("sales_person_id", "closed_at");
CREATE INDEX "Case_closed_at_idx" ON "Case"("closed_at");
CREATE INDEX "Quote_sales_person_id_idx" ON "Quote"("sales_person_id");

ALTER TABLE "Case" ADD CONSTRAINT "Case_sales_person_id_fkey"
  FOREIGN KEY ("sales_person_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Quote" ADD CONSTRAINT "Quote_sales_person_id_fkey"
  FOREIGN KEY ("sales_person_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TYPE "SalesCommissionType" AS ENUM (
  'none',
  'fixed',
  'percent_of_deal',
  'percent_of_collected',
  'custom'
);

CREATE TYPE "SalesCommissionStatus" AS ENUM (
  'pending',
  'approved',
  'paid',
  'cancelled'
);

CREATE TYPE "SalesTargetPeriod" AS ENUM (
  'monthly',
  'quarterly',
  'annual'
);

CREATE TABLE "sales_commissions" (
  "id" TEXT NOT NULL,
  "case_id" TEXT NOT NULL,
  "sales_person_id" TEXT NOT NULL,
  "commission_type" "SalesCommissionType" NOT NULL,
  "rate_percent" DECIMAL(8,4),
  "amount" INTEGER NOT NULL,
  "status" "SalesCommissionStatus" NOT NULL DEFAULT 'pending',
  "paid_at" TIMESTAMP(3),
  "notes" TEXT,
  "financial_transaction_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sales_commissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sales_commissions_case_id_key" ON "sales_commissions"("case_id");
CREATE UNIQUE INDEX "sales_commissions_financial_transaction_id_key" ON "sales_commissions"("financial_transaction_id");
CREATE INDEX "sales_commissions_sales_person_id_status_idx" ON "sales_commissions"("sales_person_id", "status");
CREATE INDEX "sales_commissions_case_id_idx" ON "sales_commissions"("case_id");

CREATE TABLE "sales_attribution_audits" (
  "id" TEXT NOT NULL,
  "case_id" TEXT NOT NULL,
  "previous_sales_person_id" TEXT,
  "new_sales_person_id" TEXT,
  "changed_by_id" TEXT,
  "reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sales_attribution_audits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sales_attribution_audits_case_id_created_at_idx" ON "sales_attribution_audits"("case_id", "created_at");

CREATE TABLE "sales_targets" (
  "id" TEXT NOT NULL,
  "sales_person_id" TEXT NOT NULL,
  "period" "SalesTargetPeriod" NOT NULL,
  "period_key" TEXT NOT NULL,
  "target_amount" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sales_targets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sales_targets_sales_person_id_period_period_key_key"
  ON "sales_targets"("sales_person_id", "period", "period_key");
CREATE INDEX "sales_targets_sales_person_id_idx" ON "sales_targets"("sales_person_id");

ALTER TABLE "sales_commissions" ADD CONSTRAINT "sales_commissions_case_id_fkey"
  FOREIGN KEY ("case_id") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sales_commissions" ADD CONSTRAINT "sales_commissions_sales_person_id_fkey"
  FOREIGN KEY ("sales_person_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sales_commissions" ADD CONSTRAINT "sales_commissions_financial_transaction_id_fkey"
  FOREIGN KEY ("financial_transaction_id") REFERENCES "financial_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sales_attribution_audits" ADD CONSTRAINT "sales_attribution_audits_case_id_fkey"
  FOREIGN KEY ("case_id") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sales_attribution_audits" ADD CONSTRAINT "sales_attribution_audits_previous_sales_person_id_fkey"
  FOREIGN KEY ("previous_sales_person_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sales_attribution_audits" ADD CONSTRAINT "sales_attribution_audits_new_sales_person_id_fkey"
  FOREIGN KEY ("new_sales_person_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sales_attribution_audits" ADD CONSTRAINT "sales_attribution_audits_changed_by_id_fkey"
  FOREIGN KEY ("changed_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sales_targets" ADD CONSTRAINT "sales_targets_sales_person_id_fkey"
  FOREIGN KEY ("sales_person_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
