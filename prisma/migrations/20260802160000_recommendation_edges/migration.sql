-- Platform 2.0: admin-editable recommendation graph
CREATE TABLE IF NOT EXISTS "recommendation_edges" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "trigger_key" TEXT NOT NULL,
    "target_kind" TEXT NOT NULL,
    "target_key" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 50,
    "reason_en" TEXT NOT NULL,
    "reason_th" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendation_edges_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "recommendation_edges_key_key" ON "recommendation_edges"("key");
CREATE INDEX IF NOT EXISTS "recommendation_edges_trigger_key_active_idx" ON "recommendation_edges"("trigger_key", "active");
