-- Conversion-first quote payment plan, milestones, and booking statuses

-- CaseStatus
ALTER TYPE "CaseStatus" ADD VALUE IF NOT EXISTS 'custom_quote_required';
ALTER TYPE "CaseStatus" ADD VALUE IF NOT EXISTS 'awaiting_initial_payment';
ALTER TYPE "CaseStatus" ADD VALUE IF NOT EXISTS 'initial_payment_paid';
ALTER TYPE "CaseStatus" ADD VALUE IF NOT EXISTS 'milestone_due';
ALTER TYPE "CaseStatus" ADD VALUE IF NOT EXISTS 'refund_pending';
ALTER TYPE "CaseStatus" ADD VALUE IF NOT EXISTS 'refunded';

-- QuoteStatus
ALTER TYPE "QuoteStatus" ADD VALUE IF NOT EXISTS 'custom_quote_required';

-- InvoiceKind
DO $$ BEGIN
  CREATE TYPE "InvoiceKind" AS ENUM ('full', 'initial', 'milestone', 'balance');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentMilestoneStatus" AS ENUM ('pending', 'due', 'paid', 'waived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "payment_config" JSONB;

ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "payment_plan" JSONB;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "pricing_snapshot" JSONB;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "pricing_version" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "complexity" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "ai_confidence" DOUBLE PRECISION;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "requires_human_review" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "payment_reason" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "payment_model" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "initial_percentage" INTEGER;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "initial_payment_total" INTEGER;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "remaining_balance" INTEGER;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "required_upfront_costs" INTEGER;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "payment_choice" TEXT;

ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "kind" "InvoiceKind" NOT NULL DEFAULT 'full';
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "milestone_id" TEXT;

ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "kind" "InvoiceKind" NOT NULL DEFAULT 'full';
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "idempotency_key" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "webhook_event_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_idempotency_key_key" ON "Payment"("idempotency_key");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_webhook_event_id_key" ON "Payment"("webhook_event_id");

CREATE TABLE IF NOT EXISTS "payment_milestones" (
  "id" TEXT NOT NULL,
  "quote_id" TEXT NOT NULL,
  "case_id" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "amount" INTEGER NOT NULL,
  "percentage" INTEGER NOT NULL,
  "status" "PaymentMilestoneStatus" NOT NULL DEFAULT 'pending',
  "due_condition" TEXT,
  "due_date" TIMESTAMP(3),
  "paid_at" TIMESTAMP(3),
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payment_milestones_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "payment_milestones_quote_id_idx" ON "payment_milestones"("quote_id");
CREATE INDEX IF NOT EXISTS "payment_milestones_case_id_idx" ON "payment_milestones"("case_id");

DO $$ BEGIN
  ALTER TABLE "payment_milestones" ADD CONSTRAINT "payment_milestones_quote_id_fkey"
    FOREIGN KEY ("quote_id") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "payment_milestones" ADD CONSTRAINT "payment_milestones_case_id_fkey"
    FOREIGN KEY ("case_id") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "invoices" ADD CONSTRAINT "invoices_milestone_id_fkey"
    FOREIGN KEY ("milestone_id") REFERENCES "payment_milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "processed_webhook_events" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'stripe',
  "type" TEXT NOT NULL,
  "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "processed_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "processed_webhook_events_provider_type_idx" ON "processed_webhook_events"("provider", "type");
