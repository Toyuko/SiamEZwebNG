-- Jobs stay saved when staff leave them off the calendar. Existing rows stay listed.
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "show_on_calendar" BOOLEAN NOT NULL DEFAULT true;
