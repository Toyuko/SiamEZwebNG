import { createHash } from "node:crypto";

export const PACKAGE_DOCUMENT_ORDER = [
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

/** Operational print guidance. This is not a DLT statute. */
export const COPY_GUIDANCE: Record<string, { form: "original" | "copy" | "original_and_copy"; copies: number }> = {
  passport: { form: "original_and_copy", copies: 1 },
  visa_or_entry: { form: "copy", copies: 1 },
  residence_certificate: { form: "original", copies: 1 },
  work_permit: { form: "original_and_copy", copies: 1 },
  foreign_licence_front: { form: "original_and_copy", copies: 1 },
  foreign_licence_back: { form: "copy", copies: 1 },
  international_driving_permit: { form: "original", copies: 1 },
  medical_certificate: { form: "original", copies: 1 },
  previous_thai_licence: { form: "original", copies: 1 },
  other: { form: "copy", copies: 1 },
};

export function documentOrderIndex(documentType: string): number {
  const index = PACKAGE_DOCUMENT_ORDER.indexOf(documentType as (typeof PACKAGE_DOCUMENT_ORDER)[number]);
  return index === -1 ? PACKAGE_DOCUMENT_ORDER.length : index;
}

export function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export type OrderedDocument<T> = T & { duplicateOfId: string | null };

/** Keeps the earliest file for each hash and marks later copies as duplicates. */
export function markDuplicates<T extends { id: string; sha256: string; createdAt: string }>(documents: T[]): OrderedDocument<T>[] {
  const sorted = [...documents].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  const firstByHash = new Map<string, string>();
  return sorted.map((document) => {
    const first = firstByHash.get(document.sha256);
    if (!first) {
      firstByHash.set(document.sha256, document.id);
      return { ...document, duplicateOfId: null };
    }
    return { ...document, duplicateOfId: first };
  });
}

export function sortForPackage<T extends { documentType: string; fileName: string; duplicateOfId: string | null }>(documents: T[]): T[] {
  return [...documents].sort((a, b) => {
    if (Boolean(a.duplicateOfId) !== Boolean(b.duplicateOfId)) return a.duplicateOfId ? 1 : -1;
    const order = documentOrderIndex(a.documentType) - documentOrderIndex(b.documentType);
    if (order !== 0) return order;
    return a.fileName.localeCompare(b.fileName);
  });
}
