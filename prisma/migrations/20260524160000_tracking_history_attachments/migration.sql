-- Optional file attachments on tracking history entries

ALTER TABLE "job_tracking_history" ADD COLUMN "attachment_url" TEXT;
ALTER TABLE "job_tracking_history" ADD COLUMN "attachment_name" TEXT;
