import type { ScreeningRule } from "@/lib/licence-verification/types";

const SOURCE =
  "SiamEZ operational screening checklist for Thai driving-licence files. This is not a statute. Confirm against current Department of Land Transport practice before relying on it.";

const VERIFIED = "2026-03-01";

function rule(partial: Omit<ScreeningRule, "source" | "lastVerifiedOn" | "active"> & { source?: string }): ScreeningRule {
  return {
    ...partial,
    source: partial.source ?? SOURCE,
    lastVerifiedOn: VERIFIED,
    active: true,
  };
}

/** Default rules inserted when the requirements table has no row for that key. */
export const DEFAULT_LICENCE_RULES: ScreeningRule[] = [
  rule({
    ruleKey: "passport_identity",
    name: "Passport identity page",
    description: "A readable passport identity page in the same name as the application.",
    serviceKinds: ["*"],
    customerCategories: ["*"],
    level: "REQUIRED",
    evaluatorKey: "document_passport",
  }),
  rule({
    ruleKey: "visa_or_entry",
    name: "Visa or entry stamp",
    description: "Foreign nationals need a readable visa or entry stamp showing lawful stay.",
    serviceKinds: ["*"],
    customerCategories: ["foreign_national"],
    level: "REQUIRED",
    evaluatorKey: "document_visa",
  }),
  rule({
    ruleKey: "residence_certificate",
    name: "Residence certificate",
    description: "Foreign nationals normally need a residence certificate that matches the passport.",
    serviceKinds: ["*"],
    customerCategories: ["foreign_national"],
    level: "REQUIRED",
    evaluatorKey: "document_residence",
  }),
  rule({
    ruleKey: "work_permit_if_declared",
    name: "Work permit",
    description: "Required only when the customer says they hold a work permit.",
    serviceKinds: ["*"],
    customerCategories: ["has_work_permit"],
    level: "REQUIRED",
    evaluatorKey: "document_work_permit",
  }),
  rule({
    ruleKey: "foreign_licence_front",
    name: "Foreign driving licence (front)",
    description: "Conversion files need the front of a current foreign licence.",
    serviceKinds: ["CONVERSION_CAR", "CONVERSION_MOTORCYCLE", "CONVERSION_BOTH"],
    customerCategories: ["*"],
    level: "REQUIRED",
    evaluatorKey: "document_foreign_front",
  }),
  rule({
    ruleKey: "foreign_licence_back",
    name: "Foreign driving licence (back)",
    description: "Physical foreign licences need the reverse side as well as the front.",
    serviceKinds: ["CONVERSION_CAR", "CONVERSION_MOTORCYCLE", "CONVERSION_BOTH"],
    customerCategories: ["physical_licence"],
    level: "REQUIRED",
    evaluatorKey: "document_foreign_back",
  }),
  rule({
    ruleKey: "medical_certificate",
    name: "Medical certificate",
    description: "First-time Thai licence applications need a medical certificate.",
    serviceKinds: ["NEW_CAR", "NEW_MOTORCYCLE", "NEW_BOTH"],
    customerCategories: ["*"],
    level: "REQUIRED",
    evaluatorKey: "document_medical",
  }),
  rule({
    ruleKey: "previous_thai_licence",
    name: "Previous Thai driving licence",
    description: "Renewals, replacements, international permits, and returning holders need the previous Thai licence.",
    serviceKinds: ["*"],
    customerCategories: ["renewal", "lost", "idp", "held_thai_before"],
    level: "REQUIRED",
    evaluatorKey: "document_previous_thai",
  }),
  rule({
    ruleKey: "idp_supporting",
    name: "Existing international driving permit",
    description: "Optional. Upload an existing permit only when the customer already has one.",
    serviceKinds: ["*"],
    customerCategories: ["*"],
    level: "OPTIONAL",
    evaluatorKey: "document_idp",
  }),
  rule({
    ruleKey: "foreign_licence_expiry",
    name: "Foreign licence still valid",
    description: "A foreign licence used for conversion should be unexpired on the day of screening.",
    serviceKinds: ["CONVERSION_CAR", "CONVERSION_MOTORCYCLE", "CONVERSION_BOTH"],
    customerCategories: ["*"],
    level: "REQUIRED",
    evaluatorKey: "check_foreign_expiry",
  }),
  rule({
    ruleKey: "name_consistency",
    name: "Name consistency",
    description: "Names on uploaded documents should match the passport and the application.",
    serviceKinds: ["*"],
    customerCategories: ["*"],
    level: "REQUIRED",
    evaluatorKey: "check_names",
  }),
  rule({
    ruleKey: "licence_category_match",
    name: "Licence category match",
    description: "Foreign licence categories should cover the Thai licence the customer is requesting.",
    serviceKinds: ["CONVERSION_CAR", "CONVERSION_MOTORCYCLE", "CONVERSION_BOTH"],
    customerCategories: ["*"],
    level: "REQUIRED",
    evaluatorKey: "check_categories",
  }),
  rule({
    ruleKey: "documents_readable",
    name: "Documents readable and complete",
    description: "Each uploaded file should be readable and not cropped.",
    serviceKinds: ["*"],
    customerCategories: ["*"],
    level: "REQUIRED",
    evaluatorKey: "check_readability",
  }),
  rule({
    ruleKey: "translation_review",
    name: "Translation",
    description: "A licence that is not in English may need a certified translation.",
    serviceKinds: ["CONVERSION_CAR", "CONVERSION_MOTORCYCLE", "CONVERSION_BOTH"],
    customerCategories: ["*"],
    level: "REQUIRED",
    evaluatorKey: "check_translation",
  }),
  rule({
    ruleKey: "alteration_review",
    name: "Possible alteration",
    description: "Inconsistent or altered-looking documents go to staff. The model must not call a document genuine or forged.",
    serviceKinds: ["*"],
    customerCategories: ["*"],
    level: "REQUIRED",
    evaluatorKey: "check_alteration",
  }),
  rule({
    ruleKey: "visa_expiry",
    name: "Visa expiry",
    description: "A declared visa expiry date in the past is sent back to the customer.",
    serviceKinds: ["*"],
    customerCategories: ["foreign_national"],
    level: "REQUIRED",
    evaluatorKey: "check_visa_expiry",
  }),
  rule({
    ruleKey: "minimum_age",
    name: "Usual minimum age",
    description: "Motorcycle licensing is commonly from 15 and car licensing from 18. Uncertain ages go to staff.",
    serviceKinds: ["*"],
    customerCategories: ["*"],
    level: "REQUIRED",
    evaluatorKey: "check_minimum_age",
  }),
  rule({
    ruleKey: "immigration_clarity",
    name: "Immigration status",
    description: "Unclear immigration status is a staff question, not an automatic refusal.",
    serviceKinds: ["*"],
    customerCategories: ["*"],
    level: "REQUIRED",
    evaluatorKey: "check_immigration_clarity",
  }),
  rule({
    ruleKey: "prior_attempt",
    name: "Previous attempt",
    description: "A previous failed attempt is noted for staff and does not by itself fail screening.",
    serviceKinds: ["*"],
    customerCategories: ["*"],
    level: "OPTIONAL",
    evaluatorKey: "check_prior_attempt",
  }),
];

export const KNOWN_EVALUATOR_KEYS = [
  "document_passport",
  "document_visa",
  "document_residence",
  "document_work_permit",
  "document_foreign_front",
  "document_foreign_back",
  "document_idp",
  "document_medical",
  "document_previous_thai",
  "check_foreign_expiry",
  "check_names",
  "check_categories",
  "check_readability",
  "check_translation",
  "check_alteration",
  "check_visa_expiry",
  "check_minimum_age",
  "check_immigration_clarity",
  "check_prior_attempt",
] as const;

export type KnownEvaluatorKey = (typeof KNOWN_EVALUATOR_KEYS)[number];

export function isKnownEvaluator(value: string): value is KnownEvaluatorKey {
  return (KNOWN_EVALUATOR_KEYS as readonly string[]).includes(value);
}
