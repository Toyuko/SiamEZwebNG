-- CreateEnum
CREATE TYPE "SalesSellerKind" AS ENUM ('dealer', 'private');

-- AlterTable
ALTER TABLE "sales_vehicles" ADD COLUMN "seller_kind" "SalesSellerKind" NOT NULL DEFAULT 'private';

-- CreateIndex
CREATE INDEX "sales_vehicles_seller_kind_status_published_idx" ON "sales_vehicles"("seller_kind", "status", "published");
