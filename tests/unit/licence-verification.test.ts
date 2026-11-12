import { describe, expect, it } from "vitest";
import { assessApplication, decideOutcome, namesConflict, ruleApplies } from "@/lib/licence-verification/assess";
import { toDriverLicenseRequirements } from "@/lib/licence-verification/catalog";
import { validateUpload } from "@/lib/licence-verification/files";
import { invoiceGateDecision } from "@/lib/licence-verification/gate";
import { canAccessApplication } from "@/lib/licence-verification/access";
import { parseAiAssessment } from "@/lib/licence-verification/ai-schema";
import { mockExtraction } from "@/lib/licence-verification/mock-vision";
import { DEFAULT_LICENCE_RULES } from "@/lib/licence-verification/rules-data";
import type { ApplicantProfile, UploadedDocumentRef } from "@/lib/licence-verification/types";

const today = "2026-11-12";

function applicant(overrides: Partial<ApplicantProfile> = {}): ApplicantProfile {
  return {
    fullLegalName: "Jamie Example",
    nationality: "British",
    dateOfBirth: "1990-04-02",
    passportNumber: "X1234567",
    countryOfResidence: "United Kingdom",
    immigrationStatus: "non_immigrant",
    visaExpiryDate: "2027-06-01",
    thaiAddress: "123 Sukhumvit, Bangkok",
    hasResidenceCertificate: true,
    hasWorkPermit: false,
    hasForeignLicence: true,
    foreignLicenceCountry: "United Kingdom",
    foreignLicenceCategories: "B",
    foreignLicenceIssueDate: "2022-01-01",
    foreignLicenceExpiryDate: "2028-01-01",
    foreignLicenceFormat: "physical",
    foreignLicenceLanguage: "english",
    previouslyHeldThaiLicence: false,
    failedOrAttemptedBefore: false,
    attemptNotes: null,
    renewalVehicle: null,
    ...overrides,
  };
}

function docs(types: string[], names: string[] = []): UploadedDocumentRef[] {
  return types.map((documentType, index) => ({
    id: `doc-${documentType}`,
    documentType,
    fileName: names[index] ?? `${documentType}.jpg`,
    active: true,
  }));
}

function extractionsFor(documents: UploadedDocumentRef[], profile: ApplicantProfile) {
  return documents.map((doc) => mockExtraction(doc, profile, today));
}

function run(input: {
  kind?: "CONVERSION_CAR" | "NEW_CAR" | "RENEWAL" | "IDP" | "LOST_REPLACEMENT" | "CONVERSION_MOTORCYCLE";
  profile?: ApplicantProfile;
  documents?: UploadedDocumentRef[];
  extractions?: ReturnType<typeof extractionsFor>;
  aiAvailable?: boolean;
  aiFailed?: boolean;
  aiNeedsHumanReview?: boolean;
  rules?: typeof DEFAULT_LICENCE_RULES;
}) {
  const profile = input.profile ?? applicant();
  const documents = input.documents ?? docs([
    "passport",
    "visa_or_entry",
    "residence_certificate",
    "foreign_licence_front",
    "foreign_licence_back",
  ]);
  return assessApplication({
    serviceKind: input.kind ?? "CONVERSION_CAR",
    applicant: profile,
    documents,
    extractions: input.extractions ?? extractionsFor(documents, profile),
    rules: input.rules ?? DEFAULT_LICENCE_RULES,
    today,
    aiAvailable: input.aiAvailable ?? true,
    aiFailed: input.aiFailed ?? false,
    aiNeedsHumanReview: input.aiNeedsHumanReview ?? false,
  });
}

