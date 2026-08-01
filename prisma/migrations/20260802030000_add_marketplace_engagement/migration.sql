-- Platform Wave M2: marketplace engagement (saved / recently viewed / compare).
-- Additive only — does not alter sales_vehicles / sales_properties source columns.

CREATE TYPE "MarketplaceListingType" AS ENUM ('vehicle', 'property');

CREATE TABLE "saved_listings" (
    "id" TEXT NOT NULL,
    "owner_key" TEXT NOT NULL,
    "user_id" TEXT,
    "anonymous_session_id" TEXT,
    "listing_type" "MarketplaceListingType" NOT NULL,
    "listing_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_listings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "saved_listings_owner_key_listing_type_listing_id_key"
  ON "saved_listings"("owner_key", "listing_type", "listing_id");

CREATE INDEX "saved_listings_user_id_created_at_idx"
  ON "saved_listings"("user_id", "created_at");

CREATE INDEX "saved_listings_anonymous_session_id_created_at_idx"
  ON "saved_listings"("anonymous_session_id", "created_at");

CREATE INDEX "saved_listings_listing_type_listing_id_idx"
  ON "saved_listings"("listing_type", "listing_id");

ALTER TABLE "saved_listings"
  ADD CONSTRAINT "saved_listings_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "listing_views" (
    "id" TEXT NOT NULL,
    "owner_key" TEXT NOT NULL,
    "user_id" TEXT,
    "anonymous_session_id" TEXT,
    "listing_type" "MarketplaceListingType" NOT NULL,
    "listing_id" TEXT NOT NULL,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_views_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "listing_views_owner_key_listing_type_listing_id_key"
  ON "listing_views"("owner_key", "listing_type", "listing_id");

CREATE INDEX "listing_views_owner_key_viewed_at_idx"
  ON "listing_views"("owner_key", "viewed_at");

CREATE INDEX "listing_views_user_id_viewed_at_idx"
  ON "listing_views"("user_id", "viewed_at");

CREATE INDEX "listing_views_anonymous_session_id_viewed_at_idx"
  ON "listing_views"("anonymous_session_id", "viewed_at");

ALTER TABLE "listing_views"
  ADD CONSTRAINT "listing_views_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "compare_items" (
    "id" TEXT NOT NULL,
    "owner_key" TEXT NOT NULL,
    "user_id" TEXT,
    "anonymous_session_id" TEXT,
    "listing_type" "MarketplaceListingType" NOT NULL,
    "listing_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compare_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "compare_items_owner_key_listing_type_listing_id_key"
  ON "compare_items"("owner_key", "listing_type", "listing_id");

CREATE INDEX "compare_items_owner_key_created_at_idx"
  ON "compare_items"("owner_key", "created_at");

CREATE INDEX "compare_items_user_id_idx"
  ON "compare_items"("user_id");

CREATE INDEX "compare_items_anonymous_session_id_idx"
  ON "compare_items"("anonymous_session_id");

ALTER TABLE "compare_items"
  ADD CONSTRAINT "compare_items_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
