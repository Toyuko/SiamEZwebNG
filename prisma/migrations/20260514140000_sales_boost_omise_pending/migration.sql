-- AlterEnum
ALTER TYPE "SalesListingStatus" ADD VALUE 'pending_boost';

-- AlterTable
ALTER TABLE "sales_vehicles" ADD COLUMN "boost_tier" TEXT;

-- AlterTable
ALTER TABLE "sales_vehicles" ADD COLUMN "omise_charge_id" TEXT;

-- AlterTable
ALTER TABLE "sales_vehicles" ADD COLUMN "boost_proof_document_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "sales_vehicles_omise_charge_id_key" ON "sales_vehicles"("omise_charge_id");
