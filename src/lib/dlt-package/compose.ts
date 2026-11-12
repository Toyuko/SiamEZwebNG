import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, degrees, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { jpegOrientation } from "@/lib/dlt-package/exif";

const A4: [number, number] = [595.28, 841.89];

export type PackagePdfDocument = {
  label: string;
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
  duplicate: boolean;
};

export type PackagePdfInput = {
  kind: "complete" | "cover";
  referenceNumber: string;
  customerName: string;
  nationality: string;
  passportNumber: string;
  dateOfBirth: string;
  serviceTitle: string;
  category: string;
  officeName: string;
  contact: string;
  checklist: Array<{ name: string; level: string; form: string; copies: number; verified: string }>;
  documents: PackagePdfDocument[];
  staffName: string;
  appointment: string;
  outstanding: string[];
  instructions: string;
};

let fontBytes: Uint8Array | null = null;

async function sarabun(): Promise<Uint8Array> {
  if (!fontBytes) {
    fontBytes = await readFile(path.join(process.cwd(), "src/lib/dlt-package/fonts/Sarabun-Regular.ttf"));
  }
  return fontBytes;
}

export async function buildDltPackagePdf(input: PackagePdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(await sarabun(), { subset: true });
  const reference = `SiamEZ ${input.referenceNumber}`;

  drawSheet(doc, font, reference, "Application summary", [
    `Reference: ${input.referenceNumber}`,
    `Customer: ${input.customerName}`,
    `Nationality: ${input.nationality}`,
    `Passport number: ${input.passportNumber}`,
    `Date of birth: ${input.dateOfBirth}`,
    `Requested licence: ${input.serviceTitle}`,
    `Category: ${input.category}`,
    `DLT office: ${input.officeName}`,
    `Contact: ${input.contact}`,
    "",
    "This package is SiamEZ's print preparation. It is not a Department of Land Transport decision.",
  ]);

  drawSheet(doc, font, reference, "Document checklist", [
    "Document | Required | Form | Copies | Screening | Staff check",
    ...input.checklist.map(
      (row) => `${row.name} | ${row.level} | ${row.form} | ${row.copies} | ${row.verified} | [ ]`
    ),
    "",
    "Originals listed above must be carried to the office. This file does not replace them.",
  ]);

  if (input.kind === "complete") {
    for (const document of input.documents) {
      if (document.duplicate) continue;
      drawSheet(doc, font, reference, document.label, [
        document.fileName,
        "The following pages are the customer's original upload. They have not been edited.",
        "Only the page orientation is corrected when the photo itself contains an orientation flag.",
      ]);
      await appendOriginal(doc, document);
    }
  }

  drawSheet(doc, font, reference, "SiamEZ staff cover sheet", [
    `Customer: ${input.customerName}`,
    `Reference: ${input.referenceNumber}`,
    `Service: ${input.serviceTitle}`,
    `DLT destination: ${input.officeName}`,
    `Assigned staff: ${input.staffName}`,
    `Appointment: ${input.appointment}`,
    "",
    "Document inventory",
    ...input.documents.map((document) => `${document.duplicate ? "Duplicate, not printed" : "Included"} — ${document.label} (${document.fileName})`),
    "",
    "Outstanding items",
    ...(input.outstanding.length ? input.outstanding : ["None recorded."]),
    "",
    "Internal instructions",
    input.instructions || "Take the originals that the checklist marks as original.",
  ]);

  drawSheet(doc, font, reference, "Final staff checklist", [
    "[ ] All required documents are in this package.",
    "[ ] Originals have been collected where the checklist asks for them.",
    "[ ] Copies are prepared.",
    "[ ] Translations and certifications are ready where they apply.",
    "[ ] The customer name matches across the documents.",
    "[ ] The DLT appointment is confirmed in Smart Queue.",
    "[ ] The customer has been told what else to bring.",
    "",
    "Do not mark this package ready if a line above is still open.",
  ]);

  return doc.save();
}

