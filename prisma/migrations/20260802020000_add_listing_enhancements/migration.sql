-- Platform Wave M1: non-destructive listing enhancement side table (PostgreSQL-safe).
-- Does not alter sales_vehicles / sales_properties source columns.

CREATE TYPE "ListingEnhancementType" AS ENUM ('vehicle', 'property');

CREATE TABLE "listing_enhancements" (
    "id" TEXT NOT NULL,
    "listing_type" "ListingEnhancementType" NOT NULL,
    "listing_id" TEXT NOT NULL,
    "ai_summary" TEXT,
    "seo_title" TEXT,
    "seo_description" TEXT,
    "keywords" JSONB,
    "schema_json_ld" JSONB,
    "enhanced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listing_enhancements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "listing_enhancements_listing_type_listing_id_key"
  ON "listing_enhancements"("listing_type", "listing_id");

CREATE INDEX "listing_enhancements_listing_id_idx"
  ON "listing_enhancements"("listing_id");

CREATE INDEX "listing_enhancements_listing_type_enhanced_at_idx"
  ON "listing_enhancements"("listing_type", "enhanced_at");
