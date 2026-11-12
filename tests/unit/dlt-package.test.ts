import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { appointmentUpdateError } from "@/lib/dlt-package/appointments";
import { buildDltPackagePdf } from "@/lib/dlt-package/compose";
import { isReadableUpload, jpegOrientation } from "@/lib/dlt-package/exif";
import { markDuplicates, sortForPackage } from "@/lib/dlt-package/order";
import { validateDltPackage } from "@/lib/dlt-package/validate";

const owned = (over: Partial<{ id: string; documentType: string; fileName: string; readable: boolean; duplicateOfId: string | null }> = {}) => ({
  id: "doc-1",
  applicationId: "app-1",
  documentType: "passport",
  fileName: "passport.png",
  readable: true,
  duplicateOfId: null,
  ...over,
});

describe("DLT package order", () => {
  it("keeps the earliest file and marks a later identical upload as a duplicate", () => {
    const marked = markDuplicates([
      { id: "b", sha256: "same", createdAt: "2026-02-01T00:00:00.000Z" },
      { id: "a", sha256: "same", createdAt: "2026-01-01T00:00:00.000Z" },
    ]);
    const first = marked.find((item) => item.id === "a");
    const second = marked.find((item) => item.id === "b");
    expect(first?.duplicateOfId).toBeNull();
    expect(second?.duplicateOfId).toBe("a");
  });

  it("sorts a passport before a medical certificate and puts duplicates last", () => {
    const sorted = sortForPackage([
      { documentType: "medical_certificate", fileName: "med.png", duplicateOfId: null },
      { documentType: "passport", fileName: "passport.png", duplicateOfId: "earlier" },
      { documentType: "passport", fileName: "passport.png", duplicateOfId: null },
    ]);
    expect(sorted.map((item) => `${item.documentType}:${item.duplicateOfId ?? "keep"}`)).toEqual([
      "passport:keep",
      "medical_certificate:keep",
      "passport:earlier",
    ]);
  });
});

describe("DLT package validation", () => {
  const base = {
    applicationId: "app-1",
    serviceKind: "CONVERSION_CAR",
    invoiceIssued: true,
    requiredDocuments: [{ documentType: "passport", label: "Passport identity page" }],
    findings: [],
    acknowledgedKeys: [],
  };

  it("accepts a readable passport after the invoice exists", () => {
    const result = validateDltPackage({ ...base, documents: [owned()] });
    expect(result.ok).toBe(true);
  });

  it("blocks a missing invoice, an unreadable file, and an open warning", () => {
    const result = validateDltPackage({
      ...base,
      invoiceIssued: false,
      documents: [owned({ readable: false })],
      findings: [{ key: "name_mismatch:passport", status: "MANUAL" }],
    });
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["invoice_missing", "document_unreadable", "unacknowledged_finding"])
    );
  });

  it("allows an acknowledged warning and rejects another customer's file", () => {
    const acknowledged = validateDltPackage({
      ...base,
      documents: [owned()],
      findings: [{ key: "name_mismatch:passport", status: "MANUAL" }],
      acknowledgedKeys: ["name_mismatch:passport"],
    });
    expect(acknowledged.ok).toBe(true);
    const foreign = validateDltPackage({
      ...base,
      documents: [owned(), owned({ id: "other", applicationId: "app-2", fileName: "other.png" })],
    });
    expect(foreign.issues.some((issue) => issue.code === "wrong_customer")).toBe(true);
  });
});

describe("DLT appointments", () => {
  it("refuses to mark an appointment confirmed without a DLT confirmation number", () => {
    expect(appointmentUpdateError({
      status: "CONFIRMED",
      confirmationNumber: "",
      officeActive: true,
      officeConfigured: true,
      officeSupportsService: true,
      appointmentDate: "2026-12-01",
    })).toMatch(/confirmation number/i);
  });

  it("refuses an office that does not handle the licence category", () => {
    expect(appointmentUpdateError({
      status: "BOOKING_IN_PROGRESS",
      confirmationNumber: "",
      officeActive: true,
      officeConfigured: true,
      officeSupportsService: false,
      appointmentDate: "",
    })).toMatch(/not configured/i);
  });
});

describe("document orientation", () => {
  it("reads a JPEG orientation flag and leaves other files upright", () => {
    const bytes = jpegWithOrientation(6);
    expect(jpegOrientation(bytes)).toBe(6);
    expect(jpegOrientation(Uint8Array.from([0x89, 0x50, 0x4e, 0x47]))).toBe(1);
    expect(isReadableUpload({ mimeType: "image/png", bytes: new Uint8Array(70) })).toBe(false);
    expect(isReadableUpload({ mimeType: "image/png", bytes: new Uint8Array(900) })).toBe(true);
  });
});

describe("package pdf", () => {
  it("builds an A4 package and keeps an embedded original PDF page", async () => {
    const original = await PDFDocument.create();
    original.addPage([200, 200]);
    const originalBytes = await original.save();
    const png = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"));
    const pdf = await buildDltPackagePdf({
      kind: "complete",
      referenceNumber: "DLV-2026-TEST",
      customerName: "Jamie Example",
      nationality: "British",
      passportNumber: "X1234567",
      dateOfBirth: "1990-04-02",
      serviceTitle: "Foreign licence conversion — car",
      category: "Conversion",
      officeName: "Not selected",
      contact: "jamie.example@example.com",
      checklist: [{ name: "Passport identity page", level: "Required", form: "original and copy", copies: 1, verified: "Present" }],
      documents: [
        { label: "Passport identity page", fileName: "sample.png", mimeType: "image/png", bytes: png, duplicate: false },
        { label: "Duplicate", fileName: "copy.pdf", mimeType: "application/pdf", bytes: originalBytes, duplicate: true },
        { label: "Visa", fileName: "visa.pdf", mimeType: "application/pdf", bytes: originalBytes, duplicate: false },
      ],
      staffName: "Unassigned",
      appointment: "Not booked",
      outstanding: [],
      instructions: "นำต้นฉบับไปด้วย",
    });
    const loaded = await PDFDocument.load(pdf);
    expect(loaded.getPageCount()).toBeGreaterThan(5);
  });
});

function jpegWithOrientation(orientation: number): Uint8Array {
  const tiff = [
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00,
    0x01, 0x00,
    0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, orientation, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
  ];
  const length = tiff.length + 2;
  return Uint8Array.from([
    0xff, 0xd8,
    0xff, 0xe1, (length >> 8) & 0xff, length & 0xff,
    ...tiff,
    0xff, 0xd9,
  ]);
}
