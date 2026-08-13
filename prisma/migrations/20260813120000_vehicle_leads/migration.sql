-- Vehicle buy/sell quick-link leads, media, status history, and social content.

CREATE TYPE "VehicleLeadType" AS ENUM ('sell', 'buy');
CREATE TYPE "VehicleLeadStatus" AS ENUM (
  'new',
  'reviewing',
  'contacted',
  'info_confirmed',
  'price_evaluation',
  'customer_approved',
  'listing_or_search',
  'negotiating',
  'sold_or_purchased',
  'completed',
  'cancelled'
);
CREATE TYPE "VehicleKind" AS ENUM ('car', 'motorcycle', 'other');
CREATE TYPE "VehicleMediaKind" AS ENUM ('image', 'video', 'document');
CREATE TYPE "VehicleSocialStatus" AS ENUM (
  'not_generated',
  'draft_generated',
  'ready_for_review',
  'approved',
  'posted',
  'sold'
);
CREATE TYPE "VehicleSocialPlatform" AS ENUM (
  'facebook',
  'instagram',
  'tiktok',
  'line',
  'whatsapp',
  'marketplace'
);

CREATE TABLE "vehicle_lead_referral_tokens" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "staff_id" TEXT NOT NULL,
  "campaign" TEXT,
  "expires_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "vehicle_lead_referral_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "vehicle_lead_referral_tokens_token_key" ON "vehicle_lead_referral_tokens"("token");
CREATE INDEX "vehicle_lead_referral_tokens_staff_id_idx" ON "vehicle_lead_referral_tokens"("staff_id");

