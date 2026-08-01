/**
 * Local (no external API) case summarizer for staff workspace.
 * Builds a short headline + bullet list from structured case fields.
 */

export type CaseSummaryInput = {
  caseNumber: string;
  status: string;
  serviceName: string;
  clientName: string;
  clientEmail?: string | null;
  isGuest?: boolean;
  documentCount: number;
  noteCount: number;
  invoiceCount: number;
  paymentCount: number;
  quoteCount: number;
  eventCount: number;
  staffNames: string[];
  latestNotePreview?: string | null;
  formDataKeys?: string[];
  locale?: "en" | "th";
};

export type CaseSummary = {
  headline: string;
  bullets: string[];
  attention: string[];
};

function statusPhrase(status: string, locale: "en" | "th"): string {
  const en: Record<string, string> = {
    new: "newly opened",
    under_review: "under review",
    quoted: "quoted",
    awaiting_payment: "awaiting payment",
    paid: "paid",
    in_progress: "in progress",
    pending_docs: "waiting on documents",
    completed: "completed",
    cancelled: "cancelled",
  };
  const th: Record<string, string> = {
    new: "เปิดใหม่",
    under_review: "กำลังตรวจสอบ",
    quoted: "มีใบเสนอราคา",
    awaiting_payment: "รอชำระเงิน",
    paid: "ชำระแล้ว",
    in_progress: "กำลังดำเนินการ",
    pending_docs: "รอเอกสาร",
    completed: "เสร็จสิ้น",
    cancelled: "ยกเลิก",
  };
  const map = locale === "th" ? th : en;
  return map[status] ?? status.replace(/_/g, " ");
}

export function summarizeCase(input: CaseSummaryInput): CaseSummary {
  const locale = input.locale ?? "en";
  const statusLabel = statusPhrase(input.status, locale);
  const assigned =
    input.staffNames.length > 0
      ? input.staffNames.join(", ")
      : locale === "th"
        ? "ยังไม่มอบหมาย"
        : "unassigned";

  const headline =
    locale === "th"
      ? `${input.caseNumber}: ${input.serviceName} สำหรับ ${input.clientName} (${statusLabel})`
      : `${input.caseNumber}: ${input.serviceName} for ${input.clientName} (${statusLabel})`;

  const bullets: string[] = [];
  if (locale === "th") {
    bullets.push(`ลูกค้า: ${input.clientName}${input.isGuest ? " (แขก)" : ""}`);
    if (input.clientEmail) bullets.push(`อีเมล: ${input.clientEmail}`);
    bullets.push(`เจ้าหน้าที่: ${assigned}`);
    bullets.push(
      `เอกสาร ${input.documentCount} · บันทึก ${input.noteCount} · ใบแจ้งหนี้ ${input.invoiceCount} · การชำระ ${input.paymentCount}`
    );
    if (input.quoteCount > 0) bullets.push(`ใบเสนอราคา: ${input.quoteCount}`);
    if (input.eventCount > 0) bullets.push(`นัดหมาย/กำหนดการ: ${input.eventCount}`);
    if (input.formDataKeys && input.formDataKeys.length > 0) {
      bullets.push(`ฟิลด์ฟอร์ม: ${input.formDataKeys.slice(0, 8).join(", ")}`);
    }
    if (input.latestNotePreview) {
      bullets.push(`บันทึกล่าสุด: ${input.latestNotePreview}`);
    }
  } else {
    bullets.push(`Client: ${input.clientName}${input.isGuest ? " (guest)" : ""}`);
    if (input.clientEmail) bullets.push(`Email: ${input.clientEmail}`);
    bullets.push(`Staff: ${assigned}`);
    bullets.push(
      `Docs ${input.documentCount} · Notes ${input.noteCount} · Invoices ${input.invoiceCount} · Payments ${input.paymentCount}`
    );
    if (input.quoteCount > 0) bullets.push(`Quotes on file: ${input.quoteCount}`);
    if (input.eventCount > 0) bullets.push(`Scheduled events: ${input.eventCount}`);
    if (input.formDataKeys && input.formDataKeys.length > 0) {
      bullets.push(`Form fields: ${input.formDataKeys.slice(0, 8).join(", ")}`);
    }
    if (input.latestNotePreview) {
      bullets.push(`Latest note: ${input.latestNotePreview}`);
    }
  }

  const attention: string[] = [];
  if (input.documentCount === 0 && ["pending_docs", "under_review", "in_progress", "new"].includes(input.status)) {
    attention.push(
      locale === "th" ? "ยังไม่มีเอกสารแนบ — ควรขอเอกสารจากลูกค้า" : "No documents attached — request client uploads"
    );
  }
  if (input.staffNames.length === 0 && !["completed", "cancelled"].includes(input.status)) {
    attention.push(locale === "th" ? "ยังไม่ได้มอบหมายเจ้าหน้าที่" : "No staff assigned");
  }
  if (
    input.invoiceCount === 0 &&
    ["quoted", "awaiting_payment", "in_progress"].includes(input.status)
  ) {
    attention.push(
      locale === "th" ? "ยังไม่มีใบแจ้งหนี้ — พิจารณาสร้างจากวิซาร์ด" : "No invoice yet — consider creating one via the wizard"
    );
  }
  if (input.status === "awaiting_payment" && input.paymentCount === 0) {
    attention.push(
      locale === "th" ? "สถานะรอชำระแต่ยังไม่มีการส่งหลักฐาน" : "Awaiting payment but no payment submissions yet"
    );
  }

  return { headline, bullets, attention };
}