describe("licence screening", () => {
  it("passes a complete conversion file", () => {
    const report = run({});
    expect(report.outcome).toBe("PASS");
    expect(report.disclaimer).toMatch(/not official Department of Land Transport/i);
    expect(report.confidence).toBeLessThan(1);
  });

  it("asks for a missing residence certificate", () => {
    const report = run({
      documents: docs(["passport", "visa_or_entry", "foreign_licence_front", "foreign_licence_back"]),
    });
    expect(report.outcome).toBe("ACTION_REQUIRED");
    expect(report.findings.some((item) => item.code === "missing_residence_certificate")).toBe(true);
  });

  it("flags an expired foreign licence from the file name fixture", () => {
    const documents = docs(
      ["passport", "visa_or_entry", "residence_certificate", "foreign_licence_front", "foreign_licence_back"],
      ["passport.jpg", "visa.jpg", "residence.jpg", "expired-licence.jpg", "back.jpg"]
    );
    const profile = applicant();
    const report = run({ documents, extractions: extractionsFor(documents, profile), profile });
    expect(report.outcome).toBe("ACTION_REQUIRED");
    expect(report.findings.some((item) => item.code === "foreign_licence_expired")).toBe(true);
  });

  it("flags a name mismatch without calling the document genuine", () => {
    const documents = docs(
      ["passport", "visa_or_entry", "residence_certificate", "foreign_licence_front", "foreign_licence_back"],
      ["passport.jpg", "visa.jpg", "residence.jpg", "mismatch-licence.jpg", "back.jpg"]
    );
    const profile = applicant();
    const report = run({ documents, profile, extractions: extractionsFor(documents, profile) });
    expect(report.outcome).toBe("ACTION_REQUIRED");
    expect(report.findings.some((item) => item.code === "name_mismatch")).toBe(true);
    expect(report.summary.toLowerCase()).not.toMatch(/genuine|forged/);
  });

  it("flags the wrong licence category", () => {
    const documents = docs(
      ["passport", "visa_or_entry", "residence_certificate", "foreign_licence_front", "foreign_licence_back"],
      ["passport.jpg", "visa.jpg", "residence.jpg", "wrong-category.jpg", "back.jpg"]
    );
    const profile = applicant({ foreignLicenceCategories: "Tractor" });
    const report = run({ documents, profile, extractions: extractionsFor(documents, profile) });
    expect(report.findings.some((item) => item.code === "category_mismatch")).toBe(true);
  });

  it("sends a blurry upload back to the customer", () => {
    const documents = docs(
      ["passport", "visa_or_entry", "residence_certificate", "foreign_licence_front", "foreign_licence_back"],
      ["blurry-passport.jpg", "visa.jpg", "residence.jpg", "front.jpg", "back.jpg"]
    );
    const profile = applicant();
    const report = run({ documents, profile, extractions: extractionsFor(documents, profile) });
    expect(report.outcome).toBe("ACTION_REQUIRED");
    expect(report.findings.some((item) => item.code === "unreadable")).toBe(true);
  });

  it("sends an uncertain model response to staff", () => {
    const report = run({ aiNeedsHumanReview: true });
    expect(report.outcome).toBe("MANUAL_REVIEW");
  });

  it("does not guess when the vision model fails", () => {
    const report = run({ aiFailed: true, extractions: [] });
    expect(report.outcome).toBe("MANUAL_REVIEW");
    expect(report.findings.some((item) => item.code === "ai_failed")).toBe(true);
  });

  it("does not guess when the rules database is empty", () => {
    const report = run({ rules: [] });
    expect(report.outcome).toBe("MANUAL_REVIEW");
    expect(report.findings.some((item) => item.code === "rules_missing")).toBe(true);
  });

  it("requires a medical certificate for a new car licence and not a foreign licence", () => {
    const profile = applicant({ hasForeignLicence: false, foreignLicenceFormat: null });
    const report = run({
      kind: "NEW_CAR",
      profile,
      documents: docs(["passport", "visa_or_entry", "residence_certificate"]),
    });
    expect(report.findings.some((item) => item.code === "missing_medical_certificate")).toBe(true);
    expect(report.findings.some((item) => item.code === "missing_foreign_licence_front")).toBe(false);
  });

  it("requires the previous Thai licence for renewal", () => {
    const profile = applicant({ renewalVehicle: "car", hasForeignLicence: false });
    const report = run({
      kind: "RENEWAL",
      profile,
      documents: docs(["passport", "visa_or_entry", "residence_certificate"]),
    });
    expect(report.findings.some((item) => item.code === "missing_previous_thai_licence")).toBe(true);
  });

  it("treats a digital foreign licence back as optional", () => {
    const profile = applicant({ foreignLicenceFormat: "digital" });
    const applies = DEFAULT_LICENCE_RULES.filter((rule) => ruleApplies(rule, "CONVERSION_CAR", profile)).map((rule) => rule.ruleKey);
    expect(applies).not.toContain("foreign_licence_back");
  });

  it("maps services onto the existing price configuration", () => {
    const priced = toDriverLicenseRequirements("CONVERSION_CAR", {
      needsTranslation: true,
      hasResidenceCertificate: true,
    });
    expect(priced.ok).toBe(true);
    if (priced.ok) {
      expect(priced.requirements.category).toBe("conversion");
      expect(priced.requirements.vehicleType).toBe("car");
      expect(priced.requirements.addonTranslationLetter).toBe(true);
    }
    const lost = toDriverLicenseRequirements("LOST_REPLACEMENT", {
      renewalVehicle: "bike",
      needsTranslation: false,
      hasResidenceCertificate: false,
    });
    expect(lost.ok).toBe(true);
    if (lost.ok) expect(lost.requirements.category).toBe("lost_replacement");
  });
});

