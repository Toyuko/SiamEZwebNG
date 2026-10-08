-- Saved job-intake drafts. The token in the URL is the access key.

CREATE TABLE IF NOT EXISTS "job_intake_memories" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "details" JSONB NOT NULL,
  "memory" TEXT NOT NULL DEFAULT '',
  "case_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "job_intake_memories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "job_intake_memories_token_key" ON "job_intake_memories"("token");
CREATE INDEX IF NOT EXISTS "job_intake_memories_case_id_idx" ON "job_intake_memories"("case_id");
