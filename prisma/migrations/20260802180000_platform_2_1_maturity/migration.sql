-- Platform 2.1 — marketplace badges, saved searches, feature flags, analytics events

ALTER TABLE "sales_vehicles" ADD COLUMN IF NOT EXISTS "previous_price_amount" INTEGER;
ALTER TABLE "sales_vehicles" ADD COLUMN IF NOT EXISTS "is_verified" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "sales_vehicles_is_verified_idx" ON "sales_vehicles"("is_verified");

ALTER TABLE "sales_properties" ADD COLUMN IF NOT EXISTS "previous_price_amount" INTEGER;
ALTER TABLE "sales_properties" ADD COLUMN IF NOT EXISTS "is_verified" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "sales_properties_is_verified_idx" ON "sales_properties"("is_verified");

CREATE TABLE IF NOT EXISTS "saved_searches" (
    "id" TEXT NOT NULL,
    "owner_key" TEXT NOT NULL,
    "user_id" TEXT,
    "anonymous_session_id" TEXT,
    "listing_type" "MarketplaceListingType" NOT NULL,
    "name" TEXT NOT NULL,
    "query" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "saved_searches_owner_key_updated_at_idx" ON "saved_searches"("owner_key", "updated_at");
CREATE INDEX IF NOT EXISTS "saved_searches_user_id_updated_at_idx" ON "saved_searches"("user_id", "updated_at");
CREATE INDEX IF NOT EXISTS "saved_searches_listing_type_idx" ON "saved_searches"("listing_type");

DO $$ BEGIN
  ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "feature_flags" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "feature_flags_key_key" ON "feature_flags"("key");
CREATE INDEX IF NOT EXISTS "feature_flags_enabled_idx" ON "feature_flags"("enabled");

DO $$ BEGIN
  ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_updated_by_id_fkey"
    FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "platform_metric_events" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "locale" TEXT,
    "user_id" TEXT,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_metric_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "platform_metric_events_kind_created_at_idx" ON "platform_metric_events"("kind", "created_at");
CREATE INDEX IF NOT EXISTS "platform_metric_events_user_id_created_at_idx" ON "platform_metric_events"("user_id", "created_at");

-- Default feature flags (idempotent)
INSERT INTO "feature_flags" ("id", "key", "enabled", "description", "updated_at")
VALUES
  ('ff_experimental_ai', 'experimental_ai', false, 'Experimental AI Concierge features', CURRENT_TIMESTAMP),
  ('ff_marketplace_beta', 'marketplace_beta', true, 'Marketplace beta capabilities (saved searches, badges)', CURRENT_TIMESTAMP),
  ('ff_new_workflows', 'new_workflows', true, 'New universal workflow templates', CURRENT_TIMESTAMP),
  ('ff_beta_analytics', 'beta_analytics', true, 'Platform analytics dashboards and CSV export', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
