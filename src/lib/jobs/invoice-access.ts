import { createHmac, timingSafeEqual } from "node:crypto";

export function intakeInvoiceToken(invoiceId: string, secret: string): string {
  return createHmac("sha256", secret).update(`job-intake:${invoiceId}`).digest("base64url");
}

export function intakeInvoiceTokenMatches(invoiceId: string, token: string, secret: string): boolean {
  const expected = intakeInvoiceToken(invoiceId, secret);
  const left = Buffer.from(expected);
  const right = Buffer.from(token);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function signIntakeInvoice(invoiceId: string | null): string | null {
  if (!invoiceId) return null;
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) return null;
  return intakeInvoiceToken(invoiceId, secret);
}

export function intakeInvoicePdfPath(invoiceId: string | null): string | null {
  const token = signIntakeInvoice(invoiceId);
  if (!invoiceId || !token) return null;
  return `/api/admin/invoices/${invoiceId}/pdf?token=${encodeURIComponent(token)}`;
}
