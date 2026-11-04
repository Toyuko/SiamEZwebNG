-- SiamEZ AI back office: knowledge, price catalogue, conversations, audit, pending actions, daily reports.

CREATE TYPE "BackofficeKnowledgeCategory" AS ENUM ('service', 'policy', 'faq', 'procedure', 'document', 'template', 'vehicle', 'pricing', 'staff');
CREATE TYPE "BackofficeMessageRole" AS ENUM ('user', 'assistant');
CREATE TYPE "BackofficeAuditStatus" AS ENUM ('success', 'denied', 'error', 'pending', 'confirmed', 'rejected');
CREATE TYPE "BackofficePendingStatus" AS ENUM ('pending', 'confirmed', 'rejected', 'expired');

CREATE TABLE "backoffice_knowledge_articles" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "BackofficeKnowledgeCategory" NOT NULL,
    "body" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backoffice_knowledge_articles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "backoffice_price_items" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amount_satang" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'THB',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backoffice_price_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "backoffice_conversations" (
    "id" TEXT NOT NULL,
    "staff_id" TEXT,
    "title" TEXT,
    "context" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backoffice_conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "backoffice_messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "role" "BackofficeMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backoffice_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "backoffice_audit_logs" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT,
    "staff_id" TEXT,
    "actor_email" TEXT NOT NULL,
    "actor_role" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" "BackofficeAuditStatus" NOT NULL,
    "summary" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backoffice_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "backoffice_pending_actions" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "staff_id" TEXT,
    "tool_name" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "BackofficePendingStatus" NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backoffice_pending_actions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "backoffice_daily_reports" (
    "id" TEXT NOT NULL,
    "report_date" DATE NOT NULL,
    "kind" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "emailed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backoffice_daily_reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "backoffice_knowledge_articles_slug_key" ON "backoffice_knowledge_articles"("slug");
CREATE INDEX "backoffice_knowledge_articles_active_category_idx" ON "backoffice_knowledge_articles"("active", "category");

CREATE UNIQUE INDEX "backoffice_price_items_code_key" ON "backoffice_price_items"("code");
CREATE INDEX "backoffice_price_items_active_sort_order_idx" ON "backoffice_price_items"("active", "sort_order");

CREATE INDEX "backoffice_conversations_staff_id_updated_at_idx" ON "backoffice_conversations"("staff_id", "updated_at");

CREATE INDEX "backoffice_messages_conversation_id_created_at_idx" ON "backoffice_messages"("conversation_id", "created_at");

CREATE INDEX "backoffice_audit_logs_created_at_idx" ON "backoffice_audit_logs"("created_at");
CREATE INDEX "backoffice_audit_logs_staff_id_created_at_idx" ON "backoffice_audit_logs"("staff_id", "created_at");
CREATE INDEX "backoffice_audit_logs_action_created_at_idx" ON "backoffice_audit_logs"("action", "created_at");

CREATE INDEX "backoffice_pending_actions_status_expires_at_idx" ON "backoffice_pending_actions"("status", "expires_at");
CREATE INDEX "backoffice_pending_actions_conversation_id_idx" ON "backoffice_pending_actions"("conversation_id");

CREATE UNIQUE INDEX "backoffice_daily_reports_report_date_kind_key" ON "backoffice_daily_reports"("report_date", "kind");

ALTER TABLE "backoffice_knowledge_articles" ADD CONSTRAINT "backoffice_knowledge_articles_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "backoffice_price_items" ADD CONSTRAINT "backoffice_price_items_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "backoffice_conversations" ADD CONSTRAINT "backoffice_conversations_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "backoffice_messages" ADD CONSTRAINT "backoffice_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "backoffice_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "backoffice_audit_logs" ADD CONSTRAINT "backoffice_audit_logs_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "backoffice_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "backoffice_audit_logs" ADD CONSTRAINT "backoffice_audit_logs_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "backoffice_pending_actions" ADD CONSTRAINT "backoffice_pending_actions_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "backoffice_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "backoffice_pending_actions" ADD CONSTRAINT "backoffice_pending_actions_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
