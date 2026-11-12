import { serviceGroup, vehicleForKind } from "@/lib/licence-verification/catalog";
import { isKnownEvaluator } from "@/lib/licence-verification/rules-data";
import {
  DOCUMENT_LABELS,
  SCREENING_DISCLAIMER,
  type ApplicantProfile,
  type AssessmentOutcome,
  type ChecklistRow,
  type DocumentExtraction,
  type FindingStatus,
  type LicenceServiceKind,
  type ScreeningFinding,
  type ScreeningRule,
  type UploadedDocumentRef,
} from "@/lib/licence-verification/types";

const DOCUMENT_EVALUATOR: Record<string, string> = {
  document_passport: "passport",
  document_visa: "visa_or_entry",
  document_residence: "residence_certificate",
  document_work_permit: "work_permit",
  document_foreign_front: "foreign_licence_front",
  document_foreign_back: "foreign_licence_back",
  document_idp: "international_driving_permit",
  document_medical: "medical_certificate",
  document_previous_thai: "previous_thai_licence",
};

export type AiNote = {
  code: string;
  message: string;
  documentIds?: string[];
};

export type AssessmentInput = {
  serviceKind: LicenceServiceKind;
  applicant: ApplicantProfile;
  documents: UploadedDocumentRef[];
  extractions: DocumentExtraction[];
  rules: ScreeningRule[];
  today: string;
  aiAvailable: boolean;
  aiFailed: boolean;
  aiNeedsHumanReview: boolean;
  aiInconsistencies?: AiNote[];
  priorVisitNotes?: string[];
};

export type AssessmentReport = {
  outcome: AssessmentOutcome;
  confidence: number;
  summary: string;
  nextSteps: string;
  findings: ScreeningFinding[];
  checklist: ChecklistRow[];
  disclaimer: string;
};

export function isThaiNational(applicant: ApplicantProfile): boolean {
  const nationality = applicant.nationality.trim().toLowerCase();
  const status = applicant.immigrationStatus.trim().toLowerCase();
  return nationality === "thai" || nationality === "thailand" || status === "thai_citizen";
}

export function customerCategories(kind: LicenceServiceKind, applicant: ApplicantProfile): Set<string> {
  const categories = new Set<string>(["*", "all", serviceGroup(kind)]);
  categories.add(isThaiNational(applicant) ? "thai_national" : "foreign_national");
  if (applicant.hasWorkPermit) categories.add("has_work_permit");
  if (applicant.hasForeignLicence || kind.startsWith("CONVERSION_")) categories.add("has_foreign_licence");
  if (applicant.previouslyHeldThaiLicence) categories.add("held_thai_before");
  if (applicant.foreignLicenceLanguage === "other") categories.add("needs_translation");
  if (applicant.foreignLicenceFormat !== "digital") categories.add("physical_licence");
  return categories;
}

export function ruleApplies(rule: ScreeningRule, kind: LicenceServiceKind, applicant: ApplicantProfile): boolean {
  if (!rule.active) return false;
  const kinds = rule.serviceKinds;
  if (kinds.length > 0 && !kinds.includes("*") && !kinds.includes(kind)) return false;
  const cats = rule.customerCategories;
  if (cats.length === 0 || cats.includes("*")) return true;
  const have = customerCategories(kind, applicant);
  return cats.some((cat) => have.has(cat));
}

export function normalizePersonName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function namesConflict(left: string | null | undefined, right: string | null | undefined): boolean {
  if (!left?.trim() || !right?.trim()) return false;
  const a = normalizePersonName(left);
  const b = normalizePersonName(right);
  if (!a || !b || a === b || a.includes(b) || b.includes(a)) return false;
  const aTokens = new Set(a.split(" ").filter((token) => token.length > 1));
  const shared = b.split(" ").filter((token) => token.length > 1 && aTokens.has(token));
  return shared.length < 2;
}

export function isoDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

export function isPastDate(value: string | null | undefined, today: string): boolean {
  const date = isoDate(value);
  const now = isoDate(today);
  if (!date || !now) return false;
  return date < now;
}

