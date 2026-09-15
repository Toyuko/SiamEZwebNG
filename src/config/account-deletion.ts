/**
 * Account deletion policy (Google Play / privacy compliance).
 * Override via env without redeploying copy across the app.
 */

/** Days within which a deletion request is normally processed. */
export function getAccountDeletionProcessingDays(): number {
  const raw = process.env.ACCOUNT_DELETION_PROCESSING_DAYS?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 90) {
    return parsed;
  }
  return 30;
}

/** Phrase the authenticated user must type to confirm permanent deletion. */
export const ACCOUNT_DELETION_CONFIRM_PHRASE = "Delete my SiamEZ account permanently";

/** Generic success message — never reveal whether the email exists. */
export const ACCOUNT_DELETION_GENERIC_ACK =
  "If an account associated with this email exists, we will process the deletion request.";

export const ACCOUNT_DELETION_SUPPORT_EMAIL =
  process.env.ACCOUNT_DELETION_SUPPORT_EMAIL?.trim() || "inquiries@siam-ez.com";
