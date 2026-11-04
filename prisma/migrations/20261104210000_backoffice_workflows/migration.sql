-- Service workflow templates and idempotent automation runs.

CREATE TYPE "BackofficeAutomationStatus" AS ENUM ('completed', 'failed', 'pending_approval', 'skipped');

CREATE TABLE "backoffice_workflow_templates" (
    "id" TEXT NOT NULL,
    "service_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "match_tokens" TEXT[],
    "documents" JSONB NOT NULL,
    "stages" JSONB NOT NULL,
    "task_title" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "backoffice_workflow_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "backoffice_automation_rules" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "backoffice_automation_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "backoffice_automation_runs" (
    "id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "status" "BackofficeAutomationStatus" NOT NULL,
    "trigger" TEXT NOT NULL,
    "case_id" TEXT,
    "customer_id" TEXT,
    "summary" TEXT NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "actor_label" TEXT NOT NULL DEFAULT 'automation',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "backoffice_automation_runs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "backoffice_workflow_templates_service_key_key" ON "backoffice_workflow_templates"("service_key");
CREATE UNIQUE INDEX "backoffice_automation_rules_key_key" ON "backoffice_automation_rules"("key");
CREATE UNIQUE INDEX "backoffice_automation_runs_idempotency_key_key" ON "backoffice_automation_runs"("idempotency_key");
CREATE INDEX "backoffice_automation_runs_status_created_at_idx" ON "backoffice_automation_runs"("status", "created_at");
CREATE INDEX "backoffice_automation_runs_case_id_idx" ON "backoffice_automation_runs"("case_id");

ALTER TABLE "backoffice_automation_rules" ADD CONSTRAINT "backoffice_automation_rules_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "backoffice_automation_runs" ADD CONSTRAINT "backoffice_automation_runs_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "backoffice_automation_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
