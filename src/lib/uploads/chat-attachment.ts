/** Job chat message attachments (client ↔ freelancer). */
export const CHAT_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

const IMAGE_EXT = /\.(jpe?g|png|webp|gif)(\?|$)/i;

export function isChatAttachmentFile(file: File): boolean {
  const mime = file.type.toLowerCase();
  if (mime && ALLOWED_MIME.has(mime)) return true;
  const name = file.name.toLowerCase();
  return IMAGE_EXT.test(name) || name.endsWith(".pdf");
}

export function validateChatAttachment(file: File): string | null {
  if (file.size <= 0) {
    return "File is empty.";
  }
  if (file.size > CHAT_ATTACHMENT_MAX_BYTES) {
    return "File too large (max 10 MB).";
  }
  if (!isChatAttachmentFile(file)) {
    return "Only images and PDF files are allowed.";
  }
  return null;
}

export function isChatAttachmentImage(url: string): boolean {
  const lower = url.toLowerCase();
  if (lower.endsWith(".pdf") || lower.includes(".pdf?")) return false;
  if (lower.includes("image/")) return true;
  return IMAGE_EXT.test(lower);
}
