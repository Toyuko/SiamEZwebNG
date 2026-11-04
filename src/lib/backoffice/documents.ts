export type ExtractedDoc = {
  label: string;
  fields: Record<string, string>;
  ocrApplied: boolean;
  warnings?: string[];
};

export function requiredDocumentNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object" && "name" in item && typeof item.name === "string") {
        return item.name.trim();
      }
      return "";
    })
    .filter((name) => name.length > 0);
}

export function missingRequiredDocuments(
  required: unknown,
  uploaded: { name: string; documentType: string | null }[]
): string[] {
  const names = requiredDocumentNames(required);
  const have = uploaded.map((doc) => `${doc.name} ${doc.documentType ?? ""}`.toLowerCase());
  return names.filter((name) => !have.some((haystack) => haystack.includes(name.toLowerCase())));
}

export const DOCUMENT_REVIEW_DISCLAIMER =
  "This is a staff aid only. It does not certify authenticity, legal validity, or that a document is acceptable to a government office. Uncertain or mismatched details need a person to check the original.";

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z\u0E00-\u0E7F\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function reviewExtractedDocuments(docs: ExtractedDoc[]): {
  lines: string[];
  mismatches: string[];
  requiresStaffReview: true;
} {
  const lines: string[] = [DOCUMENT_REVIEW_DISCLAIMER];
  const mismatches: string[] = [];
  if (docs.length === 0) {
    lines.push("No documents were attached to this record.");
    return { lines, mismatches, requiresStaffReview: true };
  }
  const names: { label: string; name: string }[] = [];
  for (const doc of docs) {
    const name = (doc.fields.name ?? doc.fields.fullName ?? "").trim();
    const kind = doc.fields.documentType || "unspecified";
    const ocr = doc.ocrApplied ? "text extracted" : "extraction incomplete";
    lines.push(`${doc.label}: type ${kind}, ${ocr}${name ? `, name "${name}"` : ", name not read"}.`);
    if (doc.warnings?.length) lines.push(`  Note: ${doc.warnings.join(" ")}`);
    if (name) names.push({ label: doc.label, name: normalizeName(name) });
    else mismatches.push(`${doc.label}: name could not be read`);
  }
  const distinct = [...new Set(names.map((item) => item.name))];
  if (names.length < 2) {
    lines.push("Not enough names were read to compare documents.");
    mismatches.push("incomplete-comparison");
  } else if (distinct.length > 1) {
    lines.push("Names do not match across the documents that were read.");
    mismatches.push("name-mismatch");
  } else {
    lines.push("The names that were read match. A staff member still needs to check the originals.");
  }
  lines.push("Suggested next step: staff review before processing.");
  return { lines, mismatches, requiresStaffReview: true };
}
