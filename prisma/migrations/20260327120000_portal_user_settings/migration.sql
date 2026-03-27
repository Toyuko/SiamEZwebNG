-- Portal profile settings: timezone, locale, notification prefs, last login
ALTER TABLE `User` ADD COLUMN `timezone` VARCHAR(191) NULL;
ALTER TABLE `User` ADD COLUMN `preferred_locale` VARCHAR(191) NULL;
ALTER TABLE `User` ADD COLUMN `notification_preferences` JSON NULL;
ALTER TABLE `User` ADD COLUMN `last_login_at` DATETIME(3) NULL;
