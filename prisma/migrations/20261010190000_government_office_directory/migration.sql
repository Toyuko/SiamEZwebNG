-- Government office directory. Access grants live on "User".directory_access.
-- Freelancers need an explicit grant. Staff and admin are authorized by role.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "directory_access" BOOLEAN NOT NULL DEFAULT false;

DO $$ BEGIN
  CREATE TYPE "GovOfficeVerificationStatus" AS ENUM (
    'verified',
    'needs_verification',
    'unverified',
    'temporarily_closed',
    'permanently_closed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "GovOfficeReportField" AS ENUM (
    'phone',
    'address',
    'hours',
    'services',
    'closed',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "GovOfficeReviewStatus" AS ENUM (
    'open',
    'in_review',
    'resolved',
    'dismissed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "GovOfficeSubmissionKind" AS ENUM ('new_office', 'correction');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "GovOfficeSubmissionStatus" AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "gov_office_categories" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name_en" TEXT NOT NULL,
  "name_th" TEXT NOT NULL,
  "description_en" TEXT,
  "description_th" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "gov_office_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "gov_office_categories_slug_key" ON "gov_office_categories"("slug");

CREATE TABLE IF NOT EXISTS "gov_office_services" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name_en" TEXT NOT NULL,
  "name_th" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "gov_office_services_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "gov_office_services_slug_key" ON "gov_office_services"("slug");

CREATE TABLE IF NOT EXISTS "gov_offices" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name_en" TEXT,
  "name_th" TEXT,
  "category_id" TEXT NOT NULL,
  "parent_organization_en" TEXT,
  "parent_organization_th" TEXT,
  "branch_name_en" TEXT,
  "branch_name_th" TEXT,
  "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "province_code" TEXT NOT NULL,
  "district" TEXT,
  "subdistrict" TEXT,
  "address_en" TEXT,
  "address_th" TEXT,
  "postal_code" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "google_maps_url" TEXT,
  "extra_map_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "phone_primary" TEXT,
  "phones" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "email" TEXT,
  "website" TEXT,
  "facebook_url" TEXT,
  "contact_notes" TEXT,
  "opening_hours_text" TEXT,
  "hours_json" JSONB,
  "operating_days" TEXT,
  "lunch_break" TEXT,
  "holiday_notes" TEXT,
  "appointment_required" BOOLEAN,
  "walk_ins_accepted" BOOLEAN,
  "appointment_notes" TEXT,
  "service_notes" TEXT,
  "documents_required" TEXT,
  "booking_info" TEXT,
  "government_links" TEXT,
  "internal_notes" TEXT,
  "procedural_notes" TEXT,
  "staff_tips" TEXT,
  "parking_notes" TEXT,
  "counter_notes" TEXT,
  "verification_status" "GovOfficeVerificationStatus" NOT NULL DEFAULT 'unverified',
  "source_url" TEXT,
  "source_notes" TEXT,
  "last_verified_at" TIMESTAMP(3),
  "last_verification_method" TEXT,
  "last_verified_by_id" TEXT,
  "reliability_notes" TEXT,
  "search_text" TEXT NOT NULL,
  "archived_at" TIMESTAMP(3),
  "created_by_id" TEXT,
  "updated_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "gov_offices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "gov_offices_slug_key" ON "gov_offices"("slug");
CREATE INDEX IF NOT EXISTS "gov_offices_province_code_archived_at_idx" ON "gov_offices"("province_code", "archived_at");
CREATE INDEX IF NOT EXISTS "gov_offices_category_id_archived_at_idx" ON "gov_offices"("category_id", "archived_at");
CREATE INDEX IF NOT EXISTS "gov_offices_verification_status_archived_at_idx" ON "gov_offices"("verification_status", "archived_at");
CREATE INDEX IF NOT EXISTS "gov_offices_updated_at_idx" ON "gov_offices"("updated_at");
CREATE INDEX IF NOT EXISTS "gov_offices_last_verified_at_idx" ON "gov_offices"("last_verified_at");

CREATE TABLE IF NOT EXISTS "gov_office_service_links" (
  "office_id" TEXT NOT NULL,
  "service_id" TEXT NOT NULL,
  "notes" TEXT,
  CONSTRAINT "gov_office_service_links_pkey" PRIMARY KEY ("office_id", "service_id")
);

CREATE INDEX IF NOT EXISTS "gov_office_service_links_service_id_idx" ON "gov_office_service_links"("service_id");

CREATE TABLE IF NOT EXISTS "gov_office_favorites" (
  "user_id" TEXT NOT NULL,
  "office_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "gov_office_favorites_pkey" PRIMARY KEY ("user_id", "office_id")
);

CREATE INDEX IF NOT EXISTS "gov_office_favorites_user_id_created_at_idx" ON "gov_office_favorites"("user_id", "created_at");

CREATE TABLE IF NOT EXISTS "gov_office_views" (
  "user_id" TEXT NOT NULL,
  "office_id" TEXT NOT NULL,
  "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "gov_office_views_pkey" PRIMARY KEY ("user_id", "office_id")
);

CREATE INDEX IF NOT EXISTS "gov_office_views_user_id_viewed_at_idx" ON "gov_office_views"("user_id", "viewed_at");

CREATE TABLE IF NOT EXISTS "gov_office_reports" (
  "id" TEXT NOT NULL,
  "office_id" TEXT NOT NULL,
  "reporter_id" TEXT,
  "field" "GovOfficeReportField" NOT NULL,
  "explanation" TEXT NOT NULL,
  "status" "GovOfficeReviewStatus" NOT NULL DEFAULT 'open',
  "reviewed_by_id" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "resolution_notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "gov_office_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "gov_office_reports_status_created_at_idx" ON "gov_office_reports"("status", "created_at");
CREATE INDEX IF NOT EXISTS "gov_office_reports_office_id_idx" ON "gov_office_reports"("office_id");

CREATE TABLE IF NOT EXISTS "gov_office_submissions" (
  "id" TEXT NOT NULL,
  "kind" "GovOfficeSubmissionKind" NOT NULL,
  "status" "GovOfficeSubmissionStatus" NOT NULL DEFAULT 'pending',
  "office_id" TEXT,
  "payload" JSONB NOT NULL,
  "submitter_id" TEXT,
  "reviewer_id" TEXT,
  "review_notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewed_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "gov_office_submissions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "gov_office_submissions_status_created_at_idx" ON "gov_office_submissions"("status", "created_at");
CREATE INDEX IF NOT EXISTS "gov_office_submissions_office_id_idx" ON "gov_office_submissions"("office_id");

CREATE TABLE IF NOT EXISTS "gov_office_audit_logs" (
  "id" TEXT NOT NULL,
  "office_id" TEXT,
  "actor_id" TEXT,
  "action" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "changes" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "gov_office_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "gov_office_audit_logs_office_id_created_at_idx" ON "gov_office_audit_logs"("office_id", "created_at");
CREATE INDEX IF NOT EXISTS "gov_office_audit_logs_actor_id_created_at_idx" ON "gov_office_audit_logs"("actor_id", "created_at");

DO $$ BEGIN
  ALTER TABLE "gov_offices" ADD CONSTRAINT "gov_offices_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "gov_office_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "gov_offices" ADD CONSTRAINT "gov_offices_last_verified_by_id_fkey" FOREIGN KEY ("last_verified_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "gov_offices" ADD CONSTRAINT "gov_offices_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "gov_offices" ADD CONSTRAINT "gov_offices_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "gov_office_service_links" ADD CONSTRAINT "gov_office_service_links_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "gov_offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "gov_office_service_links" ADD CONSTRAINT "gov_office_service_links_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "gov_office_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "gov_office_favorites" ADD CONSTRAINT "gov_office_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "gov_office_favorites" ADD CONSTRAINT "gov_office_favorites_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "gov_offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "gov_office_views" ADD CONSTRAINT "gov_office_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "gov_office_views" ADD CONSTRAINT "gov_office_views_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "gov_offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "gov_office_reports" ADD CONSTRAINT "gov_office_reports_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "gov_offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "gov_office_reports" ADD CONSTRAINT "gov_office_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "gov_office_reports" ADD CONSTRAINT "gov_office_reports_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "gov_office_submissions" ADD CONSTRAINT "gov_office_submissions_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "gov_offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "gov_office_submissions" ADD CONSTRAINT "gov_office_submissions_submitter_id_fkey" FOREIGN KEY ("submitter_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "gov_office_submissions" ADD CONSTRAINT "gov_office_submissions_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "gov_office_audit_logs" ADD CONSTRAINT "gov_office_audit_logs_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "gov_offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "gov_office_audit_logs" ADD CONSTRAINT "gov_office_audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
