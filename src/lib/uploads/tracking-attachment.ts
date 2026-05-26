/** Track & Trace progress attachments (freelancer uploads). */
export const TRACKING_ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/pdf",
]);

const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".pdf"]);

export function isTrackingAttachmentFile(file: File): boolean {
  const mime = file.type.toLowerCase();
  if (ALLOWED_MIME.has(mime)) return true;
  const name = file.name.toLowerCase();
  return [...ALLOWED_EXT].some((ext) => name.endsWith(ext));
}

export function validateTrackingAttachment(file: File): string | null {
  if (!isTrackingAttachmentFile(file)) {
    return "Only JPG, PNG, and PDF files are allowed.";
  }
  if (file.size > TRACKING_ATTACHMENT_MAX_BYTES) {
    return "File too large (max 5 MB).";
  }
  if (file.size <= 0) {
    return "File is empty.";
  }
  return null;
}

export function isTrackingAttachmentImage(
  url: string,
  name?: string | null
): boolean {
  const nameLower = (name ?? "").toLowerCase();
  const urlLower = url.toLowerCase();

  if (
    nameLower.endsWith(".jpg") ||
    nameLower.endsWith(".jpeg") ||
    nameLower.endsWith(".png") ||
    nameLower.includes("image/")
  ) {
    return true;
  }

  return (
    urlLower.endsWith(".jpg") ||
    urlLower.endsWith(".jpeg") ||
    urlLower.endsWith(".png") ||
    urlLower.includes("/job-tracking/") ||
    urlLower.includes("image/")
  );
}
