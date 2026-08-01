/** Wizard / booking document upload quality checks (type + size). */

export const WIZARD_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
]);

const ALLOWED_EXT = /\.(jpe?g|png|pdf)$/i;

export function isAllowedWizardDocument(file: {
  name: string;
  type: string;
}): boolean {
  const mime = (file.type || "").toLowerCase();
  if (mime && ALLOWED_MIME.has(mime)) return true;
  return ALLOWED_EXT.test(file.name);
}

/**
 * Returns an error message when the file fails quality checks, or null when OK.
 */
export function validateWizardDocument(file: {
  name: string;
  type: string;
  size: number;
}): string | null {
  if (!file.name?.trim()) {
    return "File name is required.";
  }
  if (file.size <= 0) {
    return "File is empty.";
  }
  if (file.size > WIZARD_DOCUMENT_MAX_BYTES) {
    return "File too large (max 10 MB).";
  }
  if (!isAllowedWizardDocument(file)) {
    return "Only PDF, JPG, and PNG files are allowed.";
  }
  return null;
}
