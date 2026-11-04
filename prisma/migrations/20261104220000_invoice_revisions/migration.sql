-- Approved invoice changes. Issued invoices stay unchanged; a revision row records the proposal.

CREATE TABLE "invoice_revisions" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "previous_amount" INTEGER NOT NULL,
    "proposed_amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "applied" BOOLEAN NOT NULL,
    "replacement_invoice_id" TEXT,
    "staff_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invoice_revisions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "invoice_revisions_invoice_id_created_at_idx" ON "invoice_revisions"("invoice_id", "created_at");

ALTER TABLE "invoice_revisions" ADD CONSTRAINT "invoice_revisions_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
