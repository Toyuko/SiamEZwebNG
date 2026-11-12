import { sortForPackage } from "@/lib/dlt-package/order";

export type PackageCheckDocument = {
  id: string;
  applicationId: string;
  documentType: string;
  fileName: string;
  readable: boolean;
  duplicateOfId: string | null;
};

export type PackageFinding = {
  key: string;
  status: string;
};

export type PackageIssue = {
  code: string;
  message: string;
};

export function validateDltPackage(input: {
  applicationId: string;
  serviceKind: string;
  invoiceIssued: boolean;
  requiredDocuments: Array<{ documentType: string; label: string }>;
  documents: PackageCheckDocument[];
  findings: PackageFinding[];
  acknowledgedKeys: string[];
}): { ok: boolean; issues: PackageIssue[] } {
  const issues: PackageIssue[] = [];
  if (!input.serviceKind.trim()) {
    issues.push({ code: "category_missing", message: "Choose a licence category before printing the package." });
  }
  if (!input.invoiceIssued) {
    issues.push({
      code: "invoice_missing",
      message: "The invoice has not been issued yet. Print the DLT package after the existing payment step, or record an override reason.",
    });
  }

  const owned = input.documents.filter((document) => document.applicationId === input.applicationId);
  for (const document of input.documents) {
    if (document.applicationId !== input.applicationId) {
      issues.push({
        code: "wrong_customer",
        message: `${document.fileName} belongs to a different application and was left out.`,
      });
    }
  }

  const included = owned.filter((document) => !document.duplicateOfId);
  for (const required of input.requiredDocuments) {
    if (!included.some((document) => document.documentType === required.documentType)) {
      issues.push({ code: "missing_document", message: `Required document is missing: ${required.label}.` });
    }
  }
  for (const document of included) {
    if (!document.readable) {
      issues.push({
        code: "document_unreadable",
        message: `${document.fileName} is too small or could not be opened. Upload a clearer original. The stored file was not altered.`,
      });
    }
  }

  for (const finding of input.findings) {
    if (finding.status === "ACCEPTABLE" || input.acknowledgedKeys.includes(finding.key)) continue;
    issues.push({
      code: "unacknowledged_finding",
      message: `An AI warning is still open (${finding.key}). Acknowledge it or correct the document before marking the package ready.`,
    });
  }

  const expected = sortForPackage(included).map((document) => document.id);
  if (expected.join("|") !== included.map((document) => document.id).join("|")) {
    issues.push({ code: "wrong_order", message: "Documents are not in the DLT package order." });
  }

  return { ok: issues.length === 0, issues };
}
