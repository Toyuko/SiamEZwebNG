-- Portal profile settings: timezone, locale, notification prefs, last login (PostgreSQL)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "timezone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "preferred_locale" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "notification_preferences" JSONB;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "last_login_at" TIMESTAMP(3);
