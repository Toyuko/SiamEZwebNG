-- Platform 2.0: marketplace listing enquiries (additive)
CREATE TABLE "listing_enquiries" (
    "id" TEXT NOT NULL,
    "listing_type" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "user_id" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listing_enquiries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "listing_enquiries_listing_type_listing_id_idx" ON "listing_enquiries"("listing_type", "listing_id");
CREATE INDEX "listing_enquiries_user_id_idx" ON "listing_enquiries"("user_id");

ALTER TABLE "listing_enquiries" ADD CONSTRAINT "listing_enquiries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
