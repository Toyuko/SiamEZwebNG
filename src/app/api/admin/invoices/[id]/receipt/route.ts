import { auth } from "@/auth";
import { site } from "@/config/site";
import { prisma } from "@/lib/db";
import { displayInvoiceNumber } from "@/lib/jobs/intake";
import { intakeInvoiceTokenMatches } from "@/lib/jobs/invoice-access";
import { jsPDF } from "jspdf";
import { NextResponse } from "next/server";

function formatMoney(satang: number, currency: string) {
  return new Intl.NumberFormat("en-TH", {
    style: "currency",
    currency: currency || "THB",
    minimumFractionDigits: 2,
  }).format(satang / 100);
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-US").format(d);
}

const METHOD_LABELS: Record<string, string> = {
  qr: "PromptPay",
  bank: "Bank transfer",
  wise: "Wise",
  stripe: "Card",
  cash: "Cash",
};

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const token = new URL(request.url).searchParams.get("token");
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  const linkAccess = Boolean(token && secret && intakeInvoiceTokenMatches(id, token, secret));
  if (!linkAccess) {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = (session.user as { role?: string }).role;
    if (role === "customer") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: {
      case: { include: { service: true, user: true } },
      user: true,
      payments: { orderBy: { createdAt: "asc" } },
    },
  });
  const receipt = inv?.payments.find((payment) => payment.status === "approved" && payment.receiptNumber) ?? null;
  if (!inv || !receipt?.receiptNumber || (linkAccess && !inv.case.intakeIdempotencyKey)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const clientName = inv.user?.name ?? inv.case.guestName ?? inv.user?.email ?? inv.case.guestEmail ?? "—";
  const clientEmail = inv.user?.email ?? inv.case.guestEmail ?? "—";
  const clientPhone = inv.user?.phone ?? inv.case.guestPhone ?? "—";
  const invoiceRef = displayInvoiceNumber(inv);
  const collected = inv.payments
    .filter((payment) => payment.status === "approved")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const outstanding = Math.max(0, inv.amount - collected);
  const service = inv.case.service?.name ?? inv.case.otherServiceName ?? "Service";

  const doc = new jsPDF();
  const margin = 16;
  const pageW = doc.internal.pageSize.getWidth();
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("SiamEZ", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y += 6;
  doc.text(site.address.line1, margin, y);
  y += 4.5;
  doc.text(site.address.line2, margin, y);
  y += 4.5;
  doc.text("Phone +66 64 343 8768", margin, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(22, 163, 74);
  doc.text("RECEIPT", pageW - margin, margin + 2, { align: "right" });
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`RECEIPT NO. ${receipt.receiptNumber}`, pageW - margin, margin + 10, { align: "right" });
  doc.text(`DATE ${formatDate(receipt.approvedAt ?? receipt.createdAt)}`, pageW - margin, margin + 15, {
    align: "right",
  });

  y += 12;
  doc.setDrawColor(220);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.text("RECEIVED FROM", margin, y);
  doc.setFont("helvetica", "normal");
  y += 6;
  doc.text(clientName, margin, y);
  y += 5;
  doc.text(clientEmail, margin, y);
  y += 5;
  doc.text(clientPhone, margin, y);
  y += 8;

  const rows: [string, string][] = [
    ["Amount received", formatMoney(receipt.amount, receipt.currency)],
    ["Payment method", METHOD_LABELS[receipt.method] ?? receipt.method],
    ["For", service],
    ["Invoice", invoiceRef],
    ["Case", inv.case.caseNumber],
    ["Invoice total", formatMoney(inv.amount, inv.currency)],
    ["Outstanding", formatMoney(outstanding, inv.currency)],
  ];
  if (inv.case.jobDescription) rows.splice(3, 0, ["Description", inv.case.jobDescription]);

  for (const [label, value] of rows) {
    doc.setFont("helvetica", "bold");
    doc.text(label, margin, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(value, pageW - margin * 2 - 48);
    doc.text(lines, margin + 48, y);
    y += Math.max(6, lines.length * 4.5);
  }

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`Received: ${formatMoney(receipt.amount, receipt.currency)}`, margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y += 8;
  doc.text("This receipt confirms the amount above was received. Thank you.", margin, y);
  y += 6;
  doc.text("Please keep this receipt for your records.", margin, y);

  const buf = doc.output("arraybuffer");
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="receipt-${receipt.receiptNumber}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
