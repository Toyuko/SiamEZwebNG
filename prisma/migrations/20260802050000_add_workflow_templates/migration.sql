-- Platform Wave M7: Universal Workflow templates.
-- Additive only — does not alter sales_vehicles / sales_properties source columns.
-- Prefer `npx prisma db push` locally if older migrations fail; this folder documents the schema delta.

CREATE TYPE "WorkflowRunStatus" AS ENUM ('active', 'completed', 'cancelled', 'rejected');
CREATE TYPE "WorkflowStepRunStatus" AS ENUM ('pending', 'in_progress', 'awaiting_approval', 'approved', 'rejected', 'completed', 'skipped');
CREATE TYPE "WorkflowStepKind" AS ENUM ('info', 'action', 'booking', 'approval');

CREATE TABLE "workflow_templates" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "title_th" TEXT,
    "description_en" TEXT,
    "description_th" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workflow_templates_key_key" ON "workflow_templates"("key");
CREATE INDEX "workflow_templates_active_sort_order_idx" ON "workflow_templates"("active", "sort_order");

CREATE TABLE "workflow_template_steps" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "key" TEXT,
    "title_en" TEXT NOT NULL,
    "title_th" TEXT,
    "description_en" TEXT,
    "description_th" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "kind" "WorkflowStepKind" NOT NULL DEFAULT 'action',
    "requires_approval" BOOLEAN NOT NULL DEFAULT false,
    "target" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_template_steps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "workflow_template_steps_template_id_sort_order_idx"
  ON "workflow_template_steps"("template_id", "sort_order");

ALTER TABLE "workflow_template_steps"
  ADD CONSTRAINT "workflow_template_steps_template_id_fkey"
  FOREIGN KEY ("template_id") REFERENCES "workflow_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "workflow_runs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "status" "WorkflowRunStatus" NOT NULL DEFAULT 'active',
    "linked_case_id" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "workflow_runs_user_id_status_idx" ON "workflow_runs"("user_id", "status");
CREATE INDEX "workflow_runs_template_id_idx" ON "workflow_runs"("template_id");
CREATE INDEX "workflow_runs_linked_case_id_idx" ON "workflow_runs"("linked_case_id");

ALTER TABLE "workflow_runs"
  ADD CONSTRAINT "workflow_runs_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workflow_runs"
  ADD CONSTRAINT "workflow_runs_template_id_fkey"
  FOREIGN KEY ("template_id") REFERENCES "workflow_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workflow_runs"
  ADD CONSTRAINT "workflow_runs_linked_case_id_fkey"
  FOREIGN KEY ("linked_case_id") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "workflow_step_runs" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "template_step_id" TEXT NOT NULL,
    "status" "WorkflowStepRunStatus" NOT NULL DEFAULT 'pending',
    "approved_by_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_step_runs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workflow_step_runs_run_id_template_step_id_key"
  ON "workflow_step_runs"("run_id", "template_step_id");
CREATE INDEX "workflow_step_runs_template_step_id_idx" ON "workflow_step_runs"("template_step_id");
CREATE INDEX "workflow_step_runs_status_idx" ON "workflow_step_runs"("status");

ALTER TABLE "workflow_step_runs"
  ADD CONSTRAINT "workflow_step_runs_run_id_fkey"
  FOREIGN KEY ("run_id") REFERENCES "workflow_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workflow_step_runs"
  ADD CONSTRAINT "workflow_step_runs_template_step_id_fkey"
  FOREIGN KEY ("template_step_id") REFERENCES "workflow_template_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workflow_step_runs"
  ADD CONSTRAINT "workflow_step_runs_approved_by_id_fkey"
  FOREIGN KEY ("approved_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
