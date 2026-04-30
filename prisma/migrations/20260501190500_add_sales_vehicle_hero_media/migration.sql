-- Allow listings to choose image or video as hero media.
ALTER TABLE "sales_vehicles"
ADD COLUMN "hero_media_type" TEXT NOT NULL DEFAULT 'image',
ADD COLUMN "hero_video_url" TEXT;
