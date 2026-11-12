import type { ApplicantProfile, DocumentExtraction, UploadedDocumentRef } from "@/lib/licence-verification/types";

function plusDays(today: string, days: number): string {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Deterministic vision stand-in for tests and LICENCE_AI_MODE=mock. Never used as a silent production fallback. */
export function mockExtraction(
  doc: UploadedDocumentRef,
  applicant: ApplicantProfile,
  today: string
): DocumentExtraction {
  const name = doc.fileName.toLowerCase();
  const blurry = name.includes("blurry") || name.includes("unreadable");
  const cropped = name.includes("cropped");
  const expired = name.includes("expired");
  const mismatch = name.includes("mismatch");
  const wrongCategory = name.includes("wrong-category") || name.includes("wrongcategory");
  const suspicious = name.includes("suspicious");
  const declared = applicant.foreignLicenceCategories
    ? applicant.foreignLicenceCategories.split(/[,/]/).map((part) => part.trim()).filter(Boolean)
    : ["B"];

  return {
    documentId: doc.id,
    detectedType: doc.documentType,
    holderName: mismatch ? "Alex Otherperson" : applicant.fullLegalName,
    documentNumber: doc.documentType === "passport" ? applicant.passportNumber : "MOCK-000",
    issueDate: "2022-01-15",
    expiryDate: expired ? "2020-01-01" : doc.documentType === "visa_or_entry" && applicant.visaExpiryDate
      ? applicant.visaExpiryDate
      : plusDays(today, 400),
    categories: doc.documentType.startsWith("foreign_licence")
      ? wrongCategory
        ? ["Tractor"]
        : declared
      : [],
    issuingCountry: applicant.foreignLicenceCountry,
    readable: !blurry,
    complete: !cropped && !blurry,
    possibleAlteration: suspicious,
    translationLikelyNeeded: applicant.foreignLicenceLanguage === "other",
    notes: blurry ? "Image is too blurry to read." : "Mock inspection only. Not a genuineness opinion.",
    confidence: blurry ? 0.28 : 0.86,
  };
}

export function mockAiResult(
  documents: UploadedDocumentRef[],
  applicant: ApplicantProfile,
  today: string
): {
  extractions: DocumentExtraction[];
  needsHumanReview: boolean;
  inconsistencies: { code: string; message: string; documentIds: string[] }[];
  summary: string;
  confidence: number;
} {
  const active = documents.filter((doc) => doc.active);
  const extractions = active.map((doc) => mockExtraction(doc, applicant, today));
  const needsHumanReview = extractions.some((item) => item.possibleAlteration);
  return {
    extractions,
    needsHumanReview,
    inconsistencies: [],
    summary: "Mock document inspection for automated tests. This does not verify a real identity document.",
    confidence: extractions.length
      ? extractions.reduce((sum, item) => sum + item.confidence, 0) / extractions.length
      : 0.5,
  };
}
