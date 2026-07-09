-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'company';

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "JobPostingStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CLOSED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "JobApplicationStatus" AS ENUM ('PENDING', 'HIRED', 'DECLINED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "AdCampaignStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAUSED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "companies" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "logo" TEXT,
    "banner_image" TEXT,
    "website" TEXT,
    "description" TEXT,
    "industry" TEXT,
    "company_size" TEXT,
    "tax_id" TEXT,
    "address" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "job_postings" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "budget" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'THB',
    "required_skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "JobPostingStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_postings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "job_applications" (
    "id" TEXT NOT NULL,
    "job_posting_id" TEXT NOT NULL,
    "freelancer_id" TEXT NOT NULL,
    "cover_note" TEXT,
    "status" "JobApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ad_campaigns" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "target_url" TEXT NOT NULL,
    "budget" INTEGER NOT NULL,
    "daily_limit" INTEGER,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "status" "AdCampaignStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "companies_user_id_key" ON "companies"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "companies_slug_key" ON "companies"("slug");
CREATE INDEX IF NOT EXISTS "job_postings_company_id_status_idx" ON "job_postings"("company_id", "status");
CREATE INDEX IF NOT EXISTS "job_postings_status_idx" ON "job_postings"("status");
CREATE INDEX IF NOT EXISTS "job_applications_freelancer_id_idx" ON "job_applications"("freelancer_id");
CREATE INDEX IF NOT EXISTS "job_applications_job_posting_id_status_idx" ON "job_applications"("job_posting_id", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "job_applications_job_posting_id_freelancer_id_key" ON "job_applications"("job_posting_id", "freelancer_id");
CREATE INDEX IF NOT EXISTS "ad_campaigns_company_id_status_idx" ON "ad_campaigns"("company_id", "status");
CREATE INDEX IF NOT EXISTS "ad_campaigns_status_idx" ON "ad_campaigns"("status");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "companies" ADD CONSTRAINT "companies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_job_posting_id_fkey" FOREIGN KEY ("job_posting_id") REFERENCES "job_postings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_freelancer_id_fkey" FOREIGN KEY ("freelancer_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ad_campaigns" ADD CONSTRAINT "ad_campaigns_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
