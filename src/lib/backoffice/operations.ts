export type WorkStep = "job" | "invoice" | "assign" | "message";

export type InvoiceChangeMode = "update_draft" | "replacement_draft";

export type DiscountRequest =
  | { kind: "percent"; percent: number }
  | { kind: "amount"; satang: number };

const JOB_PATTERN = /create (?:a |the )?(?:new )?(?:customer )?(?:job|booking)|new [a-z]+ job|registration job/;
const INVOICE_PATTERN = /prepar(?:e|ing) (?:their |an |the )?invoice|create (?:an |a )?invoice|\binvoice for\b/;
const ASSIGN_PATTERN = /assign (?:it|this|the job|the booking|them) to/;
const MESSAGE_PATTERN = /draft a message|explain the next steps|prepare (?:a |their )?message/;

export function detectWorkSteps(text: string): WorkStep[] {
  const t = text.toLowerCase();
  const steps: WorkStep[] = [];
  if (JOB_PATTERN.test(t)) steps.push("job");
  if (INVOICE_PATTERN.test(t) && !/unpaid|outstanding|show me|remind/.test(t)) steps.push("invoice");
  if (ASSIGN_PATTERN.test(t)) steps.push("assign");
  if (MESSAGE_PATTERN.test(t)) steps.push("message");
  return steps;
}

export function serviceNeedle(text: string): RegExp | null {
  const t = text.toLowerCase();
  if (/marriage/.test(t)) return /marriage/;
  if (/police/.test(t)) return /police/;
  if (/translat/.test(t)) return /translat/;
  if (/licen[cs]e|driving|permit/.test(t)) return /licen|driv|permit/;
  if (/vehicle|motorcycle|motorbike|\bcar\b/.test(t)) return /vehicle|car|motor/;
  return null;
}

export function parseBahtSatang(text: string): number | null {
  const match = text.match(/(?:฿|thb)\s*([0-9][0-9,]*(?:\.\d{1,2})?)|([0-9][0-9,]*(?:\.\d{1,2})?)\s*(?:฿|thb|baht)/i);
  const raw = match?.[1] ?? match?.[2];
  if (!raw) return null;
  return satangFromDecimal(raw);
}

export function satangFromDecimal(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  const satang = Number(whole) * 100 + Number((frac + "00").slice(0, 2));
  if (!Number.isSafeInteger(satang) || satang <= 0 || satang > 100_000_000_00) return null;
  return satang;
}

export function parseDiscount(text: string): DiscountRequest | null {
  const percent = text.match(/(\d{1,2})\s*%\s*discount|discount of\s*(\d{1,2})\s*%/i);
  const value = Number(percent?.[1] ?? percent?.[2]);
  if (percent && value >= 1 && value <= 90) return { kind: "percent", percent: value };
  const amount = text.match(/discount of\s*(?:฿|thb)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)\s*(?:baht|฿|thb)?/i);
  if (!amount?.[1] || !/discount/i.test(text)) return null;
  const satang = satangFromDecimal(amount[1]);
  return satang ? { kind: "amount", satang } : null;
}

export function applyDiscount(totalSatang: number, discount: DiscountRequest | null): number | null {
  if (!discount) return totalSatang;
  const off = discount.kind === "percent" ? Math.round((totalSatang * discount.percent) / 100) : discount.satang;
  const next = totalSatang - off;
  if (!Number.isSafeInteger(next) || next <= 0 || off <= 0 || off >= totalSatang) return null;
  return next;
}

export function discountDecision(role: "admin" | "staff", discount: DiscountRequest | null): "none" | "apply" | "refuse" {
  if (!discount) return "none";
  return role === "admin" ? "apply" : "refuse";
}

export function invoiceChangeMode(status: string): InvoiceChangeMode {
  return status === "draft" ? "update_draft" : "replacement_draft";
}

const CASE_STATUSES = [
  "new",
  "under_review",
  "confirmed",
  "awaiting_payment",
  "pending_docs",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export type EditableCaseStatus = (typeof CASE_STATUSES)[number];

export function parseCaseStatus(text: string): EditableCaseStatus | null {
  const t = text.toLowerCase();
  if (/pending docs|waiting for documents/.test(t)) return "pending_docs";
  if (/awaiting payment/.test(t)) return "awaiting_payment";
  if (/in progress|start (the |this )?(job|work)/.test(t)) return "in_progress";
  if (/cancel/.test(t)) return "cancelled";
  if (/completed|complete the job|mark .* complete/.test(t)) return "completed";
  if (/confirmed/.test(t)) return "confirmed";
  if (/under review/.test(t)) return "under_review";
  if (/\bnew\b/.test(t)) return "new";
  return null;
}

void CASE_STATUSES;

export function parseCustomerEdits(text: string): { name?: string; email?: string; phone?: string } | null {
  const email = text.match(/email to\s+([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i)?.[1]?.toLowerCase();
  const phone = text.match(/phone to\s+(\+?\d[\d\s-]{7,}\d)/i)?.[1]?.replace(/[^\d+]/g, "");
  const name = text.match(/(?:name to|rename(?: the customer)? to)\s+([A-Za-z][A-Za-z .'-]{1,80})/i)?.[1]?.trim();
  const edits: { name?: string; email?: string; phone?: string } = {};
  if (email) edits.email = email;
  if (phone) edits.phone = phone;
  if (name) edits.name = name.replace(/\.$/, "");
  return Object.keys(edits).length ? edits : null;
}

export function describeSteps(steps: WorkStep[]): string[] {
  return steps.map((step, index) => {
    const label =
      step === "job"
        ? "Create the job and link the customer and service."
        : step === "invoice"
          ? "Prepare a draft invoice from the stated amount or the price catalogue."
          : step === "assign"
            ? "Assign the named staff member."
            : "Draft the customer message. It is not sent.";
    return `${index + 1}. ${label}`;
  });
}