function drawSheet(doc: PDFDocument, font: PDFFont, reference: string, title: string, lines: string[]) {
  const pages: PDFPage[] = [];
  let page = doc.addPage(A4);
  pages.push(page);
  let y = 790;
  page.drawText(safe(title), { x: 48, y, size: 16, font, color: rgb(0.1, 0.12, 0.16) });
  y -= 28;
  for (const line of lines.flatMap((line) => wrap(safe(line), font, 11, 500))) {
    if (y < 56) {
      page = doc.addPage(A4);
      pages.push(page);
      y = 790;
    }
    page.drawText(line, { x: 48, y, size: 11, font, color: rgb(0.1, 0.1, 0.1) });
    y -= 16;
  }
  for (const item of pages) stamp(item, font, reference);
}

function stamp(page: PDFPage, font: PDFFont, reference: string) {
  page.drawText(safe(reference), { x: 48, y: 28, size: 9, font, color: rgb(0.25, 0.25, 0.25) });
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  if (!text) return [""];
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/)) {
    const pieces = splitLong(word, font, size, maxWidth);
    for (const piece of pieces) {
      const next = current ? `${current} ${piece}` : piece;
      if (current && font.widthOfTextAtSize(next, size) > maxWidth) {
        lines.push(current);
        current = piece;
      } else {
        current = next;
      }
    }
  }
  if (current) lines.push(current);
  return lines;
}

function splitLong(word: string, font: PDFFont, size: number, maxWidth: number): string[] {
  if (font.widthOfTextAtSize(word, size) <= maxWidth) return [word];
  const parts: string[] = [];
  let current = "";
  for (const character of word) {
    const next = current + character;
    if (current && font.widthOfTextAtSize(next, size) > maxWidth) {
      parts.push(current);
      current = character;
    } else {
      current = next;
    }
  }
  if (current) parts.push(current);
  return parts;
}

function safe(text: string): string {
  return text.replace(/[^\u0009\u000A\u000D\u0020-\u007E\u0E00-\u0E7F]/g, " ");
}

async function appendOriginal(doc: PDFDocument, document: PackagePdfDocument) {
  try {
    if (document.mimeType === "application/pdf") {
      const source = await PDFDocument.load(document.bytes, { ignoreEncryption: true });
      const pages = await doc.copyPages(source, source.getPageIndices());
      for (const page of pages) doc.addPage(page);
      return;
    }
    const image =
      document.mimeType === "image/png" ? await doc.embedPng(document.bytes) : await doc.embedJpg(document.bytes);
    const page = doc.addPage(A4);
    const orientation = document.mimeType === "image/jpeg" ? jpegOrientation(document.bytes) : 1;
    const swapped = orientation === 6 || orientation === 8;
    const sourceWidth = swapped ? image.height : image.width;
    const sourceHeight = swapped ? image.width : image.height;
    const scale = Math.min(520 / sourceWidth, 760 / sourceHeight, 1);
    const width = sourceWidth * scale;
    const height = sourceHeight * scale;
    const x = (A4[0] - width) / 2;
    const y = (A4[1] - height) / 2;
    if (orientation === 6) {
      page.drawImage(image, { x: x + width, y, width: height, height: width, rotate: degrees(90) });
    } else if (orientation === 8) {
      page.drawImage(image, { x, y: y + height, width: height, height: width, rotate: degrees(-90) });
    } else if (orientation === 3) {
      page.drawImage(image, { x: x + width, y: y + height, width, height, rotate: degrees(180) });
    } else {
      page.drawImage(image, { x, y, width, height });
    }
  } catch {
    const page = doc.addPage(A4);
    page.drawText("This original could not be placed in the PDF.", { x: 48, y: 780, size: 12 });
    page.drawText("Download the individual file. The upload itself was not changed.", { x: 48, y: 760, size: 11 });
  }
}
