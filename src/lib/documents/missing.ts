import type { WizardRequiredDocument } from "@/config/wizards/types";

export interface UploadedDocumentRef {
  /** Config `requiredDocuments[].id` or Document.documentType */
  documentType?: string | null;
  /** Alternate match key (same as documentType when unset). */
  requiredId?: string | null;
  name?: string;
}

export interface MissingDocumentResult {
  missing: WizardRequiredDocument[];
  satisfied: WizardRequiredDocument[];
  optionalMissing: WizardRequiredDocument[];
}

function matchesRequirement(
  req: WizardRequiredDocument,
  uploaded: UploadedDocumentRef
): boolean {
  const type = (uploaded.documentType ?? "").toLowerCase();
  const reqId = (uploaded.requiredId ?? "").toLowerCase();
  const target = (req.documentType ?? req.id).toLowerCase();
  if (type && type === target) return true;
  if (reqId && reqId === req.id.toLowerCase()) return true;
  if (type && type === req.id.toLowerCase()) return true;
  return false;
}

/**
 * Compare wizard `requiredDocuments` config against uploaded docs.
 * Required items (required !== false) land in `missing` when absent;
 * optional items land in `optionalMissing`.
 */
export function getMissingDocuments(
  requiredDocuments: WizardRequiredDocument[] | undefined,
  uploaded: UploadedDocumentRef[]
): MissingDocumentResult {
  const list = requiredDocuments ?? [];
  const missing: WizardRequiredDocument[] = [];
  const satisfied: WizardRequiredDocument[] = [];
  const optionalMissing: WizardRequiredDocument[] = [];

  for (const req of list) {
    const found = uploaded.some((u) => matchesRequirement(req, u));
    const isRequired = req.required !== false;
    if (found) {
      satisfied.push(req);
    } else if (isRequired) {
      missing.push(req);
    } else {
      optionalMissing.push(req);
    }
  }

  return { missing, satisfied, optionalMissing };
}

export function formatMissingDocumentWarning(
  result: MissingDocumentResult
): string | null {
  if (result.missing.length === 0) return null;
  const labels = result.missing.map((m) => m.label).join(", ");
  return `Missing recommended documents: ${labels}. You can continue and upload later.`;
}