describe("licence billing gate", () => {
  const application = { id: "app", status: "MANUAL_REVIEW", referenceNumber: "DLV-2026-TEST" };

  it("blocks a quotation and invoice before approval", () => {
    const decision = invoiceGateDecision({ application });
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) expect(decision.message).toMatch(/not approved/i);
  });

  it("allows billing after approval", () => {
    expect(invoiceGateDecision({ application: { ...application, status: "QUOTATION_SENT" } }).allowed).toBe(true);
  });

  it("allows an override only with a recorded reason", () => {
    expect(invoiceGateDecision({ application, overrideReason: "short" }).allowed).toBe(false);
    const allowed = invoiceGateDecision({ application, overrideReason: "Customer is in the office with originals." });
    expect(allowed.allowed).toBe(true);
    if (allowed.allowed) expect(allowed.override).toBe(true);
  });

  it("leaves bookings with no licence application alone", () => {
    expect(invoiceGateDecision({ application: null }).allowed).toBe(true);
  });
});

describe("licence access and uploads", () => {
  it("stops a customer opening another application", () => {
    expect(canAccessApplication({
      applicationUserId: "owner",
      accessToken: "a".repeat(32),
      presentedToken: "b".repeat(32),
      sessionUserId: "other",
      staff: false,
    })).toBe(false);
    expect(canAccessApplication({
      applicationUserId: "owner",
      accessToken: "a".repeat(32),
      sessionUserId: "owner",
      staff: false,
    })).toBe(true);
  });

  it("rejects a file that is not a pdf or image", () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const result = validateUpload({ bytes, size: bytes.byteLength });
    expect(result.ok).toBe(false);
  });

  it("accepts a jpeg header", () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0x00]);
    expect(validateUpload({ bytes, size: bytes.byteLength, declaredType: "image/jpeg" }).ok).toBe(true);
  });

  it("rejects an untrusted model payload", () => {
    expect(() => parseAiAssessment({ documents: [], confidence: 2, needsHumanReview: false, summary: "x" })).toThrow();
  });

  it("does not treat similar legal names as a conflict", () => {
    expect(namesConflict("Jamie Example", "JAMIE EXAMPLE")).toBe(false);
    expect(namesConflict("Jamie Example", "Alex Otherperson")).toBe(true);
  });

  it("keeps warning outcomes as customer corrections", () => {
    expect(decideOutcome([{ code: "x", status: "CLARIFICATION", severity: "warning", message: "m", recommendedAction: "a" }])).toBe("ACTION_REQUIRED");
  });
});
