-- Performance indexes for admin lists, search, dashboard counts, and detail pages.
-- CONCURRENTLY cannot run inside a Prisma migration transaction; use plain CREATE INDEX IF NOT EXISTS.

-- User (role-scoped client/staff lists + search)
CREATE INDEX IF NOT EXISTS "User_role_created_at_idx" ON "User"("role", "created_at");
CREATE INDEX IF NOT EXISTS "User_role_updated_at_idx" ON "User"("role", "updated_at");
CREATE INDEX IF NOT EXISTS "User_phone_idx" ON "User"("phone");
CREATE INDEX IF NOT EXISTS "User_active_role_idx" ON "User"("active", "role");

-- Case (work center, dashboard, calendar, client history)
CREATE INDEX IF NOT EXISTS "Case_created_at_idx" ON "Case"("created_at");
CREATE INDEX IF NOT EXISTS "Case_updated_at_idx" ON "Case"("updated_at");
CREATE INDEX IF NOT EXISTS "Case_user_id_created_at_idx" ON "Case"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "Case_service_id_status_idx" ON "Case"("service_id", "status");
CREATE INDEX IF NOT EXISTS "Case_status_created_at_idx" ON "Case"("status", "created_at");
CREATE INDEX IF NOT EXISTS "Case_status_updated_at_idx" ON "Case"("status", "updated_at");
CREATE INDEX IF NOT EXISTS "Case_show_on_calendar_scheduled_at_idx" ON "Case"("show_on_calendar", "scheduled_at");

-- Invoice (AR, overdue, financials, admin search)
CREATE INDEX IF NOT EXISTS "invoices_status_due_date_idx" ON "invoices"("status", "due_date");
CREATE INDEX IF NOT EXISTS "invoices_status_created_at_idx" ON "invoices"("status", "created_at");
CREATE INDEX IF NOT EXISTS "invoices_case_id_status_idx" ON "invoices"("case_id", "status");
CREATE INDEX IF NOT EXISTS "invoices_user_id_idx" ON "invoices"("user_id");
CREATE INDEX IF NOT EXISTS "invoices_created_at_idx" ON "invoices"("created_at");

-- Payment (invoice outstanding calculations)
CREATE INDEX IF NOT EXISTS "Payment_invoice_id_status_idx" ON "Payment"("invoice_id", "status");

-- Document / notes / staff assignment (case detail + missing-doc scans)
CREATE INDEX IF NOT EXISTS "Document_case_id_created_at_idx" ON "Document"("case_id", "created_at");
CREATE INDEX IF NOT EXISTS "Document_created_at_idx" ON "Document"("created_at");
CREATE INDEX IF NOT EXISTS "Document_uploaded_by_idx" ON "Document"("uploaded_by");
CREATE INDEX IF NOT EXISTS "case_notes_case_id_created_at_idx" ON "case_notes"("case_id", "created_at");
CREATE INDEX IF NOT EXISTS "case_notes_user_id_idx" ON "case_notes"("user_id");
CREATE INDEX IF NOT EXISTS "staff_assignments_user_id_idx" ON "staff_assignments"("user_id");
