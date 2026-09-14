-- Financial Management System
-- Additive only: no destructive changes to existing Payment/Invoice/Case data.

CREATE TYPE "FinancialTransactionType" AS ENUM (
  'REVENUE',
  'OPERATING_EXPENSE',
  'STAFF_PAYMENT',
  'CASE_EXPENSE',
  'REFUND',
  'OTHER_INCOME',
  'OTHER_EXPENSE'
);

CREATE TYPE "FinancialPaymentStatus" AS ENUM (
  'UNPAID',
  'APPROVED',
  'PAID',
  'CANCELLED'
);

CREATE TYPE "FinancialPaymentMethod" AS ENUM (
  'cash',
  'bank',
  'qr',
  'credit_card',
  'debit_card',
  'stripe',
  'wise',
  'other'
);

CREATE TABLE "financial_transactions" (
  "id" TEXT NOT NULL,
  "case_id" TEXT,
  "client_id" TEXT,
  "staff_id" TEXT,
  "service_id" TEXT,
  "type" "FinancialTransactionType" NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'THB',
  "original_amount" INTEGER,
  "original_currency" TEXT,
  "exchange_rate" DECIMAL(18,8),
  "converted_thb_amount" INTEGER,
  "transaction_date" TIMESTAMP(3) NOT NULL,
  "due_date" TIMESTAMP(3),
  "payment_status" "FinancialPaymentStatus" NOT NULL DEFAULT 'UNPAID',
  "payment_method" "FinancialPaymentMethod",
  "reference" TEXT,
  "vendor" TEXT,
  "notes" TEXT,
  "receipt_document_id" TEXT,
  "is_recurring" BOOLEAN NOT NULL DEFAULT false,
  "related_payment_id" TEXT,
  "created_by_id" TEXT,
  "cancelled_at" TIMESTAMP(3),
  "cancelled_by_id" TEXT,
  "paid_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "financial_transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "financial_audit_logs" (
  "id" TEXT NOT NULL,
  "transaction_id" TEXT,
  "action" TEXT NOT NULL,
  "actor_id" TEXT,
  "old_values" JSONB,
  "new_values" JSONB,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "financial_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "financial_transactions_receipt_document_id_key" ON "financial_transactions"("receipt_document_id");
CREATE INDEX "financial_transactions_type_payment_status_transaction_date_idx" ON "financial_transactions"("type", "payment_status", "transaction_date");
CREATE INDEX "financial_transactions_case_id_type_payment_status_idx" ON "financial_transactions"("case_id", "type", "payment_status");
CREATE INDEX "financial_transactions_staff_id_payment_status_transaction_date_idx" ON "financial_transactions"("staff_id", "payment_status", "transaction_date");
CREATE INDEX "financial_transactions_service_id_transaction_date_idx" ON "financial_transactions"("service_id", "transaction_date");
CREATE INDEX "financial_transactions_client_id_payment_status_idx" ON "financial_transactions"("client_id", "payment_status");
CREATE INDEX "financial_transactions_transaction_date_idx" ON "financial_transactions"("transaction_date");

CREATE INDEX "financial_audit_logs_transaction_id_created_at_idx" ON "financial_audit_logs"("transaction_id", "created_at");
CREATE INDEX "financial_audit_logs_actor_id_created_at_idx" ON "financial_audit_logs"("actor_id", "created_at");

ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_cancelled_by_id_fkey" FOREIGN KEY ("cancelled_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_receipt_document_id_fkey" FOREIGN KEY ("receipt_document_id") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "financial_audit_logs" ADD CONSTRAINT "financial_audit_logs_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "financial_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "financial_audit_logs" ADD CONSTRAINT "financial_audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
