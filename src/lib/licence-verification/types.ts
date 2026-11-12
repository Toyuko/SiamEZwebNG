export const LICENCE_SERVICE_KINDS = [
  "NEW_CAR",
  "NEW_MOTORCYCLE",
  "NEW_BOTH",
  "CONVERSION_CAR",
  "CONVERSION_MOTORCYCLE",
  "CONVERSION_BOTH",
  "RENEWAL",
  "LOST_REPLACEMENT",
  "IDP",
] as const;

export type LicenceServiceKind = (typeof LICENCE_SERVICE_KINDS)[number];

export const LICENCE_DOCUMENT_TYPES = [
  "passport",
  "visa_or_entry",
  "residence_certificate",
  "work_permit",
  "foreign_licence_front",
  "foreign_licence_back",
  "international_driving_permit",
  "medical_certificate",
  "previous_thai_licence",
  "other",
] as const;

export type LicenceDocumentType = (typeof LICENCE_DOCUMENT_TYPES)[number];

export const FINDING_STATUSES = [
  "ACCEPTABLE",
  "CLARIFICATION",
  "UNSUITABLE",
  "MANUAL",
  "MISSING",
] as const;

export type FindingStatus = (typeof FINDING_STATUSES)[number];

export type FindingSeverity = "info" | "warning" | "blocker" | "manual";

export type AssessmentOutcome = "PASS" | "ACTION_REQUIRED" | "MANUAL_REVIEW";

export type VehicleChoice = "car" | "bike" | "both";

export type ApplicantProfile = {
  fullLegalName: string;
  nationality: string;
  dateOfBirth: string;
  passportNumber: string;
  countryOfResidence: string;
  immigrationStatus: string;
  visaExpiryDate: string | null;
  thaiAddress: string;
  hasResidenceCertificate: boolean;
  hasWorkPermit: boolean;
  hasForeignLicence: boolean;
  foreignLicenceCountry: string | null;
  foreignLicenceCategories: string | null;
  foreignLicenceIssueDate: string | null;
  foreignLicenceExpiryDate: string | null;
  foreignLicenceFormat: "physical" | "digital" | null;
  foreignLicenceLanguage: "english" | "other" | null;
  previouslyHeldThaiLicence: boolean;
  failedOrAttemptedBefore: boolean;
  attemptNotes: string | null;
  renewalVehicle: VehicleChoice | null;
};

export type UploadedDocumentRef = {
  id: string;
  documentType: string;
  fileName: string;
  active: boolean;
};

export type DocumentExtraction = {
  documentId: string;
  detectedType: string | null;
  holderName: string | null;
  documentNumber: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  categories: string[];
  issuingCountry: string | null;
  readable: boolean;
  complete: boolean;
  possibleAlteration: boolean;
  translationLikelyNeeded: boolean;
  notes: string;
  confidence: number;
};

export type ScreeningRule = {
  ruleKey: string;
  name: string;
  description: string;
  serviceKinds: string[];
  customerCategories: string[];
  level: "REQUIRED" | "OPTIONAL";
  source: string;
  lastVerifiedOn: string;
  active: boolean;
  evaluatorKey: string;
};

export type ScreeningFinding = {
  documentId?: string;
  documentType?: string;
  code: string;
  status: FindingStatus;
  severity: FindingSeverity;
  message: string;
  recommendedAction: string;
};

export type ChecklistRow = {
  documentType: string;
  label: string;
  required: boolean;
  uploaded: boolean;
  status: FindingStatus;
  findings: string[];
  recommendedAction: string;
};

export const SCREENING_DISCLAIMER =
  "This result is an initial SiamEZ document screening. It is not official Department of Land Transport approval and it does not guarantee that a Thai driving licence or permit will be issued.";

export const DOCUMENT_LABELS: Record<string, string> = {
  passport: "Passport identity page",
  visa_or_entry: "Visa or entry stamp",
  residence_certificate: "Residence certificate",
  work_permit: "Work permit",
  foreign_licence_front: "Foreign driving licence (front)",
  foreign_licence_back: "Foreign driving licence (back)",
  international_driving_permit: "International driving permit",
  medical_certificate: "Medical certificate",
  previous_thai_licence: "Previous Thai driving licence",
  other: "Other supporting document",
};

export const QUOTATION_ALLOWED_STATUSES = [
  "APPROVED_FOR_QUOTATION",
  "QUOTATION_SENT",
  "BOOKING_CONFIRMED",
] as const;

export type QuotationAllowedStatus = (typeof QUOTATION_ALLOWED_STATUSES)[number];

export function isLicenceServiceKind(value: string): value is LicenceServiceKind {
  return (LICENCE_SERVICE_KINDS as readonly string[]).includes(value);
}

export function isLicenceDocumentType(value: string): value is LicenceDocumentType {
  return (LICENCE_DOCUMENT_TYPES as readonly string[]).includes(value);
}