export function ageOn(dateOfBirth: string, today: string): number | null {
  const dob = isoDate(dateOfBirth);
  const now = isoDate(today);
  if (!dob || !now) return null;
  const birth = new Date(`${dob}T00:00:00Z`);
  const current = new Date(`${now}T00:00:00Z`);
  let age = current.getUTCFullYear() - birth.getUTCFullYear();
  const month = current.getUTCMonth() - birth.getUTCMonth();
  if (month < 0 || (month === 0 && current.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age;
}

function activeDocs(documents: UploadedDocumentRef[]): UploadedDocumentRef[] {
  return documents.filter((doc) => doc.active);
}

function hasType(documents: UploadedDocumentRef[], documentType: string): UploadedDocumentRef | undefined {
  return activeDocs(documents).find((doc) => doc.documentType === documentType);
}

function finding(input: ScreeningFinding): ScreeningFinding {
  return input;
}

function documentPresence(
  rule: ScreeningRule,
  documents: UploadedDocumentRef[]
): ScreeningFinding[] {
  const documentType = DOCUMENT_EVALUATOR[rule.evaluatorKey];
  if (!documentType) return [];
  if (hasType(documents, documentType)) return [];
  if (rule.level !== "REQUIRED") return [];
  return [
    finding({
      documentType,
      code: `missing_${documentType}`,
      status: "MISSING",
      severity: "blocker",
      message: `${DOCUMENT_LABELS[documentType] ?? documentType} is missing.`,
      recommendedAction: `Upload a clear photo or PDF of the ${DOCUMENT_LABELS[documentType] ?? documentType}.`,
    }),
  ];
}

function categoryFit(categories: string[], want: { car: boolean; bike: boolean }): "match" | "mismatch" | "unknown" {
  if (categories.length === 0) return "unknown";
  const text = categories.join(" ").toLowerCase();
  const car = /\b(car|automobile|motor car)\b/.test(text) || /\bb\b/.test(text);
  const bike = /motor\s?cycle|motorbike|\bbike\b|\bam\b/.test(text) || /\ba1?\b/.test(text);
  if (want.car && want.bike) return car && bike ? "match" : "mismatch";
  if (want.car) return car ? "match" : "mismatch";
  if (want.bike) return bike ? "match" : "mismatch";
  return "unknown";
}

function wantedCategories(kind: LicenceServiceKind): { car: boolean; bike: boolean } | null {
  const vehicle = vehicleForKind(kind, null);
  if (kind.startsWith("CONVERSION_") && vehicle) {
    return { car: vehicle !== "bike", bike: vehicle !== "car" };
  }
  return null;
}

function evaluateRule(
  rule: ScreeningRule,
  input: AssessmentInput,
  extractionByDoc: Map<string, DocumentExtraction>
): ScreeningFinding[] {
  if (!isKnownEvaluator(rule.evaluatorKey)) {
    if (rule.level !== "REQUIRED") return [];
    return [
      finding({
        code: `unautomated_${rule.ruleKey}`,
        status: "MANUAL",
        severity: "manual",
        message: `The requirements list includes “${rule.name}”, and this check is not automated.`,
        recommendedAction: "A staff member should apply this requirement manually. Do not guess.",
      }),
    ];
  }

  if (rule.evaluatorKey.startsWith("document_")) return documentPresence(rule, input.documents);

  const docs = activeDocs(input.documents);
  const findings: ScreeningFinding[] = [];

  if (rule.evaluatorKey === "check_readability") {
    if (!input.aiAvailable || input.aiFailed) {
      if (docs.length > 0) {
        findings.push(
          finding({
            code: "vision_unavailable",
            status: "MANUAL",
            severity: "manual",
            message: "The documents could not be visually inspected.",
            recommendedAction: "Staff should open each original file. Screening did not confirm that they are readable.",
          })
        );
      }
      return findings;
    }
    for (const doc of docs) {
      const extraction = extractionByDoc.get(doc.id);
      if (!extraction) {
        findings.push(
          finding({
            documentId: doc.id,
            documentType: doc.documentType,
            code: "not_inspected",
            status: "MANUAL",
            severity: "manual",
            message: `${DOCUMENT_LABELS[doc.documentType] ?? doc.documentType} was not inspected.`,
            recommendedAction: "Re-run the assessment or review the original file.",
          })
        );
        continue;
      }
      if (!extraction.readable) {
        findings.push(
          finding({
            documentId: doc.id,
            documentType: doc.documentType,
            code: "unreadable",
            status: "UNSUITABLE",
            severity: "blocker",
            message: `${DOCUMENT_LABELS[doc.documentType] ?? doc.documentType} looks blurry or unreadable.`,
            recommendedAction: "Take a new photo in good light, with all four corners visible, and upload it again.",
          })
        );
      } else if (!extraction.complete) {
        findings.push(
          finding({
            documentId: doc.id,
            documentType: doc.documentType,
            code: "cropped",
            status: "CLARIFICATION",
            severity: "warning",
            message: `${DOCUMENT_LABELS[doc.documentType] ?? doc.documentType} looks cropped or incomplete.`,
            recommendedAction: "Upload a full-page image that shows the entire document.",
          })
        );
      }
    }
    return findings;
  }

  if (rule.evaluatorKey === "check_names") {
    if (!input.aiAvailable || input.aiFailed) return findings;
    const passport = hasType(input.documents, "passport");
    const passportName = passport ? extractionByDoc.get(passport.id)?.holderName : null;
    if (passport && !passportName) {
      findings.push(
        finding({
          documentId: passport.id,
          documentType: "passport",
          code: "passport_name_unread",
          status: "MANUAL",
          severity: "manual",
          message: "The name on the passport could not be read.",
          recommendedAction: "Staff should compare the passport with the application name.",
        })
      );
    }
    const baseline = passportName || input.applicant.fullLegalName;
    for (const doc of docs) {
      const holder = extractionByDoc.get(doc.id)?.holderName;
      if (!holder) continue;
      if (namesConflict(baseline, holder) || namesConflict(input.applicant.fullLegalName, holder)) {
        findings.push(
          finding({
            documentId: doc.id,
            documentType: doc.documentType,
            code: "name_mismatch",
            status: "UNSUITABLE",
            severity: "blocker",
            message: `The name on ${DOCUMENT_LABELS[doc.documentType] ?? doc.documentType} does not match the application.`,
            recommendedAction: "Upload documents that all show the same legal name as the passport.",
          })
        );
      }
    }
    return findings;
  }

  if (rule.evaluatorKey === "check_foreign_expiry") {
    const declared = input.applicant.foreignLicenceExpiryDate;
    const fronts = docs.filter((doc) => doc.documentType === "foreign_licence_front");
    const extracted = fronts
      .map((doc) => extractionByDoc.get(doc.id)?.expiryDate)
      .find((value) => Boolean(value));
    const expiry = extracted || declared;
    if (isPastDate(expiry, input.today)) {
      findings.push(
        finding({
          documentId: fronts[0]?.id,
          documentType: "foreign_licence_front",
          code: "foreign_licence_expired",
          status: "UNSUITABLE",
          severity: "blocker",
          message: "The foreign driving licence appears to be expired.",
          recommendedAction: "Renew the foreign licence, or ask SiamEZ about a first-time Thai application instead of a conversion.",
        })
      );
    } else if (!isoDate(expiry)) {
      findings.push(
        finding({
          documentType: "foreign_licence_front",
          code: "foreign_expiry_unknown",
          status: "MANUAL",
          severity: "manual",
          message: "The foreign licence expiry date could not be confirmed.",
          recommendedAction: "Staff should read the expiry date on the original licence.",
        })
      );
    }
    return findings;
  }

  if (rule.evaluatorKey === "check_categories") {
    const want = wantedCategories(input.serviceKind);
    if (!want) return findings;
    const front = hasType(input.documents, "foreign_licence_front");
    const categories = front ? extractionByDoc.get(front.id)?.categories ?? [] : [];
    const declared = input.applicant.foreignLicenceCategories
      ? input.applicant.foreignLicenceCategories.split(/[,/]| and /i).map((part) => part.trim()).filter(Boolean)
      : [];
    const fit = categoryFit(categories.length ? categories : declared, want);
    if (fit === "mismatch") {
      findings.push(
        finding({
          documentId: front?.id,
          documentType: "foreign_licence_front",
          code: "category_mismatch",
          status: "UNSUITABLE",
          severity: "blocker",
          message: "The foreign licence categories do not appear to cover the requested Thai licence.",
          recommendedAction: "Choose the service that matches the categories printed on the foreign licence.",
        })
      );
    } else if (fit === "unknown") {
      findings.push(
        finding({
          documentId: front?.id,
          documentType: "foreign_licence_front",
          code: "category_unknown",
          status: "MANUAL",
          severity: "manual",
          message: "The licence categories could not be confirmed.",
          recommendedAction: "Staff should check the categories on the original licence.",
        })
      );
    }
    return findings;
  }

  if (rule.evaluatorKey === "check_translation") {
    const needs =
      input.applicant.foreignLicenceLanguage === "other" ||
      docs.some((doc) => doc.documentType.startsWith("foreign_licence") && extractionByDoc.get(doc.id)?.translationLikelyNeeded);
    if (needs) {
      findings.push(
        finding({
          documentType: "foreign_licence_front",
          code: "translation_needed",
          status: "CLARIFICATION",
          severity: "warning",
          message: "The foreign licence may need a certified translation.",
          recommendedAction: "Upload an English licence or arrange a translation before staff prepare a quotation.",
        })
      );
    }
    return findings;
  }

  if (rule.evaluatorKey === "check_alteration") {
    if (!input.aiAvailable || input.aiFailed) return findings;
    for (const doc of docs) {
      const extraction = extractionByDoc.get(doc.id);
      if (!extraction?.possibleAlteration) continue;
      findings.push(
        finding({
          documentId: doc.id,
          documentType: doc.documentType,
          code: "possible_alteration",
          status: "MANUAL",
          severity: "manual",
          message: `${DOCUMENT_LABELS[doc.documentType] ?? "A document"} has inconsistent details that need a person to review. This is not a finding that the document is genuine or altered.`,
          recommendedAction: "Staff should inspect the original before any quotation is sent.",
        })
      );
    }
    return findings;
  }

  if (rule.evaluatorKey === "check_visa_expiry") {
    if (isPastDate(input.applicant.visaExpiryDate, input.today)) {
      findings.push(
        finding({
          documentType: "visa_or_entry",
          code: "visa_expired",
          status: "UNSUITABLE",
          severity: "blocker",
          message: "The visa expiry date on the application is in the past.",
          recommendedAction: "Update the visa information or upload evidence of a current stay.",
        })
      );
    }
    return findings;
  }

  if (rule.evaluatorKey === "check_minimum_age") {
    const age = ageOn(input.applicant.dateOfBirth, input.today);
    const vehicle = vehicleForKind(input.serviceKind, input.applicant.renewalVehicle);
    const minimum = vehicle === "bike" ? 15 : 18;
    if (age != null && age < minimum) {
      findings.push(
        finding({
          code: "age_review",
          status: "MANUAL",
          severity: "manual",
          message: `The date of birth may be under the usual minimum age (${minimum}) for this service.`,
          recommendedAction: "Staff must confirm eligibility. Do not treat this as a legal decision.",
        })
      );
    }
    return findings;
  }

  if (rule.evaluatorKey === "check_immigration_clarity") {
    if (/not sure|unsure|^other$|unknown/i.test(input.applicant.immigrationStatus)) {
      findings.push(
        finding({
          code: "immigration_unclear",
          status: "MANUAL",
          severity: "manual",
          message: "Immigration status is unclear, so eligibility should be checked by staff.",
          recommendedAction: "Ask the customer which visa or stay they currently hold before quoting.",
        })
      );
    }
    return findings;
  }

  if (rule.evaluatorKey === "check_prior_attempt" && input.applicant.failedOrAttemptedBefore) {
    findings.push(
      finding({
        code: "prior_attempt",
        status: "CLARIFICATION",
        severity: "info",
        message: "The customer says they have tried this process before.",
        recommendedAction: input.applicant.attemptNotes?.trim()
          ? `Staff note from the customer: ${input.applicant.attemptNotes.trim()}`
          : "Ask what happened on the previous attempt before booking an appointment.",
      })
    );
  }

  return findings;
}

export function decideOutcome(findings: ScreeningFinding[]): AssessmentOutcome {
  if (findings.some((item) => item.severity === "blocker" || item.severity === "warning")) return "ACTION_REQUIRED";
  if (findings.some((item) => item.severity === "manual")) return "MANUAL_REVIEW";
  return "PASS";
}

export function scoreConfidence(input: {
  outcome: AssessmentOutcome;
  extractions: DocumentExtraction[];
  aiAvailable: boolean;
  aiFailed: boolean;
}): number {
  if (!input.aiAvailable || input.aiFailed) {
    return input.outcome === "ACTION_REQUIRED" ? 0.46 : 0.34;
  }
  const values = input.extractions.map((item) => item.confidence).filter((value) => value > 0);
  const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0.62;
  let score = Math.min(0.92, Math.max(0.45, average));
  if (input.outcome === "MANUAL_REVIEW") score = Math.min(score, 0.6);
  if (input.outcome === "ACTION_REQUIRED") score = Math.min(score, 0.78);
  return Math.round(score * 100) / 100;
}

function dedupe(findings: ScreeningFinding[]): ScreeningFinding[] {
  const seen = new Set<string>();
  const unique: ScreeningFinding[] = [];
  for (const item of findings) {
    const key = `${item.code}|${item.documentId ?? ""}|${item.documentType ?? ""}|${item.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  return unique;
}

export function buildChecklist(input: {
  serviceKind: LicenceServiceKind;
  applicant: ApplicantProfile;
  documents: UploadedDocumentRef[];
  rules: ScreeningRule[];
  findings: ScreeningFinding[];
}): ChecklistRow[] {
  const rows: ChecklistRow[] = [];
  const seen = new Set<string>();
  for (const rule of input.rules) {
    if (!ruleApplies(rule, input.serviceKind, input.applicant)) continue;
    const documentType = DOCUMENT_EVALUATOR[rule.evaluatorKey];
    if (!documentType || seen.has(documentType)) continue;
    seen.add(documentType);
    rows.push(rowFor(documentType, rule.level === "REQUIRED", input));
  }
  for (const doc of activeDocs(input.documents)) {
    if (seen.has(doc.documentType)) continue;
    seen.add(doc.documentType);
    rows.push(rowFor(doc.documentType, false, input));
  }
  return rows;
}

function rowFor(
  documentType: string,
  required: boolean,
  input: { documents: UploadedDocumentRef[]; findings: ScreeningFinding[] }
): ChecklistRow {
  const uploaded = Boolean(hasType(input.documents, documentType));
  const related = input.findings.filter((item) => item.documentType === documentType && item.severity !== "info");
  let status: FindingStatus = "ACCEPTABLE";
  if (!uploaded && required) status = "MISSING";
  else if (related.some((item) => item.status === "UNSUITABLE" || item.status === "MISSING")) status = "UNSUITABLE";
  else if (related.some((item) => item.status === "MANUAL")) status = "MANUAL";
  else if (related.some((item) => item.status === "CLARIFICATION")) status = "CLARIFICATION";
  const recommended =
    related[0]?.recommendedAction ||
    (status === "MISSING"
      ? `Upload the ${DOCUMENT_LABELS[documentType] ?? documentType}.`
      : status === "ACCEPTABLE"
        ? "No customer action needed from this screening."
        : "Staff should review this item.");
  return {
    documentType,
    label: DOCUMENT_LABELS[documentType] ?? documentType,
    required,
    uploaded,
    status,
    findings: related.map((item) => item.message),
    recommendedAction: recommended,
  };
}

export function statusForOutcome(outcome: AssessmentOutcome): "READY_FOR_STAFF_REVIEW" | "CORRECTIONS_REQUIRED" | "MANUAL_REVIEW" {
  if (outcome === "PASS") return "READY_FOR_STAFF_REVIEW";
  if (outcome === "ACTION_REQUIRED") return "CORRECTIONS_REQUIRED";
  return "MANUAL_REVIEW";
}

export function assessApplication(input: AssessmentInput): AssessmentReport {
  const extractionByDoc = new Map(input.extractions.map((item) => [item.documentId, item]));
  const applicable = input.rules.filter((rule) => ruleApplies(rule, input.serviceKind, input.applicant));
  const collected: ScreeningFinding[] = [];

  if (applicable.length === 0) {
    collected.push(
      finding({
        code: "rules_missing",
        status: "MANUAL",
        severity: "manual",
        message: "The requirements database has no active rule for this application.",
        recommendedAction: "Staff should update the requirements list or review the file manually. The system will not guess.",
      })
    );
  }

  for (const rule of applicable) {
    collected.push(...evaluateRule(rule, input, extractionByDoc));
  }

  for (const note of input.aiInconsistencies ?? []) {
    collected.push(
      finding({
        documentId: note.documentIds?.[0],
        code: note.code || "ai_inconsistency",
        status: "MANUAL",
        severity: "manual",
        message: note.message,
        recommendedAction: "Staff should compare the original documents. The model cannot decide legal eligibility.",
      })
    );
  }

  for (const note of input.priorVisitNotes ?? []) {
    collected.push(
      finding({
        code: "prior_dlt_visit",
        status: "CLARIFICATION",
        severity: "info",
        message: note,
        recommendedAction: "Use this earlier DLT result when preparing the next visit. It does not decide eligibility.",
      })
    );
  }

  if (input.aiFailed) {
    collected.push(
      finding({
        code: "ai_failed",
        status: "MANUAL",
        severity: "manual",
        message: "The document check could not be completed by the vision model.",
        recommendedAction: "Re-run the assessment. If it fails again, staff should review the originals.",
      })
    );
  } else if (input.aiNeedsHumanReview) {
    collected.push(
      finding({
        code: "ai_human_review",
        status: "MANUAL",
        severity: "manual",
        message: "The vision model asked for a person to review this file.",
        recommendedAction: "Open the original documents beside these findings before approving a quotation.",
      })
    );
  }

  const findings = dedupe(collected);
  const outcome = decideOutcome(findings);
  const confidence = scoreConfidence({
    outcome,
    extractions: input.extractions,
    aiAvailable: input.aiAvailable,
    aiFailed: input.aiFailed,
  });
  const checklist = buildChecklist({
    serviceKind: input.serviceKind,
    applicant: input.applicant,
    documents: input.documents,
    rules: input.rules,
    findings,
  });

  const summary =
    outcome === "PASS"
      ? "The required documents appear to be present, readable, and consistent. The file can go to SiamEZ staff. This is not Department of Land Transport approval."
      : outcome === "ACTION_REQUIRED"
        ? "Some documents are missing, expired, unreadable, or inconsistent. The customer should correct them before staff spend time on a quotation."
        : "Screening could not finish this file automatically. A staff member needs to review the documents and the eligibility questions.";

  const steps = findings
    .filter((item) => item.severity !== "info")
    .map((item) => item.recommendedAction);
  const nextSteps =
    steps.length > 0
      ? Array.from(new Set(steps)).join("\n")
      : "Staff can review the originals and, if they agree, approve the application for quotation.";

  return {
    outcome,
    confidence,
    summary,
    nextSteps,
    findings,
    checklist,
    disclaimer: SCREENING_DISCLAIMER,
  };
}
