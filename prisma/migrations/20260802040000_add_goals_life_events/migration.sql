-- Platform Wave M4: Goals + Life Events Engines.
-- Additive only — does not alter sales_vehicles / sales_properties source columns.
-- Prefer `npx prisma db push` locally if older migrations fail; this folder documents the schema delta.

CREATE TYPE "LifeEventRunStatus" AS ENUM ('active', 'completed', 'abandoned');
CREATE TYPE "LifeEventStepStatus" AS ENUM ('pending', 'started', 'completed', 'skipped');
CREATE TYPE "GoalStatus" AS ENUM ('active', 'completed', 'cancelled');

CREATE TABLE "life_events" (
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

    CONSTRAINT "life_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "life_events_key_key" ON "life_events"("key");
CREATE INDEX "life_events_active_sort_order_idx" ON "life_events"("active", "sort_order");

CREATE TABLE "life_event_steps" (
    "id" TEXT NOT NULL,
    "life_event_id" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "title_th" TEXT,
    "description_en" TEXT,
    "description_th" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "target" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "life_event_steps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "life_event_steps_life_event_id_sort_order_idx"
  ON "life_event_steps"("life_event_id", "sort_order");

ALTER TABLE "life_event_steps"
  ADD CONSTRAINT "life_event_steps_life_event_id_fkey"
  FOREIGN KEY ("life_event_id") REFERENCES "life_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "life_event_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "life_event_id" TEXT NOT NULL,
    "status" "LifeEventRunStatus" NOT NULL DEFAULT 'active',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "life_event_progress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "life_event_progress_user_id_life_event_id_key"
  ON "life_event_progress"("user_id", "life_event_id");
CREATE INDEX "life_event_progress_user_id_status_idx"
  ON "life_event_progress"("user_id", "status");
CREATE INDEX "life_event_progress_life_event_id_idx"
  ON "life_event_progress"("life_event_id");

ALTER TABLE "life_event_progress"
  ADD CONSTRAINT "life_event_progress_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "life_event_progress"
  ADD CONSTRAINT "life_event_progress_life_event_id_fkey"
  FOREIGN KEY ("life_event_id") REFERENCES "life_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "life_event_step_progress" (
    "id" TEXT NOT NULL,
    "progress_id" TEXT NOT NULL,
    "step_id" TEXT NOT NULL,
    "status" "LifeEventStepStatus" NOT NULL DEFAULT 'pending',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "life_event_step_progress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "life_event_step_progress_progress_id_step_id_key"
  ON "life_event_step_progress"("progress_id", "step_id");
CREATE INDEX "life_event_step_progress_step_id_idx"
  ON "life_event_step_progress"("step_id");

ALTER TABLE "life_event_step_progress"
  ADD CONSTRAINT "life_event_step_progress_progress_id_fkey"
  FOREIGN KEY ("progress_id") REFERENCES "life_event_progress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "life_event_step_progress"
  ADD CONSTRAINT "life_event_step_progress_step_id_fkey"
  FOREIGN KEY ("step_id") REFERENCES "life_event_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "GoalStatus" NOT NULL DEFAULT 'active',
    "life_event_id" TEXT,
    "progress_pct" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "goals_user_id_status_idx" ON "goals"("user_id", "status");
CREATE INDEX "goals_life_event_id_idx" ON "goals"("life_event_id");

ALTER TABLE "goals"
  ADD CONSTRAINT "goals_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "goals"
  ADD CONSTRAINT "goals_life_event_id_fkey"
  FOREIGN KEY ("life_event_id") REFERENCES "life_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