CREATE TABLE "vehicle_leads" (
  "id" TEXT NOT NULL,
  "lead_number" TEXT NOT NULL,
  "public_token" TEXT NOT NULL,
  "type" "VehicleLeadType" NOT NULL,
  "status" "VehicleLeadStatus" NOT NULL DEFAULT 'new',
  "source" TEXT,
  "utm_source" TEXT,
  "utm_medium" TEXT,
  "utm_campaign" TEXT,
  "locale" TEXT,
  "customer_name" TEXT NOT NULL,
  "customer_phone" TEXT,
  "customer_line_id" TEXT,
  "customer_email" TEXT,
  "preferred_contact_method" TEXT,
  "preferred_contact_time" TEXT,
  "customer_location" TEXT,
  "vehicle_kind" "VehicleKind" NOT NULL,
  "display_title" TEXT NOT NULL,
  "province" TEXT,
  "city" TEXT,
  "asking_price" INTEGER,
  "budget_min" INTEGER,
  "budget_max" INTEGER,
  "official_listing_price" INTEGER,
  "ai_estimated_min" INTEGER,
  "ai_estimated_max" INTEGER,
  "ai_suggested_price" INTEGER,
  "ai_min_acceptable_price" INTEGER,
  "ai_summary" TEXT,
  "ai_lead_score" TEXT,
  "ai_analysis" JSONB,
  "ai_customer_draft" TEXT,
  "notes" TEXT,
  "social_status" "VehicleSocialStatus" NOT NULL DEFAULT 'not_generated',
  "assigned_staff_id" TEXT,
  "case_id" TEXT,
  "referral_token_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "vehicle_leads_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "vehicle_leads_lead_number_key" ON "vehicle_leads"("lead_number");
CREATE UNIQUE INDEX "vehicle_leads_public_token_key" ON "vehicle_leads"("public_token");
CREATE UNIQUE INDEX "vehicle_leads_case_id_key" ON "vehicle_leads"("case_id");
CREATE INDEX "vehicle_leads_type_status_created_at_idx" ON "vehicle_leads"("type", "status", "created_at");
CREATE INDEX "vehicle_leads_assigned_staff_id_idx" ON "vehicle_leads"("assigned_staff_id");
CREATE INDEX "vehicle_leads_source_created_at_idx" ON "vehicle_leads"("source", "created_at");
CREATE INDEX "vehicle_leads_vehicle_kind_province_idx" ON "vehicle_leads"("vehicle_kind", "province");

CREATE TABLE "vehicles" (
  "id" TEXT NOT NULL,
  "lead_id" TEXT NOT NULL,
  "kind" "VehicleKind" NOT NULL,
  "make" TEXT,
  "model" TEXT,
  "year" INTEGER,
  "variant" TEXT,
  "engine_size" TEXT,
  "transmission" TEXT,
  "fuel" TEXT,
  "mileage_km" INTEGER,
  "colour" TEXT,
  "province" TEXT,
  "city" TEXT,
  "overall_condition" TEXT,
  "accident_history" TEXT,
  "flood_damage" TEXT,
  "major_repairs" TEXT,
  "engine_condition" TEXT,
  "transmission_condition" TEXT,
  "tire_condition" TEXT,
  "modifications" TEXT,
  "known_problems" TEXT,
  "service_history" TEXT,
  "registered_owner" TEXT,
  "ownership_status" TEXT,
  "green_book_available" BOOLEAN,
  "blue_book_available" BOOLEAN,
  "registration_province" TEXT,
  "tax_status" TEXT,
  "insurance_status" TEXT,
  "outstanding_finance" TEXT,
  "restrictions" TEXT,
  "price_negotiable" BOOLEAN,
  "sell_timeline" TEXT,
  "reason_for_selling" TEXT,
  "accept_recommended_price" BOOLEAN,
  "year_min" INTEGER,
  "year_max" INTEGER,
  "budget_min" INTEGER,
  "budget_max" INTEGER,
  "max_mileage_km" INTEGER,
  "new_or_used" TEXT,
  "preferred_colour" TEXT,
  "must_have_features" TEXT,
  "deal_breakers" TEXT,
  "purchase_payment" TEXT,
  "purchase_timeframe" TEXT,
  "need_delivery" BOOLEAN,
  "need_transfer" BOOLEAN,
  "need_insurance" BOOLEAN,
  "need_inspection" BOOLEAN,
  "need_financing_help" BOOLEAN,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "vehicles_lead_id_key" ON "vehicles"("lead_id");
CREATE INDEX "vehicles_make_model_year_idx" ON "vehicles"("make", "model", "year");

CREATE TABLE "vehicle_media" (
  "id" TEXT NOT NULL,
  "lead_id" TEXT NOT NULL,
  "vehicle_id" TEXT,
  "media_type" "VehicleMediaKind" NOT NULL,
  "category" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "storage_key" TEXT NOT NULL,
  "mime_type" TEXT,
  "size" INTEGER,
  "is_private" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "vehicle_media_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "vehicle_media_lead_id_category_idx" ON "vehicle_media"("lead_id", "category");

CREATE TABLE "vehicle_lead_status_history" (
  "id" TEXT NOT NULL,
  "lead_id" TEXT NOT NULL,
  "from_status" "VehicleLeadStatus",
  "to_status" "VehicleLeadStatus" NOT NULL,
  "changed_by_id" TEXT,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "vehicle_lead_status_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "vehicle_lead_status_history_lead_id_created_at_idx" ON "vehicle_lead_status_history"("lead_id", "created_at");

CREATE TABLE "vehicle_lead_notes" (
  "id" TEXT NOT NULL,
  "lead_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "vehicle_lead_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "vehicle_lead_notes_lead_id_created_at_idx" ON "vehicle_lead_notes"("lead_id", "created_at");

CREATE TABLE "vehicle_social_content" (
  "id" TEXT NOT NULL,
  "lead_id" TEXT NOT NULL,
  "language" TEXT NOT NULL DEFAULT 'en',
  "status" "VehicleSocialStatus" NOT NULL DEFAULT 'draft_generated',
  "package_json" JSONB NOT NULL,
  "approved_at" TIMESTAMP(3),
  "approved_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "vehicle_social_content_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "vehicle_social_content_lead_id_created_at_idx" ON "vehicle_social_content"("lead_id", "created_at");

CREATE TABLE "vehicle_social_posts" (
  "id" TEXT NOT NULL,
  "lead_id" TEXT NOT NULL,
  "platform" "VehicleSocialPlatform" NOT NULL,
  "posted_at" TIMESTAMP(3),
  "post_url" TEXT,
  "staff_id" TEXT,
  "campaign" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "vehicle_social_posts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "vehicle_social_posts_lead_id_platform_idx" ON "vehicle_social_posts"("lead_id", "platform");

ALTER TABLE "vehicle_lead_referral_tokens"
  ADD CONSTRAINT "vehicle_lead_referral_tokens_staff_id_fkey"
  FOREIGN KEY ("staff_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "vehicle_leads"
  ADD CONSTRAINT "vehicle_leads_assigned_staff_id_fkey"
  FOREIGN KEY ("assigned_staff_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "vehicle_leads"
  ADD CONSTRAINT "vehicle_leads_case_id_fkey"
  FOREIGN KEY ("case_id") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "vehicle_leads"
  ADD CONSTRAINT "vehicle_leads_referral_token_id_fkey"
  FOREIGN KEY ("referral_token_id") REFERENCES "vehicle_lead_referral_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "vehicles"
  ADD CONSTRAINT "vehicles_lead_id_fkey"
  FOREIGN KEY ("lead_id") REFERENCES "vehicle_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "vehicle_media"
  ADD CONSTRAINT "vehicle_media_lead_id_fkey"
  FOREIGN KEY ("lead_id") REFERENCES "vehicle_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "vehicle_media"
  ADD CONSTRAINT "vehicle_media_vehicle_id_fkey"
  FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "vehicle_lead_status_history"
  ADD CONSTRAINT "vehicle_lead_status_history_lead_id_fkey"
  FOREIGN KEY ("lead_id") REFERENCES "vehicle_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "vehicle_lead_status_history"
  ADD CONSTRAINT "vehicle_lead_status_history_changed_by_id_fkey"
  FOREIGN KEY ("changed_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "vehicle_lead_notes"
  ADD CONSTRAINT "vehicle_lead_notes_lead_id_fkey"
  FOREIGN KEY ("lead_id") REFERENCES "vehicle_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "vehicle_lead_notes"
  ADD CONSTRAINT "vehicle_lead_notes_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "vehicle_social_content"
  ADD CONSTRAINT "vehicle_social_content_lead_id_fkey"
  FOREIGN KEY ("lead_id") REFERENCES "vehicle_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "vehicle_social_content"
  ADD CONSTRAINT "vehicle_social_content_approved_by_id_fkey"
  FOREIGN KEY ("approved_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "vehicle_social_posts"
  ADD CONSTRAINT "vehicle_social_posts_lead_id_fkey"
  FOREIGN KEY ("lead_id") REFERENCES "vehicle_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "vehicle_social_posts"
  ADD CONSTRAINT "vehicle_social_posts_staff_id_fkey"
  FOREIGN KEY ("staff_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
