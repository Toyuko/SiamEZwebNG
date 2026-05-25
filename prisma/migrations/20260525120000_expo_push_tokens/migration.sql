-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "expo_push_token" TEXT;

-- AlterTable
ALTER TABLE "freelancer_profiles" ADD COLUMN IF NOT EXISTS "expo_push_token" TEXT;
