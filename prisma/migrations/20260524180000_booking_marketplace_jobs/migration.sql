-- AlterTable
ALTER TABLE "Case" ADD COLUMN "post_to_marketplace" BOOLEAN NOT NULL DEFAULT false;

-- CreateEnum
CREATE TYPE "MarketplaceJobStatus" AS ENUM ('OPEN', 'ASSIGNED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "marketplace_jobs" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "status" "MarketplaceJobStatus" NOT NULL DEFAULT 'OPEN',
    "budget" INTEGER NOT NULL,
    "freelancer_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_jobs_case_id_key" ON "marketplace_jobs"("case_id");

-- CreateIndex
CREATE INDEX "marketplace_jobs_status_idx" ON "marketplace_jobs"("status");

-- CreateIndex
CREATE INDEX "marketplace_jobs_freelancer_id_idx" ON "marketplace_jobs"("freelancer_id");

-- AddForeignKey
ALTER TABLE "marketplace_jobs" ADD CONSTRAINT "marketplace_jobs_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_jobs" ADD CONSTRAINT "marketplace_jobs_freelancer_id_fkey" FOREIGN KEY ("freelancer_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
