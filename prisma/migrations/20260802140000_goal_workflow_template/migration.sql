-- Add optional workflow template link on goals (Platform 2.0 goal ↔ workflow bind)
ALTER TABLE "goals" ADD COLUMN "workflow_template_id" TEXT;

CREATE INDEX "goals_workflow_template_id_idx" ON "goals"("workflow_template_id");

ALTER TABLE "goals" ADD CONSTRAINT "goals_workflow_template_id_fkey" FOREIGN KEY ("workflow_template_id") REFERENCES "workflow_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
