import { describe, expect, it } from "vitest";
import {
  MockOcrProvider,
  applyWizardPrefill,
  extractDocumentFields,
  extractedFieldsToWizardPrefill,
  formatMissingDocumentWarning,
  getMissingDocuments,
  resolveOcrProvider,
  validateWizardDocument,
} from "@/lib/documents";
import type { WizardRequiredDocument } from "@/config/wizards/types";

function file(name: string, type: string, size: number): File {
  const blob = new Blob([new Uint8Array(Math.min(size, 64))], { type });
  const f = new File([blob], name, { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
}

describe("validateWizardDocument", () => {
  it("rejects empty, oversized, and wrong types", () => {
    expect(validateWizardDocument(file("a.png", "image/png", 0))).toBe(
      "File is empty."
    );
    expect(
      validateWizardDocument(file("big.pdf", "application/pdf", 11 * 1024 * 1024))
    ).toBe("File too large (max 10 MB).");
    expect(
      validateWizardDocument(file("note.exe", "application/octet-stream", 100))
    ).toBe("Only PDF, JPG, and PNG files are allowed.");
  });

  it("accepts pdf/jpg/png", () => {
    expect(validateWizardDocument(file("a.pdf", "application/pdf", 100))).toBeNull();
    expect(validateWizardDocument(file("a.jpg", "image/jpeg", 100))).toBeNull();
    expect(validateWizardDocument(file("a.png", "image/png", 100))).toBeNull();
  });
});

describe("extractDocumentFields (mock OCR)", () => {
  it("uses mock provider without OCR env keys", async () => {
    const provider = resolveOcrProvider({});
    expect(provider.id).toBe("mock");

    const result = await extractDocumentFields(
      { fileName: "Jane_Doe_passport.pdf", documentType: "passport" },
      provider
    );
    expect(result.ocrApplied).toBe(false);
    expect(result.provider).toBe("mock");
    expect(result.fields.documentType).toBe("passport");
    expect(result.fields.name).toMatch(/Jane/i);
    expect(result.warnings?.length).toBeGreaterThan(0);
  });

  it("tags payment receipts from documentType", async () => {
    const result = await new MockOcrProvider().extract({
      fileName: "slip.jpg",
      documentType: "payment_receipt",
    });
    expect(result.fields.documentType).toBe("payment_receipt");
  });

  it("notes env key presence without applying real OCR", async () => {
    const provider = resolveOcrProvider({ OCR_API_KEY: "test-key-1234" });
    expect(provider.id).toBe("env");
    const result = await provider.extract({ fileName: "doc.pdf" });
    expect(result.ocrApplied).toBe(false);
    expect(result.warnings?.some((w) => w.includes("test"))).toBe(true);
  });
});

describe("getMissingDocuments", () => {
  const required: WizardRequiredDocument[] = [
    { id: "passport", label: "Passport", documentType: "passport", required: true },
    {
      id: "affidavit",
      label: "Affidavit",
      documentType: "affidavit",
      required: false,
    },
  ];

  it("reports missing required and optional docs", () => {
    const empty = getMissingDocuments(required, []);
    expect(empty.missing.map((m) => m.id)).toEqual(["passport"]);
    expect(empty.optionalMissing.map((m) => m.id)).toEqual(["affidavit"]);
    expect(formatMissingDocumentWarning(empty)).toMatch(/Passport/);
  });

  it("matches by documentType or requiredId", () => {
    const byType = getMissingDocuments(required, [
      { documentType: "passport" },
    ]);
    expect(byType.missing).toHaveLength(0);
    expect(byType.satisfied.map((s) => s.id)).toContain("passport");

    const byId = getMissingDocuments(required, [{ requiredId: "affidavit" }]);
    expect(byId.optionalMissing).toHaveLength(0);
    expect(byId.satisfied.map((s) => s.id)).toContain("affidavit");
  });

  it("handles undefined checklist", () => {
    const result = getMissingDocuments(undefined, [{ documentType: "x" }]);
    expect(result.missing).toHaveLength(0);
    expect(formatMissingDocumentWarning(result)).toBeNull();
  });
});

describe("extractedFieldsToWizardPrefill", () => {
  it("fills empty form fields and skips occupied ones", () => {
    const patch = extractedFieldsToWizardPrefill(
      { name: "Ada Lovelace", email: "ada@example.com", unknown: "x" },
      {
        currentValues: { name: "Already Set", email: "" },
      }
    );
    expect(patch.values).toEqual({ email: "ada@example.com" });
    expect(patch.skipped).toContain("name");
    expect(patch.skipped).toContain("unknown");
  });

  it("respects allowFields from requiredDocuments.prefillFields", () => {
    const patch = extractedFieldsToWizardPrefill(
      { name: "Ada", nationality: "British" },
      {
        currentValues: {},
        allowFields: ["partnerNationality"],
      }
    );
    expect(patch.values).toEqual({ partnerNationality: "British" });
    expect(patch.skipped).toContain("name");
  });

  it("applyWizardPrefill writes via setValue", () => {
    const written: Record<string, string> = {};
    applyWizardPrefill(
      { values: { name: "Ada" }, skipped: [] },
      (k, v) => {
        written[k] = v;
      }
    );
    expect(written).toEqual({ name: "Ada" });
  });
});
