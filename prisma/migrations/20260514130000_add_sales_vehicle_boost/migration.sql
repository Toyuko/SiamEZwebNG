-- AlterTable
ALTER TABLE "sales_vehicles" ADD COLUMN "is_boosted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "sales_vehicles" ADD COLUMN "boost_expires_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "sales_vehicles_is_boosted_boost_expires_at_idx" ON "sales_vehicles"("is_boosted", "boost_expires_at");
