-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('condo', 'house', 'townhouse', 'land', 'commercial', 'villa');

-- CreateEnum
CREATE TYPE "PropertyListingType" AS ENUM ('sale', 'rent');

-- CreateEnum
CREATE TYPE "PropertyFurnished" AS ENUM ('unfurnished', 'partially', 'furnished', 'not_applicable');

-- CreateTable
CREATE TABLE "sales_properties" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "property_type" "PropertyType" NOT NULL,
    "listing_type" "PropertyListingType" NOT NULL DEFAULT 'sale',
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "area_sqm" INTEGER NOT NULL,
    "land_area_sqm" INTEGER,
    "floor" INTEGER,
    "year_built" INTEGER,
    "province" TEXT NOT NULL,
    "district" TEXT,
    "neighborhood" TEXT,
    "price_amount" INTEGER NOT NULL,
    "price_currency" TEXT NOT NULL DEFAULT 'THB',
    "seller_kind" "SalesSellerKind" NOT NULL DEFAULT 'private',
    "status" "SalesListingStatus" NOT NULL DEFAULT 'available',
    "furnished" "PropertyFurnished" NOT NULL DEFAULT 'not_applicable',
    "hero_media_type" TEXT NOT NULL DEFAULT 'image',
    "hero_image_url" TEXT NOT NULL,
    "hero_video_url" TEXT,
    "image_urls" JSONB NOT NULL,
    "video_urls" JSONB,
    "description" TEXT NOT NULL,
    "specifications" JSONB,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "is_boosted" BOOLEAN NOT NULL DEFAULT false,
    "boost_expires_at" TIMESTAMP(3),
    "boost_tier" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_properties_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sales_properties_slug_key" ON "sales_properties"("slug");

-- CreateIndex
CREATE INDEX "sales_properties_is_boosted_boost_expires_at_idx" ON "sales_properties"("is_boosted", "boost_expires_at");

-- CreateIndex
CREATE INDEX "sales_properties_property_type_status_published_idx" ON "sales_properties"("property_type", "status", "published");

-- CreateIndex
CREATE INDEX "sales_properties_listing_type_status_published_idx" ON "sales_properties"("listing_type", "status", "published");

-- CreateIndex
CREATE INDEX "sales_properties_seller_kind_status_published_idx" ON "sales_properties"("seller_kind", "status", "published");

-- CreateIndex
CREATE INDEX "sales_properties_province_district_idx" ON "sales_properties"("province", "district");

-- AddForeignKey
ALTER TABLE "sales_properties" ADD CONSTRAINT "sales_properties_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
