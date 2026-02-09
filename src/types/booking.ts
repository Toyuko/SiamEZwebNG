/**
 * Booking wizard types: step data, form config, and submission payload.
 */

export interface BookingFormQuestion {
  id: string;
  type: "text" | "textarea" | "email" | "phone" | "select" | "checkbox" | "date" | "file";
  label: string;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  accept?: string; // for file: e.g. ".pdf,image/*"
}

export interface ServiceFormConfig {
  questions: BookingFormQuestion[];
  requiredDocumentTypes?: string[]; // e.g. ["passport", "photo"]
}

export interface BookingStepData {
  stepId: string;
  answers: Record<string, string | string[] | boolean>;
  uploadedFiles?: { questionId: string; fileId: string; name: string }[];
}

export interface BookingSubmissionPayload {
  serviceId: string;
  serviceSlug: string;
  isGuest: boolean;
  guestEmail?: string;
  guestName?: string;
  guestPhone?: string;
  userId?: string;
  formData: Record<string, unknown>;
  documentIds?: string[];
  acceptQuoteId?: string; // when paying for a quoted case
  paymentIntentId?: string; // when fixed-price pay-now
}

export type BookingWizardStepId = "details" | "questions" | "documents" | "summary" | "payment";
