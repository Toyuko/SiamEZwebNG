-- Analytics indexes + saved reports / dashboard prefs

CREATE INDEX "Payment_status_approved_at_idx" ON "Payment"("status", "approved_at");
CREATE INDEX "Payment_status_submitted_at_idx" ON "Payment"("status", "submitted_at");
CREATE INDEX "Payment_case_id_status_idx" ON "Payment"("case_id", "status");
CREATE INDEX "Payment_method_status_idx" ON "Payment"("method", "status");

CREATE INDEX "financial_transactions_category_type_transaction_date_idx" ON "financial_transactions"("category", "type", "transaction_date");
CREATE INDEX "financial_transactions_payment_method_transaction_date_idx" ON "financial_transactions"("payment_method", "transaction_date");

CREATE TABLE "saved_financial_reports" (
  "id" TEXT NOT NULL,
  "owner_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "config" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "saved_financial_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "financial_dashboard_preferences" (
  "id" TEXT NOT NULL,
  "owner_id" TEXT NOT NULL,
  "preferences" JSONB NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "financial_dashboard_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "financial_dashboard_preferences_owner_id_key" ON "financial_dashboard_preferences"("owner_id");
CREATE INDEX "saved_financial_reports_owner_id_updated_at_idx" ON "saved_financial_reports"("owner_id", "updated_at");

ALTER TABLE "saved_financial_reports" ADD CONSTRAINT "saved_financial_reports_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "financial_dashboard_preferences" ADD CONSTRAINT "financial_dashboard_preferences_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
