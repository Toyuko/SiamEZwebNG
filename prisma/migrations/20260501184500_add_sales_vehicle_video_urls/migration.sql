-- Add optional video URLs to sales listings.
ALTER TABLE "sales_vehicles"
ADD COLUMN "video_urls" JSONB;
